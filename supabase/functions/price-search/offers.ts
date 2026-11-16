/** What the model reports through the strict tool, before it is checked. */
export interface ReportedOffer {
  readonly store: string;
  readonly name: string;
  readonly price: number;
  readonly packQty: number;
  readonly kind: string;
  readonly validUntil: string | null;
  readonly sourceUrl: string;
  /** The currency printed next to the price on the page. */
  readonly currency: string;
}

interface OfficialStore {
  readonly name: string;
  readonly hosts: readonly string[];
  /** Part of the address that marks the chain's Saudi site, for chains that share one domain across countries. */
  readonly saudiPath?: RegExp;
}

/**
 * The only places a price may come from: the seven chains' own Saudi websites. No
 * aggregator, no other country's branch. Keep in step with src/data/riyadh-stores.ts.
 */
export const OFFICIAL_STORES: readonly OfficialStore[] = [
  { name: 'العثيم', hosts: ['othaimmarkets.com'] },
  { name: 'بنده', hosts: ['panda.sa', 'panda.com.sa'] },
  { name: 'كارفور', hosts: ['carrefourksa.com'] },
  { name: 'لولو', hosts: ['luluhypermarket.com'], saudiPath: /[/-]sa(\/|$|\?)|ksa/i },
  { name: 'أسواق المزرعة', hosts: ['farm.com.sa'] },
  { name: 'الدانوب', hosts: ['danube.sa'] },
  { name: 'أسواق التميمي', hosts: ['tamimimarkets.com'] },
];

/** The domains the web search is allowed to visit. */
export const OFFICIAL_DOMAINS: readonly string[] = OFFICIAL_STORES.flatMap((store) => store.hosts);

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

/** The chain whose own Saudi site this address belongs to, or null for any other page. */
export function officialStoreOf(url: string): string | null {
  const host = hostOf(url);
  if (host === null) return null;
  const store = OFFICIAL_STORES.find((each) => each.hosts.some((official) => host === official || host.endsWith(`.${official}`)));
  if (!store) return null;
  return store.saudiPath && !store.saudiPath.test(url) ? null : store.name;
}

function isPlausible(offer: ReportedOffer): boolean {
  return (
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
 * Keeps only offers that are well-formed, priced in riyals, found on a chain's own
 * Saudi site, and on a site the search actually returned. The shop's name is taken
 * from the site the price was on, not from what the model called it.
 */
export function keepSourcedOffers(reported: readonly ReportedOffer[], seenUrls: readonly string[]): ReportedOffer[] {
  const seenHosts = new Set(seenUrls.map(hostOf).filter((host): host is string => host !== null));
  return reported
    .flatMap((offer) => {
      const host = typeof offer.sourceUrl === 'string' ? hostOf(offer.sourceUrl) : null;
      const store = host === null ? null : officialStoreOf(offer.sourceUrl);
      const isKept = host !== null && store !== null && seenHosts.has(host) && offer.currency === 'SAR' && isPlausible(offer);
      return isKept ? [{ ...offer, store }] : [];
    })
    .slice(0, MAX_OFFERS);
}
