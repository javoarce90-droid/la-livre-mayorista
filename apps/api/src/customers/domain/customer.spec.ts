import { normalizeEmail, parseTaxId, prepareNewCustomer } from './customer.js';

describe('normalizeEmail', () => {
  it('trims and lowercases a well formed email', () => {
    expect(normalizeEmail('  Compras@Libreria.COM.ar ')).toBe(
      'compras@libreria.com.ar',
    );
  });

  it.each(['', 'compras', 'a@b', 'a b@c.com', '@libreria.com'])(
    'rejects %o',
    (value) => {
      expect(() => normalizeEmail(value)).toThrow(RangeError);
    },
  );
});

describe('parseTaxId (CUIT)', () => {
  it('accepts a valid CUIT with or without separators and returns 11 digits', () => {
    expect(parseTaxId('20-12345678-6')).toBe('20123456786');
    expect(parseTaxId(' 20123456786 ')).toBe('20123456786');
    expect(parseTaxId('20 12345678 6')).toBe('20123456786');
  });

  it('accepts a CUIT whose check digit computes to 0', () => {
    // 11 - (sum % 11) === 11 maps to check digit 0.
    expect(parseTaxId('20-00000006-0')).toBe('20000000060');
  });

  it.each(['20-12345678-9', '2012345678', '201234567860', '20-1234567A-6', ''])(
    'rejects %o',
    (value) => {
      expect(() => parseTaxId(value)).toThrow(RangeError);
    },
  );

  it('rejects a CUIT whose check digit would be 10', () => {
    // No digit is valid there: the AFIP algorithm has no check digit 10.
    const base = findBaseWithCheckTen();
    for (let digit = 0; digit <= 9; digit++) {
      expect(() => parseTaxId(`${base}${digit}`)).toThrow(RangeError);
    }
  });
});

describe('prepareNewCustomer', () => {
  it('normalizes every field and keeps optional ones as null', () => {
    expect(
      prepareNewCustomer({
        email: ' Compras@Libreria.com ',
        businessName: '  Librería del Puerto ',
      }),
    ).toEqual({
      email: 'compras@libreria.com',
      businessName: 'Librería del Puerto',
      taxId: null,
      phone: null,
    });
  });

  it('validates the tax id and trims the phone', () => {
    expect(
      prepareNewCustomer({
        email: 'a@b.com',
        businessName: 'X',
        taxId: '20-12345678-6',
        phone: ' +54 11 5555-5555 ',
      }),
    ).toMatchObject({ taxId: '20123456786', phone: '+54 11 5555-5555' });
  });

  it('treats blank optional values as absent', () => {
    expect(
      prepareNewCustomer({
        email: 'a@b.com',
        businessName: 'X',
        taxId: ' ',
        phone: '',
      }),
    ).toMatchObject({ taxId: null, phone: null });
  });

  it('rejects a blank business name or an overly long phone', () => {
    expect(() =>
      prepareNewCustomer({ email: 'a@b.com', businessName: '  ' }),
    ).toThrow(RangeError);
    expect(() =>
      prepareNewCustomer({
        email: 'a@b.com',
        businessName: 'X',
        phone: '1'.repeat(33),
      }),
    ).toThrow(RangeError);
  });
});

const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

function findBaseWithCheckTen(): string {
  for (let n = 2000000000; ; n++) {
    const base = String(n);
    const sum = WEIGHTS.reduce((acc, w, i) => acc + w * Number(base[i]), 0);
    if (11 - (sum % 11) === 10) return base;
  }
}
