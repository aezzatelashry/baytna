/** What driving costs this family. Entered by them; the app ships no fuel price of its own. */
export interface CarCosts {
  /** SAR per litre at the pump. */
  readonly fuelPricePerLitre: number;
  /** How much the car burns, in litres per 100 km. */
  readonly litresPer100Km: number;
  /** What an hour of the driver's time is worth to them, in SAR. Zero ignores time. */
  readonly timeValuePerHour: number;
}

/** A farther shop compared with the nearer one. */
export interface TripInput {
  /** What the farther shop saves on the basket, in SAR. */
  readonly saving: number;
  /** Extra driving there and back, in km. */
  readonly extraKm: number;
  /** Extra time there and back, traffic included, in minutes. */
  readonly extraMinutes: number;
}

export interface TripVerdict {
  readonly fuelCost: number;
  readonly timeCost: number;
  /** Saving minus fuel and time. Negative means the trip loses money. */
  readonly net: number;
  readonly isWorthIt: boolean;
  /** The saving the farther shop would need before the trip pays for itself. */
  readonly breakEvenSaving: number;
}

/** A trip has to come out at least this far ahead; a riyal or two is not worth the traffic. */
export const MIN_NET_SAR = 5;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Is the farther, cheaper shop really cheaper once the drive is counted? */
export function judgeTrip(input: TripInput, car: CarCosts): TripVerdict {
  const fuelCost = round2((Math.max(input.extraKm, 0) / 100) * car.litresPer100Km * car.fuelPricePerLitre);
  const timeCost = round2((Math.max(input.extraMinutes, 0) / 60) * car.timeValuePerHour);
  const net = round2(input.saving - fuelCost - timeCost);
  return {
    fuelCost,
    timeCost,
    net,
    isWorthIt: net >= MIN_NET_SAR,
    breakEvenSaving: round2(fuelCost + timeCost + MIN_NET_SAR),
  };
}

/** Straight-line distance between two points on the map, in km. Roads are always longer. */
export function straightLineKm(
  from: { readonly lat: number; readonly lng: number },
  to: { readonly lat: number; readonly lng: number },
): number {
  const EARTH_RADIUS_KM = 6371;
  const toRad = (degrees: number): number => (degrees * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return round2(2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a)));
}
