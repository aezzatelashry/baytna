import { describe, expect, test } from 'vitest';

import { bestShop, quoteShops, type Shop, type ShopPrices } from './shops';
import type { CarCosts } from './trip';

// Test figures only.
const car: CarCosts = { fuelPricePerLitre: 2, litresPer100Km: 10, timeValuePerHour: 30 };

const near: Shop = { id: 'near', name: 'القريب', note: '', extraKm: 0, extraMinutes: 0 };
const far: Shop = { id: 'far', name: 'البعيد', note: '', extraKm: 20, extraMinutes: 30 };

function book(prices: Record<string, number>) {
  return Object.fromEntries(Object.entries(prices).map(([name, price]) => [name, { price, date: '2026-11-10' }]));
}

const list = ['أرز', 'زيت'];

describe('quoteShops', () => {
  test('keeps the near shop when the far one saves less than the drive costs', () => {
    const prices: ShopPrices = { near: book({ أرز: 26, زيت: 30 }), far: book({ أرز: 24, زيت: 29 }) };

    const quotes = quoteShops(list, [far, near], prices, car);

    expect(quotes[0].shop.id).toBe('near');
    expect(quotes[1].tripCost).toBe(19);
    expect(quotes[1].effective).toBe(72);
  });

  test('sends the family to the far shop when the saving beats the drive', () => {
    const prices: ShopPrices = { near: book({ أرز: 60, زيت: 50 }), far: book({ أرز: 30, زيت: 25 }) };

    expect(quoteShops(list, [near, far], prices, car)[0].shop.id).toBe('far');
  });

  test('prefers the shop that has prices for more of the list', () => {
    const prices: ShopPrices = { near: book({ أرز: 26 }), far: book({ أرز: 24, زيت: 29 }) };

    const quotes = quoteShops(list, [near, far], prices, car);

    expect(quotes[0].shop.id).toBe('far');
    expect(quotes[1].missing).toEqual(['زيت']);
  });

  test('compares on prices alone while the car costs are not entered', () => {
    const prices: ShopPrices = { near: book({ أرز: 26, زيت: 30 }), far: book({ أرز: 24, زيت: 29 }) };

    const quotes = quoteShops(list, [near, far], prices, null);

    expect(quotes[0].shop.id).toBe('far');
    expect(quotes[0].tripCost).toBeNull();
  });

  test('has no best shop when nothing on the list was ever bought anywhere', () => {
    expect(bestShop(quoteShops(list, [near, far], {}, car))).toBeNull();
    expect(bestShop([])).toBeNull();
  });
});
