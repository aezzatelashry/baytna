import type { Category } from './types';

/** One product the family buys, with the other names it goes by. */
export interface CatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly category: Category;
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
