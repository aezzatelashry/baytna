/** What the model reports through the strict tool, before it is checked. */
export interface ReportedOffer {
  readonly store: string;
  readonly name: string;
  readonly price: number;
  readonly packQty: number;
  readonly kind: string;
  readonly validUntil: string | null;
  readonly sourceUrl: string;
}

const KINDS = ['daily', 'weekly', 'bulk'];
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PRICE_SAR = 5000;
const MAX_OFFERS = 12;

function hostOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.hostname.replace(/^www\./, '') : null;
  } catch {
    return null;
  }
}

function isPlausible(offer: ReportedOffer): boolean {
  return (
    typeof offer.store === 'string' &&
    offer.store.trim() !== '' &&
    typeof offer.name === 'string' &&
    offer.name.trim() !== '' &&
    Number.isFinite(offer.price) &&
    offer.price > 0 &&
    offer.price <= MAX_PRICE_SAR &&
    Number.isInteger(offer.packQty) &&
    offer.packQty >= 1 &&
    KINDS.includes(offer.kind) &&
    (offer.validUntil === null || DATE_KEY.test(offer.validUntil))
  );
}

/**
 * Keeps only offers that are well-formed and whose source is a site the search
 * actually returned, so a price cannot be attributed to a page nobody fetched.
 */
export function keepSourcedOffers(reported: readonly ReportedOffer[], seenUrls: readonly string[]): ReportedOffer[] {
  const seenHosts = new Set(seenUrls.map(hostOf).filter((host): host is string => host !== null));
  return reported
    .filter((offer) => {
      const host = typeof offer.sourceUrl === 'string' ? hostOf(offer.sourceUrl) : null;
      return host !== null && seenHosts.has(host) && isPlausible(offer);
    })
    .slice(0, MAX_OFFERS);
}
