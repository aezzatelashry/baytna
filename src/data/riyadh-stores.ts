/** A big grocery chain with branches in Riyadh, and where its current flyers can be opened. */
export interface FlyerStore {
  readonly id: string;
  readonly name: string;
  /** The chain's page on D4D Online, a public flyer directory. Opened in the browser, never read by the app. */
  readonly flyersUrl: string;
}

const D4D_RIYADH = 'https://d4donline.com/ar/saudi-arabia/riyadh/offers';

/** The seven chains the family named, in the order they asked for them. */
export const RIYADH_STORES: readonly FlyerStore[] = [
  { id: 'othaim', name: 'العثيم', flyersUrl: `${D4D_RIYADH}/othaim-markets-72` },
  { id: 'panda', name: 'بنده', flyersUrl: `${D4D_RIYADH}/hyper-panda-70` },
  { id: 'carrefour', name: 'كارفور', flyersUrl: `${D4D_RIYADH}/carrefour-62` },
  { id: 'lulu', name: 'لولو', flyersUrl: `${D4D_RIYADH}/lulu-hypermarket-63` },
  { id: 'farm', name: 'أسواق المزرعة', flyersUrl: `${D4D_RIYADH}/farm-101` },
  { id: 'danube', name: 'الدانوب', flyersUrl: `${D4D_RIYADH}/danube-74` },
  { id: 'tamimi', name: 'أسواق التميمي', flyersUrl: `${D4D_RIYADH}/tamimi-market-68` },
];
