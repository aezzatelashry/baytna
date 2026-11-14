/**
 * places: finds grocery shops around a point and says how far each one is by car.
 * Uses Google's Places API (New) Text Search and the Routes API route matrix.
 * The Google key lives only here, as the secret GOOGLE_MAPS_API_KEY.
 *
 * NOT DEPLOYED AND NOT TESTED against the live APIs. Before first use, check against
 * the current Google docs: the field names under `currentOpeningHours`, and the shape
 * of the route matrix response. See docs/BOARD_PROMPT_PLACES_PANTRY.md, section 3.
 *
 * Deploy: supabase functions deploy places
 * Secret: supabase secrets set GOOGLE_MAPS_API_KEY=...
 */
import { json, requiredEnv, serve, signedInClient, withinDailyLimit } from '../_shared/http.ts';

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';
const MATRIX_URL = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';
/** Only what is shown. Opening hours put the request in the Enterprise tier. */
const PLACES_FIELDS = 'places.id,places.displayName,places.location,places.currentOpeningHours';
const MATRIX_FIELDS = 'destinationIndex,distanceMeters,duration,condition';
const MAX_RESULTS = 10;
const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 25;
const MIN_QUERY = 2;
const MAX_QUERY = 60;

interface Point {
  readonly lat: number;
  readonly lng: number;
}

interface Input {
  readonly origin: Point;
  readonly radiusKm: number;
  readonly query: string;
}

function isPoint(value: unknown): value is Point {
  if (typeof value !== 'object' || value === null) return false;
  const { lat, lng } = value as Record<string, unknown>;
  return typeof lat === 'number' && typeof lng === 'number' && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function readInput(body: unknown): Input | null {
  if (typeof body !== 'object' || body === null) return null;
  const { origin, radiusKm, query } = body as Record<string, unknown>;
  if (!isPoint(origin)) return null;
  if (typeof radiusKm !== 'number' || radiusKm < MIN_RADIUS_KM || radiusKm > MAX_RADIUS_KM) return null;
  if (typeof query !== 'string' || query.trim().length < MIN_QUERY || query.length > MAX_QUERY) return null;
  return { origin, radiusKm, query: query.trim() };
}

async function google(url: string, fieldMask: string, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': requiredEnv('GOOGLE_MAPS_API_KEY'),
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`google ${response.status}`);
  return response.json();
}

interface FoundPlace {
  readonly placeId: string;
  readonly name: string;
  readonly lat: number;
  readonly lng: number;
  readonly openNow: boolean | null;
}

async function searchPlaces(input: Input): Promise<FoundPlace[]> {
  const data = (await google(PLACES_URL, PLACES_FIELDS, {
    textQuery: input.query,
    languageCode: 'ar',
    maxResultCount: MAX_RESULTS,
    locationBias: {
      circle: { center: { latitude: input.origin.lat, longitude: input.origin.lng }, radius: input.radiusKm * 1000 },
    },
  })) as { places?: Record<string, any>[] };

  return (data.places ?? []).flatMap((place): FoundPlace[] => {
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;
    if (typeof place.id !== 'string' || typeof lat !== 'number' || typeof lng !== 'number') return [];
    const openNow = place.currentOpeningHours?.openNow;
    return [
      {
        placeId: place.id,
        name: typeof place.displayName?.text === 'string' ? place.displayName.text : '',
        lat,
        lng,
        openNow: typeof openNow === 'boolean' ? openNow : null,
      },
    ];
  });
}

interface Drive {
  readonly km: number | null;
  readonly minutes: number | null;
}

/** One-way driving distance and time, with live traffic, from the origin to every place. */
async function driveTimes(origin: Point, places: readonly FoundPlace[]): Promise<Drive[]> {
  const waypoint = (point: Point) => ({ waypoint: { location: { latLng: { latitude: point.lat, longitude: point.lng } } } });
  const rows = (await google(MATRIX_URL, MATRIX_FIELDS, {
    origins: [waypoint(origin)],
    destinations: places.map(waypoint),
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
  })) as Record<string, any>[];

  const drives: Drive[] = places.map(() => ({ km: null, minutes: null }));
  for (const row of Array.isArray(rows) ? rows : []) {
    const index = row.destinationIndex;
    const seconds = typeof row.duration === 'string' ? Number.parseInt(row.duration, 10) : Number.NaN;
    if (typeof index !== 'number' || index < 0 || index >= drives.length) continue;
    drives[index] = {
      km: typeof row.distanceMeters === 'number' ? Math.round(row.distanceMeters / 100) / 10 : null,
      minutes: Number.isFinite(seconds) ? Math.round(seconds / 60) : null,
    };
  }
  return drives;
}

async function handle(request: Request): Promise<Response> {
  const supabase = await signedInClient(request);
  if (!supabase) return json({ error: 'unauthorized' }, 401);

  const input = readInput(await request.json().catch(() => null));
  if (!input) return json({ error: 'invalid_place_query' }, 400);

  // The caller's position is used for this request only; it is never written anywhere.
  if (!(await withinDailyLimit(supabase))) return json({ error: 'daily_limit' }, 429);

  const places = await searchPlaces(input);
  const drives = places.length > 0 ? await driveTimes(input.origin, places) : [];
  return json({ places: places.map((place, index) => ({ ...place, ...drives[index] })) });
}

serve('places', handle);
