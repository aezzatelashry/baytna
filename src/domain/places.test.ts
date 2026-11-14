import { describe, expect, test } from 'vitest';

import { directionsUrl, parsePlaces } from './places';

const place = { placeId: 'abc123', name: ' سوق تجريبي ', lat: 24.7, lng: 46.7, openNow: true, km: 3.2, minutes: 9 };

describe('parsePlaces', () => {
  test('reads well-formed places and trims the name', () => {
    const [first] = parsePlaces({ places: [place] });

    expect(first.name).toBe('سوق تجريبي');
    expect(first.openNow).toBe(true);
    expect(first.km).toBe(3.2);
  });

  test('puts the nearest place first and unknown distances last', () => {
    const places = parsePlaces({
      places: [{ ...place, placeId: 'far', km: 9 }, { ...place, placeId: 'unknown', km: null }, { ...place, placeId: 'near', km: 1 }],
    });

    expect(places.map((entry) => entry.placeId)).toEqual(['near', 'far', 'unknown']);
  });

  test('keeps a place whose hours and drive are unknown, as unknown', () => {
    const [first] = parsePlaces({ places: [{ ...place, openNow: 'yes', km: -4, minutes: 'soon' }] });

    expect(first.openNow).toBeNull();
    expect(first.km).toBeNull();
    expect(first.minutes).toBeNull();
  });

  test('drops entries without an id, a name or a real position, and never throws', () => {
    const payload = {
      places: [{ ...place, placeId: '' }, { ...place, name: ' ' }, { ...place, lat: 200 }, null, 'x'],
    };

    expect(parsePlaces(payload)).toEqual([]);
    expect(parsePlaces(null)).toEqual([]);
    expect(parsePlaces({ places: 'none' })).toEqual([]);
  });
});

describe('directionsUrl', () => {
  test('points Google Maps at the coordinates and the place id', () => {
    expect(directionsUrl(place)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=24.7%2C46.7&destination_place_id=abc123&travelmode=driving',
    );
  });
});
