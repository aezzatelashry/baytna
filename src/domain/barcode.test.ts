import { describe, expect, test } from 'vitest';

import { isBarcode, productNameFromLookup } from './barcode';

describe('barcodes', () => {
  test('accepts retail barcode lengths and nothing else', () => {
    expect(isBarcode('6281007031234')).toBe(true);
    expect(isBarcode(' 12345678 ')).toBe(true);
    expect(isBarcode('1234567')).toBe(false);
    expect(isBarcode('62810070312x4')).toBe(false);
  });
});

describe('reading a product lookup', () => {
  test('prefers the Arabic name and puts the brand with it', () => {
    const name = productNameFromLookup({
      status: 1,
      product: { product_name_ar: 'حليب كامل الدسم', product_name: 'Full Fat Milk', brands: 'المراعي, Almarai' },
    });

    expect(name).toBe('حليب كامل الدسم المراعي');
  });

  test('falls back to the general name and does not repeat a brand already in it', () => {
    expect(productNameFromLookup({ status: 1, product: { product_name: 'Almarai Milk 2L', brands: 'Almarai' } })).toBe('Almarai Milk 2L');
  });

  test('gives nothing for an unknown or unnamed product', () => {
    expect(productNameFromLookup({ status: 0 })).toBeNull();
    expect(productNameFromLookup({ status: 1, product: { product_name: '  ' } })).toBeNull();
    expect(productNameFromLookup('not json')).toBeNull();
  });
});
