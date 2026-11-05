import { MAX_SEARCH_WORDS, toSearchWords } from './search-criteria.js';

describe('toSearchWords', () => {
  it('splits on whitespace and drops empty words', () => {
    expect(toSearchWords('  julio   cortázar ')).toEqual(['julio', 'cortázar']);
    expect(toSearchWords('')).toEqual([]);
    expect(toSearchWords(undefined)).toEqual([]);
  });

  it('removes dashes from ISBN fragments so they match the stored digits', () => {
    expect(toSearchWords('978-950-07')).toEqual(['97895007']);
    expect(toSearchWords('anti-héroe')).toEqual(['anti-héroe']);
  });

  it('caps the number of words', () => {
    const many = Array.from({ length: 30 }, (_, i) => `w${i}`).join(' ');
    expect(toSearchWords(many)).toHaveLength(MAX_SEARCH_WORDS);
  });
});
