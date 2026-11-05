import {
  AZETA_PUBLISHER_DISCOUNTS,
  configuredPublisherNames,
  resolvePublisherDiscount,
} from './publisher-discounts.js';
import type { PublisherDiscountConfig } from './publisher-discounts.js';
import { normalizePublisherName } from './publisher-name.js';

describe('normalizePublisherName', () => {
  it('trims and upper-cases without stripping accents', () => {
    expect(normalizePublisherName('  Ediciones Paidós ')).toBe(
      'EDICIONES PAIDÓS',
    );
    expect(normalizePublisherName('Ediciones Paidos')).toBe('EDICIONES PAIDOS');
  });
});

describe('AZETA_PUBLISHER_DISCOUNTS', () => {
  it('belongs to the Azeta supplier', () => {
    expect(AZETA_PUBLISHER_DISCOUNTS.supplierCode).toBe('AZETA');
  });

  it('configures every brand with a two-decimal percent', () => {
    expect(
      AZETA_PUBLISHER_DISCOUNTS.brands.map((b) => [b.brand, b.percent]),
    ).toEqual([
      ['Debolsillo', '35.00'],
      ['Booket', '31.00'],
      ['Beascoa', '35.00'],
      ['Arkano Books', '31.00'],
      ['Debate', '35.00'],
      ['Destino Infantil y Juvenil', '31.00'],
      ['Paidós', '31.00'],
      ['Wonderbooks', '30.00'],
      ['B de Bolsillo', '35.00'],
      ['B de Blok', '35.00'],
    ]);
  });

  it('never lists the same normalized name twice', () => {
    const names = configuredPublisherNames().map(normalizePublisherName);

    expect(new Set(names).size).toBe(names.length);
  });
});

describe('resolvePublisherDiscount', () => {
  it.each([
    ['DEBOLSILLO', 'Debolsillo', '35.00'],
    ['nuevas ediciones debolsillo s.l', 'Debolsillo', '35.00'],
    ['  Booket ', 'Booket', '31.00'],
    ['BOOKET', 'Booket', '31.00'],
    ['Ediciones Paidós', 'Paidós', '31.00'],
    ['EDICIONES PAIDOS', 'Paidós', '31.00'],
    ['PAIDoS ARGENTINA', 'Paidós', '31.00'],
    ['Destino Infantil & Juvenil', 'Destino Infantil y Juvenil', '31.00'],
    ['B DE BOLSILLO (GRUPO ZETA)', 'B de Bolsillo', '35.00'],
    ['b de blok (sello)', 'B de Blok', '35.00'],
    ['WONDERBOOKS', 'Wonderbooks', '30.00'],
  ])('resolves %j to %s at %s%%', (name, brand, percent) => {
    expect(resolvePublisherDiscount(name)).toEqual({ brand, percent });
  });

  it.each([['ALFAGUARA'], ['DEBOLSILLO MÉXICO'], [''], [null]])(
    'returns null for the unconfigured publisher %j',
    (name) => {
      expect(resolvePublisherDiscount(name)).toBeNull();
    },
  );

  it('uses the given configuration', () => {
    const config: PublisherDiscountConfig = {
      supplierCode: 'X',
      brands: [{ brand: 'Acme', percent: '10.00', names: ['ACME PRESS'] }],
    };

    expect(resolvePublisherDiscount('acme press', config)).toEqual({
      brand: 'Acme',
      percent: '10.00',
    });
    expect(resolvePublisherDiscount('DEBOLSILLO', config)).toBeNull();
  });

  it('rejects a configuration listing a name under two brands', () => {
    const config: PublisherDiscountConfig = {
      supplierCode: 'X',
      brands: [
        { brand: 'A', percent: '10.00', names: ['SAME'] },
        { brand: 'B', percent: '20.00', names: [' same '] },
      ],
    };

    expect(() => resolvePublisherDiscount('SAME', config)).toThrow(/SAME/);
  });
});

describe('configuredPublisherNames', () => {
  it('returns every configured name variant', () => {
    const names = configuredPublisherNames();

    expect(names).toContain('DEBOLSILLO');
    expect(names).toContain('Ediciones Paidós');
    expect(names).toContain('Ediciones Paidos');
    expect(names).toContain('B de BLOK (SELLO)');
    expect(names).toHaveLength(
      AZETA_PUBLISHER_DISCOUNTS.brands.reduce((n, b) => n + b.names.length, 0),
    );
  });
});
