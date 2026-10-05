/**
 * Raw ONIX 3.0 values as read from the feed. Everything is kept as text (or
 * null when absent); validation and type conversion happen in the mapper.
 */
export interface OnixHeader {
  senderName: string | null;
  /** ONIX SentDateTime, e.g. "20260901" or "20260901T1030". */
  sentDateTime: string | null;
}

export interface OnixContributor {
  sequenceNumber: string | null;
  /** ONIX List 17, e.g. "A01". */
  role: string | null;
  name: string | null;
}

export interface OnixMeasure {
  /** ONIX List 48: "01" height, "02" width, "08" weight... */
  type: string | null;
  value: string | null;
  unit: string | null;
}

export interface OnixPrice {
  /** ONIX List 58: "01", "02", "03"... */
  type: string | null;
  amount: string | null;
  taxRatePercent: string | null;
  currencyCode: string | null;
}

export interface OnixProduct {
  recordReference: string | null;
  /** IDValue of the ISBN-13 ProductIdentifier (ProductIDType 03 or 15). */
  isbn13: string | null;
  productForm: string | null;
  title: string | null;
  contributors: OnixContributor[];
  /** Language with LanguageRole 01 (language of text). */
  languageCode: string | null;
  /** ExtentValue of ExtentType 00 (main content page count). */
  pageCount: string | null;
  measures: OnixMeasure[];
  imprintName: string | null;
  publisherCode: string | null;
  publisherName: string | null;
  publishingStatus: string | null;
  /** PublishingDate with role 01. */
  publicationDate: string | null;
  /** TextContent with TextType 03 (description), HTML kept as-is. */
  description: string | null;
  /** First front cover (ResourceContentType 01) ResourceLink. */
  coverUrl: string | null;
  availabilityCode: string | null;
  prices: OnixPrice[];
}

export type OnixRecord =
  | { kind: 'header'; header: OnixHeader }
  | { kind: 'product'; product: OnixProduct };
