/** A big grocery chain with branches in Riyadh, and its own Saudi website. */
export interface OfficialStore {
  readonly id: string;
  readonly name: string;
  /** The chain's own site, opened in the browser for this week's offers. */
  readonly siteUrl: string;
  /** The domains that count as the chain's own. */
  readonly hosts: readonly string[];
  /** Part of the address that marks the Saudi site, for a chain that shares one domain across countries. */
  readonly saudiPath?: RegExp;
}

/**
 * The seven chains the family named, in the order they asked for them. Offers come
 * from these sites and nowhere else: no aggregator, no other country's branch.
 * Keep in step with supabase/functions/price-search/offers.ts.
 */
export const RIYADH_STORES: readonly OfficialStore[] = [
  { id: 'othaim', name: 'العثيم', siteUrl: 'https://www.othaimmarkets.com/ar', hosts: ['othaimmarkets.com'] },
  { id: 'panda', name: 'بنده', siteUrl: 'https://www.panda.sa/ar', hosts: ['panda.sa', 'panda.com.sa'] },
  { id: 'carrefour', name: 'كارفور', siteUrl: 'https://www.carrefourksa.com/mafsau/ar/', hosts: ['carrefourksa.com'] },
  {
    id: 'lulu',
    name: 'لولو',
    siteUrl: 'https://gcc.luluhypermarket.com/ar-sa',
    hosts: ['luluhypermarket.com'],
    saudiPath: /[/-]sa(\/|$|\?)|ksa/i,
  },
  { id: 'farm', name: 'أسواق المزرعة', siteUrl: 'https://www.farm.com.sa/', hosts: ['farm.com.sa'] },
  { id: 'danube', name: 'الدانوب', siteUrl: 'https://www.danube.sa/', hosts: ['danube.sa'] },
  { id: 'tamimi', name: 'أسواق التميمي', siteUrl: 'https://www.tamimimarkets.com/', hosts: ['tamimimarkets.com'] },
];

function hostOf(url: string): string | null {
  const match = /^https?:\/\/([^/?#]+)/i.exec(url.trim());
  return match ? match[1].toLowerCase().replace(/^www\./, '') : null;
}

/** The chain whose own Saudi site this address belongs to, or null for any other page. */
export function officialStoreOf(url: string): OfficialStore | null {
  const host = hostOf(url);
  if (host === null) return null;
  const store = RIYADH_STORES.find((each) => each.hosts.some((official) => host === official || host.endsWith(`.${official}`)));
  if (!store) return null;
  return store.saudiPath && !store.saudiPath.test(url) ? null : store;
}
