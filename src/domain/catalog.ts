import type { Category } from './types';

/** One product the family buys, with the other names it goes by. */
export interface CatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly category: Category;
}

/** A word the family taught the dictionary: another name for a product it knows, or a product of their own. */
export interface FamilyWord {
  readonly word: string;
  /** The built-in product this is another name for. Null when it is a product of the family's own. */
  readonly productId: string | null;
  /** Used for a product of the family's own; an added name takes its product's category. */
  readonly kind: Category;
}

const FAMILY_PREFIX = 'family-';

/**
 * The dictionary with the family's words in it. An added name joins its product's
 * other names; a new product gets its own entry. A word pointing at a product the
 * dictionary no longer has becomes a product of its own rather than being lost.
 */
export function withFamilyWords(base: readonly CatalogEntry[], words: readonly FamilyWord[]): CatalogEntry[] {
  const usable = words.filter((each) => each.word.trim() !== '');
  const known = new Set(base.map((entry) => entry.id));
  const extended = base.map((entry) => {
    const added = usable.filter((each) => each.productId === entry.id).map((each) => each.word.trim());
    return added.length === 0 ? entry : { ...entry, aliases: [...entry.aliases, ...added] };
  });
  const own = usable
    .filter((each) => each.productId === null || !known.has(each.productId))
    .map((each) => ({ id: `${FAMILY_PREFIX}${arabicKey(each.word)}`, name: each.word.trim(), aliases: [], category: each.kind }));
  return [...extended, ...own];
}

const DIACRITICS = /[ً-ٰٟـ]/g;

/**
 * Folds the spellings Arabic writers mix freely, so "الأرز", "ارز" and "أرز" are one
 * word: hamza forms, ta marbuta, alef maqsura, diacritics and the leading "ال".
 */
export function arabicKey(text: string): string {
  return text
    .toLowerCase()
    .replace(DIACRITICS, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (word.length > 3 && word.startsWith('ال') ? word.slice(2) : word))
    .join(' ');
}

function wordsOf(text: string): string[] {
  const key = arabicKey(text);
  return key === '' ? [] : key.split(' ');
}

/** True when `phrase` appears in `words` as whole words, in order and side by side. */
function containsPhrase(words: readonly string[], phrase: readonly string[]): boolean {
  if (phrase.length === 0 || phrase.length > words.length) return false;
  return words.some((_, start) => phrase.every((word, offset) => words[start + offset] === word));
}

interface Match {
  readonly entry: CatalogEntry;
  readonly length: number;
}

/**
 * The product a typed or printed name refers to, or null when the dictionary does
 * not know it. The longest name found wins, so "زيت زيتون 1 لتر" is olive oil, not oil.
 */
export function findInCatalog(name: string, catalog: readonly CatalogEntry[]): CatalogEntry | null {
  const words = wordsOf(name);
  const best = catalog.reduce<Match | null>((current, entry) => {
    const longest = [entry.name, ...entry.aliases]
      .map(wordsOf)
      .filter((phrase) => containsPhrase(words, phrase))
      .reduce((max, phrase) => Math.max(max, phrase.length), 0);
    return longest > (current?.length ?? 0) ? { entry, length: longest } : current;
  }, null);
  return best?.entry ?? null;
}

/**
 * Do two names mean the same product? Through the dictionary when it knows both.
 * A name it does not know matches only on whole words, so a made-up or rare item
 * still finds its offer without "لبن" catching "لبنة".
 */
export function sameProduct(a: string, b: string, catalog: readonly CatalogEntry[]): boolean {
  const first = findInCatalog(a, catalog);
  const second = findInCatalog(b, catalog);
  if (first !== null && second !== null) return first.id === second.id;
  if (first !== null || second !== null) return false;
  const [short, long] = [wordsOf(a), wordsOf(b)].sort((x, y) => x.length - y.length);
  return containsPhrase(long, short);
}
