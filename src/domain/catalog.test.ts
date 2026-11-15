import { describe, expect, test } from 'vitest';

import { CATALOG } from '../data/catalog';

import { arabicKey, findInCatalog, sameProduct } from './catalog';

describe('arabicKey', () => {
  test('folds the spellings people mix', () => {
    expect(arabicKey('الأرز')).toBe('ارز');
    expect(arabicKey('  طحينة  ')).toBe(arabicKey('طحينه'));
    expect(arabicKey('مَكَرونة')).toBe(arabicKey('مكرونه'));
  });

  test('keeps a short word that only looks like it starts with the article', () => {
    expect(arabicKey('الف')).toBe('الف');
  });
});

describe('findInCatalog', () => {
  test('finds the product inside a flyer line with a brand and a size', () => {
    expect(findInCatalog('أرز بسمتي أبو كاس 5 كجم', CATALOG)?.id).toBe('rice');
    expect(findInCatalog('رز', CATALOG)?.id).toBe('rice');
  });

  test('prefers the longer name, so a different product is not swallowed', () => {
    expect(findInCatalog('زيت زيتون بكر 1 لتر', CATALOG)?.id).toBe('olive-oil');
    expect(findInCatalog('زيت دوار الشمس', CATALOG)?.id).toBe('oil');
    expect(findInCatalog('رز بلبن', CATALOG)?.id).toBe('rice-pudding');
    expect(findInCatalog('لحم مفروم طازج', CATALOG)?.id).toBe('minced-meat');
  });

  test('matches whole words only', () => {
    expect(findInCatalog('لبنة', CATALOG)?.id).toBe('labneh');
    expect(findInCatalog('لبن', CATALOG)?.id).toBe('laban');
    expect(findInCatalog('زيتون أخضر', CATALOG)?.id).toBe('olives');
  });

  test('says nothing for a product it does not know', () => {
    expect(findInCatalog('شامبو', CATALOG)).toBeNull();
    expect(findInCatalog('', CATALOG)).toBeNull();
  });

  test('gives every entry a unique id', () => {
    const ids = CATALOG.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('sameProduct', () => {
  test('links a list item to a flyer line for the same product', () => {
    expect(sameProduct('رز', 'أرز بسمتي 5 كجم', CATALOG)).toBe(true);
    expect(sameProduct('طماطم', 'بندورة طازجة', CATALOG)).toBe(true);
  });

  test('keeps different products apart even when one name sits inside the other', () => {
    expect(sameProduct('رز', 'رز بلبن', CATALOG)).toBe(false);
    expect(sameProduct('زيت', 'زيت زيتون', CATALOG)).toBe(false);
    expect(sameProduct('لبن', 'لبنة', CATALOG)).toBe(false);
  });

  test('falls back to whole words for products outside the dictionary', () => {
    expect(sameProduct('شامبو', 'شامبو للأطفال 400 مل', CATALOG)).toBe(true);
    expect(sameProduct('شامبو', 'شامبوهات', CATALOG)).toBe(false);
  });

  test('does not link a known product to an unknown one', () => {
    expect(sameProduct('رز', 'شامبو', CATALOG)).toBe(false);
    expect(sameProduct('شامبو', 'رز', CATALOG)).toBe(false);
  });
});
