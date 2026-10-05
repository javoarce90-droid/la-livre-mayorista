import type { Readable } from 'node:stream';
import { SaxesParser } from 'saxes';
import type {
  OnixContributor,
  OnixHeader,
  OnixMeasure,
  OnixPrice,
  OnixProduct,
  OnixRecord,
} from './onix-product.js';

/**
 * Streams an ONIX 3.0 (reference tags) message and yields the header followed
 * by one plain object per <Product>, in file order.
 *
 * Memory stays constant: only the product being read is kept in memory, and the
 * input is pulled chunk by chunk (back-pressure comes from the async iterator).
 * Namespace prefixes are ignored, so both the default-namespace and the
 * prefixed forms are accepted. Malformed XML rejects with an error.
 */
export async function* parseOnix(input: Readable): AsyncGenerator<OnixRecord> {
  const state = new OnixState();
  const parser = new SaxesParser();
  parser.on('opentag', (tag) => state.open(localName(tag.name)));
  parser.on('closetag', (tag) => state.close(localName(tag.name)));
  parser.on('text', (text) => state.appendText(text));
  parser.on('cdata', (text) => state.appendText(text));

  const decoder = new TextDecoder('utf-8');
  const write = (text: string): void => {
    try {
      parser.write(text);
    } catch (error) {
      throw new Error(`Invalid ONIX XML: ${(error as Error).message}`, {
        cause: error,
      });
    }
  };

  try {
    for await (const chunk of input as AsyncIterable<Buffer | string>) {
      write(
        typeof chunk === 'string'
          ? chunk
          : decoder.decode(chunk, { stream: true }),
      );
      if (state.queue.length > 0) yield* state.drain();
    }
    write(decoder.decode());
    try {
      parser.close();
    } catch (error) {
      throw new Error(`Invalid ONIX XML: ${(error as Error).message}`, {
        cause: error,
      });
    }
    yield* state.drain();
  } finally {
    input.destroy();
  }
}

function localName(name: string): string {
  const colon = name.indexOf(':');
  return colon === -1 ? name : name.slice(colon + 1);
}

function emptyProduct(): OnixProduct {
  return {
    recordReference: null,
    isbn13: null,
    productForm: null,
    title: null,
    contributors: [],
    languageCode: null,
    pageCount: null,
    measures: [],
    imprintName: null,
    publisherCode: null,
    publisherName: null,
    publishingStatus: null,
    publicationDate: null,
    description: null,
    coverUrl: null,
    availabilityCode: null,
    prices: [],
  };
}

/** Composite elements whose children must be combined before use. */
interface Composite {
  identifier: { type: string | null; value: string | null };
  titleType: string | null;
  contributor: OnixContributor & {
    personName: string | null;
    corporateName: string | null;
  };
  language: { role: string | null; code: string | null };
  extent: { type: string | null; value: string | null };
  measure: OnixMeasure;
  publishingDate: { role: string | null; date: string | null };
  textContent: { type: string | null; text: string | null };
  resource: { type: string | null; link: string | null };
  price: OnixPrice;
}

const ISBN13_ID_TYPES = new Set(['03', '15']);

class OnixState {
  readonly queue: OnixRecord[] = [];

  private readonly stack: string[] = [];
  private text = '';
  private header: OnixHeader | null = null;
  private product: OnixProduct | null = null;
  private c = OnixState.emptyComposite();

  private static emptyComposite(): Composite {
    return {
      identifier: { type: null, value: null },
      titleType: null,
      contributor: {
        sequenceNumber: null,
        role: null,
        name: null,
        personName: null,
        corporateName: null,
      },
      language: { role: null, code: null },
      extent: { type: null, value: null },
      measure: { type: null, value: null, unit: null },
      publishingDate: { role: null, date: null },
      textContent: { type: null, text: null },
      resource: { type: null, link: null },
      price: {
        type: null,
        amount: null,
        taxRatePercent: null,
        currencyCode: null,
      },
    };
  }

  *drain(): Generator<OnixRecord> {
    while (this.queue.length > 0) {
      yield this.queue.shift() as OnixRecord;
    }
  }

  appendText(text: string): void {
    if (this.product !== null || this.header !== null) this.text += text;
  }

  open(name: string): void {
    this.stack.push(name);
    this.text = '';
    switch (name) {
      case 'Header':
        this.header = { senderName: null, sentDateTime: null };
        break;
      case 'Product':
        this.product = emptyProduct();
        this.c = OnixState.emptyComposite();
        break;
      case 'ProductIdentifier':
        this.c.identifier = { type: null, value: null };
        break;
      case 'TitleDetail':
        this.c.titleType = null;
        break;
      case 'Contributor':
        this.c.contributor = {
          sequenceNumber: null,
          role: null,
          name: null,
          personName: null,
          corporateName: null,
        };
        break;
      case 'Language':
        this.c.language = { role: null, code: null };
        break;
      case 'Extent':
        this.c.extent = { type: null, value: null };
        break;
      case 'Measure':
        this.c.measure = { type: null, value: null, unit: null };
        break;
      case 'PublishingDate':
        this.c.publishingDate = { role: null, date: null };
        break;
      case 'TextContent':
        this.c.textContent = { type: null, text: null };
        break;
      case 'SupportingResource':
        this.c.resource = { type: null, link: null };
        break;
      case 'Price':
        this.c.price = {
          type: null,
          amount: null,
          taxRatePercent: null,
          currencyCode: null,
        };
        break;
    }
  }

  close(name: string): void {
    const parent = this.stack[this.stack.length - 2];
    const value = this.text.trim() || null;
    this.text = '';
    this.stack.pop();

    if (this.product !== null) {
      this.closeInProduct(this.product, name, parent, value);
    } else if (this.header !== null) {
      this.closeInHeader(this.header, name, parent, value);
    }
  }

  private closeInHeader(
    header: OnixHeader,
    name: string,
    parent: string | undefined,
    value: string | null,
  ): void {
    if (name === 'SenderName' && parent === 'Sender') {
      header.senderName ??= value;
    } else if (name === 'SentDateTime' && parent === 'Header') {
      header.sentDateTime = value;
    } else if (name === 'Header') {
      this.queue.push({ kind: 'header', header });
      this.header = null;
    }
  }

  private closeInProduct(
    p: OnixProduct,
    name: string,
    parent: string | undefined,
    value: string | null,
  ): void {
    const c = this.c;
    switch (name) {
      case 'Product':
        this.queue.push({ kind: 'product', product: p });
        this.product = null;
        return;
      case 'RecordReference':
        if (parent === 'Product') p.recordReference = value;
        return;
      case 'ProductIDType':
        if (parent === 'ProductIdentifier') c.identifier.type = value;
        return;
      case 'IDValue':
        if (parent === 'ProductIdentifier') c.identifier.value = value;
        else if (parent === 'PublisherIdentifier') p.publisherCode ??= value;
        return;
      case 'ProductIdentifier':
        if (
          p.isbn13 === null &&
          c.identifier.type !== null &&
          ISBN13_ID_TYPES.has(c.identifier.type)
        ) {
          p.isbn13 = c.identifier.value;
        }
        return;
      case 'ProductForm':
        if (parent === 'DescriptiveDetail') p.productForm = value;
        return;
      case 'TitleType':
        if (parent === 'TitleDetail') c.titleType = value;
        return;
      case 'TitleText':
        if (
          p.title === null &&
          (c.titleType === '01' || c.titleType === null)
        ) {
          p.title = value;
        }
        return;
      case 'SequenceNumber':
        if (parent === 'Contributor') c.contributor.sequenceNumber = value;
        return;
      case 'ContributorRole':
        if (parent === 'Contributor') c.contributor.role ??= value;
        return;
      case 'PersonNameInverted':
        if (parent === 'Contributor') c.contributor.name = value;
        return;
      case 'PersonName':
        if (parent === 'Contributor') c.contributor.personName = value;
        return;
      case 'CorporateName':
        if (parent === 'Contributor') c.contributor.corporateName = value;
        return;
      case 'Contributor':
        p.contributors.push({
          sequenceNumber: c.contributor.sequenceNumber,
          role: c.contributor.role,
          name:
            c.contributor.name ??
            c.contributor.personName ??
            c.contributor.corporateName,
        });
        return;
      case 'LanguageRole':
        c.language.role = value;
        return;
      case 'LanguageCode':
        if (parent === 'Language') c.language.code = value;
        return;
      case 'Language':
        if (p.languageCode === null && c.language.role === '01') {
          p.languageCode = c.language.code;
        }
        return;
      case 'ExtentType':
        c.extent.type = value;
        return;
      case 'ExtentValue':
        c.extent.value = value;
        return;
      case 'Extent':
        if (p.pageCount === null && c.extent.type === '00') {
          p.pageCount = c.extent.value;
        }
        return;
      case 'MeasureType':
        c.measure.type = value;
        return;
      case 'Measurement':
        c.measure.value = value;
        return;
      case 'MeasureUnitCode':
        c.measure.unit = value;
        return;
      case 'Measure':
        p.measures.push(c.measure);
        return;
      case 'ImprintName':
        p.imprintName ??= value;
        return;
      case 'PublisherName':
        if (parent === 'Publisher') p.publisherName ??= value;
        return;
      case 'PublishingStatus':
        if (parent === 'PublishingDetail') p.publishingStatus = value;
        return;
      case 'PublishingDateRole':
        c.publishingDate.role = value;
        return;
      case 'Date':
        if (parent === 'PublishingDate') c.publishingDate.date = value;
        return;
      case 'PublishingDate':
        if (p.publicationDate === null && c.publishingDate.role === '01') {
          p.publicationDate = c.publishingDate.date;
        }
        return;
      case 'TextType':
        c.textContent.type = value;
        return;
      case 'Text':
        if (parent === 'TextContent') c.textContent.text = value;
        return;
      case 'TextContent':
        if (p.description === null && c.textContent.type === '03') {
          p.description = c.textContent.text;
        }
        return;
      case 'ResourceContentType':
        c.resource.type = value;
        return;
      case 'ResourceLink':
        c.resource.link ??= value;
        return;
      case 'SupportingResource':
        if (p.coverUrl === null && c.resource.type === '01') {
          p.coverUrl = c.resource.link;
        }
        return;
      case 'ProductAvailability':
        p.availabilityCode ??= value;
        return;
      case 'PriceType':
        if (parent === 'Price') c.price.type = value;
        return;
      case 'PriceAmount':
        if (parent === 'Price') c.price.amount = value;
        return;
      case 'TaxRatePercent':
        if (parent === 'Tax') c.price.taxRatePercent ??= value;
        return;
      case 'CurrencyCode':
        if (parent === 'Price') c.price.currencyCode = value;
        return;
      case 'Price':
        p.prices.push(c.price);
        return;
    }
  }
}
