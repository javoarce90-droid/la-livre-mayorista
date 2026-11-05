import { BadRequestException } from '@nestjs/common';
import { parseIsbnParam, parseSearchParams } from './search-params.js';

describe('parseSearchParams', () => {
  it('applies defaults', () => {
    expect(parseSearchParams({})).toEqual({
      words: [],
      authorWords: [],
      publisherWords: [],
      offset: 0,
      limit: 20,
    });
  });

  it('splits q, author and publisher into words', () => {
    expect(
      parseSearchParams({
        q: ' cien años ',
        author: 'garcía márquez',
        publisher: 'Debolsillo',
        offset: '40',
        limit: '50',
      }),
    ).toEqual({
      words: ['cien', 'años'],
      authorWords: ['garcía', 'márquez'],
      publisherWords: ['Debolsillo'],
      offset: 40,
      limit: 50,
    });
  });

  it('caps limit at 100', () => {
    expect(parseSearchParams({ limit: '500' }).limit).toBe(100);
  });

  it.each([
    { offset: '-1' },
    { offset: '1.5' },
    { offset: 'abc' },
    { limit: '0' },
    { limit: '' },
    { q: ['a', 'b'] },
    { author: 'x'.repeat(201) },
  ])('rejects %o with 400', (query) => {
    expect(() => parseSearchParams(query)).toThrow(BadRequestException);
  });
});

describe('parseIsbnParam', () => {
  it('accepts 13 digits', () => {
    expect(parseIsbnParam('9788466331234')).toBe('9788466331234');
  });

  it('rejects anything else with 400', () => {
    expect(() => parseIsbnParam('978-84')).toThrow(BadRequestException);
  });
});
