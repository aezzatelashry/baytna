/** One offer as the model read it off the flyer, before it is checked. */
export interface FlyerOffer {
  readonly name: string;
  readonly price: number;
  readonly packQty: number;
}

const MAX_PRICE_SAR = 5000;
const MAX_NAME = 120;
const MAX_OFFERS = 40;

function isPlausible(offer: FlyerOffer): boolean {
  return (
    typeof offer.name === 'string' &&
    offer.name.trim() !== '' &&
    offer.name.length <= MAX_NAME &&
    Number.isFinite(offer.price) &&
    offer.price > 0 &&
    offer.price <= MAX_PRICE_SAR &&
    Number.isInteger(offer.packQty) &&
    offer.packQty >= 1
  );
}

/** Keeps well-formed offers only, once each, so a misread line never reaches the phone. */
export function keepReadableOffers(reported: readonly FlyerOffer[]): FlyerOffer[] {
  const seen = new Set<string>();
  return reported
    .filter(isPlausible)
    .map((offer) => ({ name: offer.name.trim(), price: offer.price, packQty: offer.packQty }))
    .filter((offer) => {
      const key = `${offer.name}|${offer.price}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_OFFERS);
}
