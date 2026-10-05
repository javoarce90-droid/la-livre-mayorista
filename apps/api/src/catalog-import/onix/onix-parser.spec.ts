import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { parseOnix } from './onix-parser.js';
import type { OnixProduct, OnixRecord } from './onix-product.js';

const FIXTURE = readFileSync(
  new URL('./__fixtures__/sample.onix.xml', import.meta.url),
);

/** Splits a buffer into tiny chunks to exercise chunk boundaries (incl. multibyte UTF-8). */
function chunked(buffer: Buffer, size: number): Readable {
  const chunks: Buffer[] = [];
  for (let i = 0; i < buffer.length; i += size) {
    chunks.push(buffer.subarray(i, i + size));
  }
  return Readable.from(chunks);
}

async function collect(input: Readable): Promise<OnixRecord[]> {
  const records: OnixRecord[] = [];
  for await (const record of parseOnix(input)) {
    records.push(record);
  }
  return records;
}

function products(records: OnixRecord[]): OnixProduct[] {
  return records.flatMap((r) => (r.kind === 'product' ? [r.product] : []));
}

describe('parseOnix', () => {
  it('emits the header first, then every product in file order', async () => {
    const records = await collect(Readable.from([FIXTURE]));

    expect(records[0]).toEqual({
      kind: 'header',
      header: {
        senderName: 'AZETA DISTRIBUCIONES',
        sentDateTime: '20260901',
      },
    });
    expect(products(records).map((p) => p.recordReference)).toEqual([
      '9788466359207',
      '9786072650688',
      'NO-ISBN-1',
      '9788497592208',
    ]);
  });

  it('reads every supported field of a complete product (CDATA, HTML, multiple prices and contributors)', async () => {
    const [full] = products(await collect(Readable.from([FIXTURE])));

    expect(full).toEqual<OnixProduct>({
      recordReference: '9788466359207',
      isbn13: '9788466359207',
      productForm: 'BC',
      title: 'CIEN AÑOS DE SOLEDAD & OTROS',
      contributors: [
        { sequenceNumber: '1', role: 'A01', name: 'GARCÍA MÁRQUEZ, GABRIEL' },
        { sequenceNumber: '2', role: 'B06', name: 'PÉREZ, ANA' },
        { sequenceNumber: '3', role: 'A12', name: 'LÓPEZ, LUIS' },
      ],
      languageCode: 'spa',
      pageCount: '496',
      measures: [
        { type: '01', value: '190', unit: 'mm' },
        { type: '02', value: '125', unit: 'mm' },
        { type: '08', value: '230', unit: 'gr' },
      ],
      imprintName: 'DEBOLSILLO',
      publisherCode: 'J70',
      publisherName: 'DEBOLSILLO',
      publishingStatus: '04',
      publicationDate: '20220317',
      description:
        '<p>Una saga <b>familiar</b>.</p><br>Macondo &amp; los Buendía.',
      coverUrl: 'https://static.example.com/covers/9788466359207.JPG?v=1',
      availabilityCode: '20',
      prices: [
        {
          type: '01',
          amount: '11.49',
          taxRatePercent: '4',
          currencyCode: 'EUR',
        },
        {
          type: '01',
          amount: '9.80',
          taxRatePercent: '0.00',
          currencyCode: 'GBP',
        },
        {
          type: '02',
          amount: '11.95',
          taxRatePercent: '4',
          currencyCode: 'EUR',
        },
        {
          type: '03',
          amount: '11.49',
          taxRatePercent: null,
          currencyCode: 'EUR',
        },
      ],
    });
  });

  it('returns nulls and empty lists for missing optional elements', async () => {
    const [, minimal, noIsbn, noTitle] = products(
      await collect(Readable.from([FIXTURE])),
    );

    expect(minimal).toMatchObject({
      isbn13: '9786072650688',
      title: 'RECUERDOS Y OLVIDOS',
      contributors: [],
      measures: [],
      languageCode: null,
      pageCount: null,
      imprintName: null,
      publisherCode: 'Z98',
      publisherName: 'MANUAL MODERNO',
      publishingStatus: null,
      publicationDate: null,
      description: null,
      coverUrl: null,
      availabilityCode: '40',
    });
    expect(noIsbn.isbn13).toBeNull();
    expect(noTitle.title).toBeNull();
  });

  it('produces the same result when the input arrives in tiny chunks', async () => {
    const whole = await collect(Readable.from([FIXTURE]));
    const split = await collect(chunked(FIXTURE, 7));

    expect(split).toEqual(whole);
  });

  it('handles prefixed ONIX elements and ignores non-ISBN identifiers and non-front-cover resources', async () => {
    const xml = `<?xml version="1.0"?>
<onix:ONIXMessage xmlns:onix="http://ns.editeur.org/onix/3.0/reference">
  <onix:Header><onix:SentDateTime>20260102T1030</onix:SentDateTime></onix:Header>
  <onix:Product>
    <onix:RecordReference>REF-1</onix:RecordReference>
    <onix:ProductIdentifier><onix:ProductIDType>01</onix:ProductIDType><onix:IDValue>ABC</onix:IDValue></onix:ProductIdentifier>
    <onix:ProductIdentifier><onix:ProductIDType>15</onix:ProductIDType><onix:IDValue>9788497592208</onix:IDValue></onix:ProductIdentifier>
    <onix:DescriptiveDetail>
      <onix:TitleDetail><onix:TitleType>01</onix:TitleType><onix:TitleElement><onix:TitleText>Plain &amp; simple</onix:TitleText></onix:TitleElement></onix:TitleDetail>
      <onix:Language><onix:LanguageRole>02</onix:LanguageRole><onix:LanguageCode>eng</onix:LanguageCode></onix:Language>
      <onix:Language><onix:LanguageRole>01</onix:LanguageRole><onix:LanguageCode>cat</onix:LanguageCode></onix:Language>
      <onix:Extent><onix:ExtentType>02</onix:ExtentType><onix:ExtentValue>999</onix:ExtentValue></onix:Extent>
    </onix:DescriptiveDetail>
    <onix:CollateralDetail>
      <onix:TextContent><onix:TextType>02</onix:TextType><onix:Text>Short</onix:Text></onix:TextContent>
      <onix:SupportingResource><onix:ResourceContentType>07</onix:ResourceContentType><onix:ResourceVersion><onix:ResourceLink>https://x/author.jpg</onix:ResourceLink></onix:ResourceVersion></onix:SupportingResource>
    </onix:CollateralDetail>
    <onix:PublishingDetail>
      <onix:PublishingDate><onix:PublishingDateRole>02</onix:PublishingDateRole><onix:Date>20200101</onix:Date></onix:PublishingDate>
    </onix:PublishingDetail>
  </onix:Product>
</onix:ONIXMessage>`;

    const records = await collect(Readable.from([xml]));
    const [product] = products(records);

    expect(records[0]).toEqual({
      kind: 'header',
      header: { senderName: null, sentDateTime: '20260102T1030' },
    });
    expect(product).toMatchObject({
      recordReference: 'REF-1',
      isbn13: '9788497592208',
      title: 'Plain & simple',
      languageCode: 'cat',
      pageCount: null,
      description: null,
      coverUrl: null,
      publicationDate: null,
    });
  });

  it('stops reading the input when the consumer stops early', async () => {
    const input = Readable.from([FIXTURE]);

    for await (const record of parseOnix(input)) {
      if (record.kind === 'product') break;
    }

    expect(input.destroyed).toBe(true);
  });

  it('rejects with a descriptive error on malformed XML', async () => {
    const xml = '<ONIXMessage><Product><RecordReference>1</Product>';

    await expect(collect(Readable.from([xml]))).rejects.toThrow(/ONIX/);
  });
});
