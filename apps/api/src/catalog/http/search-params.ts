import { BadRequestException } from '@nestjs/common';
import type { CatalogSearchCriteria } from '../domain/search-criteria.js';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  toSearchWords,
} from '../domain/search-criteria.js';

const MAX_TEXT_LENGTH = 200;
const MAX_OFFSET = 1_000_000;

function badRequest(message: string): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    error: 'invalid_query',
    message,
  });
}

function text(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw badRequest(`${name} must be a string`);
  if (value.length > MAX_TEXT_LENGTH) {
    throw badRequest(`${name} must be at most ${MAX_TEXT_LENGTH} characters`);
  }
  return value;
}

function integer(value: unknown, name: string, min: number): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw badRequest(`${name} must be an integer >= ${min}`);
  }
  const parsed = Number(value);
  if (parsed < min || parsed > MAX_OFFSET) {
    throw badRequest(`${name} must be between ${min} and ${MAX_OFFSET}`);
  }
  return parsed;
}

/** GET /catalog/books query → search criteria. Throws 400 when invalid. */
export function parseSearchParams(
  query: Record<string, unknown>,
): CatalogSearchCriteria {
  const limit = integer(query.limit, 'limit', 1) ?? DEFAULT_PAGE_SIZE;
  return {
    words: toSearchWords(text(query.q, 'q')),
    authorWords: toSearchWords(text(query.author, 'author')),
    publisherWords: toSearchWords(text(query.publisher, 'publisher')),
    offset: integer(query.offset, 'offset', 0) ?? 0,
    limit: Math.min(limit, MAX_PAGE_SIZE),
  };
}

export function parseIsbnParam(isbn: string): string {
  if (!/^\d{13}$/.test(isbn)) {
    throw new BadRequestException({
      statusCode: 400,
      error: 'invalid_isbn',
      message: 'isbn must be 13 digits',
    });
  }
  return isbn;
}
