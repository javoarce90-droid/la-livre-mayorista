export interface SelectionOptions {
  /**
   * Maximum number of products taken from publishers NOT in
   * `includePublishers`, in file order. Defaults to unlimited when no publisher
   * is included, and to 0 (only the included publishers) otherwise.
   */
  limit?: number;
  /** Publisher names (exact match, case-insensitive) imported in full. */
  includePublishers?: string[];
}

/**
 * Decides which products to import. Pure and stateful: `wants` asks whether a
 * product would be selected, `take` records that it was (valid products only,
 * so skipped products never consume the limit).
 */
export class ProductSelection {
  private readonly limit: number;
  private readonly included: ReadonlySet<string>;
  private sampled = 0;

  constructor(options: SelectionOptions) {
    const { limit, includePublishers = [] } = options;
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 0)) {
      throw new Error(`Invalid limit: ${limit} (expected an integer >= 0)`);
    }
    this.included = new Set(includePublishers.map(normalize));
    this.limit =
      limit ?? (this.included.size > 0 ? 0 : Number.POSITIVE_INFINITY);
  }

  /** True when no further product can be selected, so reading can stop. */
  get isComplete(): boolean {
    return this.included.size === 0 && this.sampled >= this.limit;
  }

  wants(publisherName: string | null): boolean {
    return this.isIncluded(publisherName) || this.sampled < this.limit;
  }

  take(publisherName: string | null): void {
    if (!this.isIncluded(publisherName)) this.sampled += 1;
  }

  private isIncluded(publisherName: string | null): boolean {
    return (
      publisherName !== null && this.included.has(normalize(publisherName))
    );
  }
}

function normalize(name: string): string {
  return name.trim().toUpperCase();
}
