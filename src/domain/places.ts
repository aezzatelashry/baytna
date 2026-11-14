/** A shop found near a point, with the one-way drive to it. Kept in memory only, never stored. */
export interface NearbyPlace {
  readonly placeId: string;
  readonly name: string;
  readonly lat: number;
  readonly lng: number;
  /** Null when the place did not publish its hours. */
  readonly openNow: boolean | null;
  readonly km: number | null;
  readonly minutes: number | null;
}

/** How far around home or work the search looks unless the family changes it. */
export const DEFAULT_RADIUS_KM = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function positive(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function toPlace(value: unknown): NearbyPlace | null {
  if (!isRecord(value)) return null;
  const { placeId, name, lat, lng, openNow, km, minutes } = value;
  if (typeof placeId !== 'string' || placeId === '' || typeof name !== 'string' || name.trim() === '') return null;
  if (typeof lat !== 'number' || typeof lng !== 'number' || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return {
    placeId,
    name: name.trim(),
    lat,
    lng,
    openNow: typeof openNow === 'boolean' ? openNow : null,
    km: positive(km),
    minutes: positive(minutes),
  };
}

/** Reads the places function's response, nearest first. Malformed entries are dropped. */
export function parsePlaces(payload: unknown): NearbyPlace[] {
  if (!isRecord(payload) || !Array.isArray(payload.places)) return [];
  return payload.places
    .flatMap((entry) => {
      const place = toPlace(entry);
      return place ? [place] : [];
    })
    .sort((a, b) => (a.km ?? Number.POSITIVE_INFINITY) - (b.km ?? Number.POSITIVE_INFINITY));
}

/** Opens driving directions to the place in Google Maps. Built from coordinates and the place id only. */
export function directionsUrl(place: Pick<NearbyPlace, 'lat' | 'lng' | 'placeId'>): string {
  const destination = encodeURIComponent(`${place.lat},${place.lng}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${encodeURIComponent(place.placeId)}&travelmode=driving`;
}
