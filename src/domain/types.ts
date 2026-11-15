export type DietTag = 'legumes' | 'spicy' | 'fried' | 'dairy' | 'gluten';

export const DIET_TAG_LABELS: Record<DietTag, string> = {
  legumes: 'بقوليات',
  spicy: 'حار',
  fried: 'مقلي',
  dairy: 'ألبان',
  gluten: 'جلوتين',
};

export type MealSlot = 'breakfast' | 'lunch' | 'dinner';

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'فطار',
  lunch: 'غدا',
  dinner: 'عشا',
};

export const SLOTS: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner'];

export type Protein = 'meat' | 'fish' | 'chicken' | 'eggs' | 'none';

export type Category =
  | 'protein'
  | 'produce'
  | 'fruit'
  | 'dairy'
  | 'bakery'
  | 'pantry'
  | 'household';

export const CATEGORY_LABELS: Record<Category, string> = {
  protein: 'لحوم ودواجن وأسماك',
  produce: 'خضار',
  fruit: 'فاكهة',
  dairy: 'ألبان وبيض',
  bakery: 'مخبوزات',
  pantry: 'بقالة',
  household: 'منظفات وورقيات',
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export interface Member {
  readonly id: string;
  readonly name: string;
  readonly excludes: readonly DietTag[];
  /** Single ingredients this person avoids, as typed: "بصل", "فلفل رومي". Applied to work food. */
  readonly avoids?: readonly string[];
  /** True when the avoided ingredients also count for meals at home. Off unless the person asks. */
  readonly avoidsAtHome?: boolean;
}

/** Ingredients people commonly say upset them, offered as one-tap choices. Not medical advice. */
export const COMMON_AVOIDS: readonly string[] = ['بصل', 'ثوم', 'فلفل رومي', 'كرنب', 'قرنبيط', 'بروكلي', 'حليب'];

export interface Ingredient {
  readonly name: string;
  readonly qty: number;
  readonly unit: string;
  readonly category: Category;
}

export interface Meal {
  readonly id: string;
  readonly name: string;
  readonly slots: readonly MealSlot[];
  readonly protein: Protein;
  readonly tags: readonly DietTag[];
  readonly ingredients: readonly Ingredient[];
  /** Light, everyday home cooking, or a treat. Drives the week's rhythm. */
  readonly style?: MealStyle;
  /** Rough time from start to table, in minutes. */
  readonly minutes?: number;
  /** Keeps well and eats well the next day, so a portion can go to work. */
  readonly boxable?: boolean;
}

export type MealStyle = 'light' | 'home' | 'treat';

export const MEAL_STYLE_LABELS: Record<MealStyle, string> = {
  light: 'خفيف',
  home: 'بيتي',
  treat: 'مزاج',
};

export const MEAL_STYLES = Object.keys(MEAL_STYLE_LABELS) as MealStyle[];

/** At or under this many minutes a meal counts as quick. */
export const QUICK_MINUTES = 20;

/** Synced rows share these fields: last write wins on `updatedAt`, deletes are soft. */
export interface SyncedRow {
  readonly id: string;
  readonly updatedAt: string;
  readonly deleted: boolean;
}

export interface ListItem extends SyncedRow {
  readonly weekStart: string;
  readonly name: string;
  readonly qty: number;
  readonly unit: string;
  readonly category: Category;
  /** Price expected before buying, in SAR. Null until someone knows it. */
  readonly estPrice: number | null;
  /** Price actually paid, in SAR. Set when the item is bought. */
  readonly paidPrice: number | null;
  readonly bought: boolean;
  readonly mealId: string | null;
  readonly addedBy: string;
  /** Bought for the packed work meals, so it can be budgeted apart from the home. */
  readonly forWork?: boolean;
  /** Added after the list was handed to the shopper. */
  readonly urgent?: boolean;
  /** The shopper looked and the shop did not have it. */
  readonly notFound?: boolean;
  /** What the shopper suggests buying instead. */
  readonly substitute?: string | null;
}

export interface PlanEntry extends SyncedRow {
  readonly date: string;
  readonly slot: MealSlot;
  readonly mealId: string;
  /** A locked meal stays put when a new plan is generated. Local to this phone for now. */
  readonly locked?: boolean;
}

export interface PriceRecord {
  readonly price: number;
  readonly date: string;
}

export type PriceBook = Readonly<Record<string, PriceRecord>>;

export type OfferKind = 'daily' | 'weekly' | 'bulk';

export const OFFER_KIND_LABELS: Record<OfferKind, string> = {
  daily: 'يومي',
  weekly: 'أسبوعي',
  bulk: 'جملة',
};

export const OFFER_KINDS = Object.keys(OFFER_KIND_LABELS) as OfferKind[];

/** A price seen at a named shop. Entered by the family or returned by the price search. */
export interface Offer {
  readonly id: string;
  readonly store: string;
  readonly name: string;
  /** What the shelf tag says for the whole pack, in SAR. */
  readonly price: number;
  /** Units in the pack: 1 for a single item, 6 for a six-pack. */
  readonly packQty: number;
  readonly kind: OfferKind;
  /** Last day the offer holds, as a date key. Null when unknown. */
  readonly validUntil: string | null;
  /** Where the price came from, so it can be checked. Null for prices typed by hand. */
  readonly sourceUrl: string | null;
  readonly addedAt: string;
}

/** How this phone picks light or dark: follow the system, or force one. */
export type ThemeMode = 'auto' | 'light' | 'dark';

/** The colour family this phone wears. Each has a light and a dark side. */
export type ColorTheme = 'royal' | 'sunset' | 'ocean';

export const DEFAULT_COLOR_THEME: ColorTheme = 'royal';
