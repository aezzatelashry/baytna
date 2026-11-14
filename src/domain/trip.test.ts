import { describe, expect, test } from 'vitest';

import { judgeTrip, MIN_NET_SAR, straightLineKm, type CarCosts } from './trip';

// Test figures only: a car burning 10 L/100 km, fuel at 2 SAR a litre, an hour valued at 30 SAR.
const car: CarCosts = { fuelPricePerLitre: 2, litresPer100Km: 10, timeValuePerHour: 30 };

describe('judgeTrip', () => {
  test('says no when a small saving is eaten by fuel and time', () => {
    const verdict = judgeTrip({ saving: 2, extraKm: 20, extraMinutes: 30 }, car);

    expect(verdict.fuelCost).toBe(4);
    expect(verdict.timeCost).toBe(15);
    expect(verdict.net).toBe(-17);
    expect(verdict.isWorthIt).toBe(false);
  });

  test('says yes when the saving clearly beats the drive', () => {
    const verdict = judgeTrip({ saving: 60, extraKm: 20, extraMinutes: 30 }, car);

    expect(verdict.net).toBe(41);
    expect(verdict.isWorthIt).toBe(true);
  });

  test('needs the trip to come out ahead by the margin, not just break even', () => {
    const fuelAndTime = 19;

    expect(judgeTrip({ saving: fuelAndTime + MIN_NET_SAR - 1, extraKm: 20, extraMinutes: 30 }, car).isWorthIt).toBe(false);
    expect(judgeTrip({ saving: fuelAndTime + MIN_NET_SAR, extraKm: 20, extraMinutes: 30 }, car).isWorthIt).toBe(true);
  });

  test('tells how much the far shop would have to save', () => {
    expect(judgeTrip({ saving: 0, extraKm: 20, extraMinutes: 30 }, car).breakEvenSaving).toBe(24);
  });

  test('ignores time for a family that values it at zero', () => {
    const verdict = judgeTrip({ saving: 10, extraKm: 20, extraMinutes: 90 }, { ...car, timeValuePerHour: 0 });

    expect(verdict.timeCost).toBe(0);
    expect(verdict.net).toBe(6);
  });

  test('treats a shop that is on the way as costing nothing extra', () => {
    const verdict = judgeTrip({ saving: 8, extraKm: 0, extraMinutes: 0 }, car);

    expect(verdict.net).toBe(8);
    expect(verdict.isWorthIt).toBe(true);
  });

  test('never turns a negative distance into a gain', () => {
    expect(judgeTrip({ saving: 0, extraKm: -50, extraMinutes: -60 }, car).net).toBe(0);
  });
});

describe('straightLineKm', () => {
  test('is zero for the same point', () => {
    expect(straightLineKm({ lat: 24.7136, lng: 46.6753 }, { lat: 24.7136, lng: 46.6753 })).toBe(0);
  });

  test('measures one degree of latitude as about 111 km', () => {
    const km = straightLineKm({ lat: 24, lng: 46 }, { lat: 25, lng: 46 });

    expect(km).toBeGreaterThan(110);
    expect(km).toBeLessThan(112);
  });
});
