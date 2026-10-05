import { ProductSelection } from './product-selection.js';

function run(
  selection: ProductSelection,
  publishers: (string | null)[],
): (string | null)[] {
  const taken: (string | null)[] = [];
  for (const name of publishers) {
    if (selection.isComplete) break;
    if (selection.wants(name)) {
      selection.take(name);
      taken.push(name);
    }
  }
  return taken;
}

describe('ProductSelection', () => {
  it('takes every product when no option is given', () => {
    const selection = new ProductSelection({});

    expect(run(selection, ['A', 'B', null])).toEqual(['A', 'B', null]);
    expect(selection.isComplete).toBe(false);
  });

  it('takes the first N products in file order and then reports completion', () => {
    const selection = new ProductSelection({ limit: 2 });

    expect(run(selection, ['A', 'B', 'C'])).toEqual(['A', 'B']);
    expect(selection.isComplete).toBe(true);
  });

  it('takes all products of included publishers on top of the limit, matching names exactly and case-insensitively', () => {
    const selection = new ProductSelection({
      limit: 1,
      includePublishers: ['debolsillo'],
    });

    const taken = run(selection, [
      'DEBOLSILLO',
      'A',
      'B',
      'NUEVAS EDICIONES DEBOLSILLO S.L',
      ' Debolsillo ',
      'C',
    ]);

    expect(taken).toEqual(['DEBOLSILLO', 'A', ' Debolsillo ']);
    expect(selection.isComplete).toBe(false);
  });

  it('only takes included publishers when no limit is given', () => {
    const selection = new ProductSelection({ includePublishers: ['X'] });

    expect(run(selection, ['A', 'X', null, 'X'])).toEqual(['X', 'X']);
  });

  it('does not count a wanted product until it is taken (invalid products do not consume the limit)', () => {
    const selection = new ProductSelection({ limit: 1 });

    expect(selection.wants('A')).toBe(true);
    expect(selection.wants('B')).toBe(true);
    selection.take('B');
    expect(selection.wants('C')).toBe(false);
  });

  it('is complete immediately with limit 0 and no included publishers', () => {
    expect(new ProductSelection({ limit: 0 }).isComplete).toBe(true);
  });

  it('rejects a negative or non-integer limit', () => {
    expect(() => new ProductSelection({ limit: -1 })).toThrow(/limit/);
    expect(() => new ProductSelection({ limit: 1.5 })).toThrow(/limit/);
  });
});
