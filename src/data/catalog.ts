import { withFamilyWords, type CatalogEntry, type FamilyWord } from '../domain/catalog';
import type { Category } from '../domain/types';

function entry(id: string, category: Category, name: string, ...aliases: string[]): CatalogEntry {
  return { id, category, name, aliases };
}

/**
 * The family's dictionary of things they buy: one entry per product, with the other
 * names people and shop flyers use for it. A longer name is its own product
 * ("زيت زيتون" is not "زيت"), so it gets its own entry.
 */
export const BASE_CATALOG: readonly CatalogEntry[] = [
  entry('rice', 'pantry', 'أرز', 'رز', 'أرز بسمتي', 'رز بسمتي', 'أرز مصري', 'رز مصري'),
  entry('rice-pudding', 'dairy', 'رز بلبن', 'أرز بلبن', 'أرز باللبن', 'رز باللبن'),
  entry('pasta', 'pantry', 'مكرونة', 'معكرونة', 'مكرونه', 'باستا', 'سباغيتي', 'اسباجتي'),
  entry('vermicelli', 'pantry', 'شعرية', 'شعيرية'),
  entry('bulgur', 'pantry', 'برغل'),
  entry('oats', 'pantry', 'شوفان'),
  entry('flour', 'pantry', 'دقيق', 'طحين'),
  entry('semolina', 'pantry', 'سميد'),
  entry('starch', 'pantry', 'نشا', 'نشاء'),
  entry('sugar', 'pantry', 'سكر'),
  entry('salt', 'pantry', 'ملح'),
  entry('honey', 'pantry', 'عسل'),
  entry('dates', 'pantry', 'تمر', 'تمور'),
  entry('oil', 'pantry', 'زيت', 'زيت طبخ', 'زيت نباتي', 'زيت دوار الشمس', 'زيت ذرة'),
  entry('olive-oil', 'pantry', 'زيت زيتون'),
  entry('ghee', 'pantry', 'سمن', 'سمنة'),
  entry('olives', 'pantry', 'زيتون'),
  entry('tahini', 'pantry', 'طحينة', 'طحينه'),
  entry('zaatar', 'pantry', 'زعتر'),
  entry('cinnamon', 'pantry', 'قرفة'),
  entry('lentils', 'pantry', 'عدس'),
  entry('fava', 'pantry', 'فول مدمس', 'فول'),
  entry('falafel-mix', 'pantry', 'عجينة طعمية', 'عجينة فلافل', 'طعمية', 'فلافل'),
  entry('tomato-paste', 'pantry', 'صلصة طماطم', 'معجون طماطم', 'صلصة', 'معجون'),
  entry('nuts', 'pantry', 'مكسرات نيئة', 'مكسرات'),
  entry('tuna', 'pantry', 'تونة', 'تونه', 'تونا'),
  entry('tea', 'pantry', 'شاي'),
  entry('coffee', 'pantry', 'قهوة', 'بن'),
  entry('water', 'pantry', 'ماء', 'مياه', 'مويه'),

  entry('bread', 'bakery', 'خبز', 'عيش', 'خبز عربي', 'صامولي', 'توست'),

  entry('eggs', 'dairy', 'بيض'),
  entry('milk', 'dairy', 'حليب'),
  entry('laban', 'dairy', 'لبن', 'لبن رايب'),
  entry('yogurt', 'dairy', 'زبادي', 'روب'),
  entry('labneh', 'dairy', 'لبنة', 'لبنه'),
  entry('white-cheese', 'dairy', 'جبنة بيضاء', 'جبنة بيضا', 'جبن أبيض', 'جبنة فيتا', 'فيتا'),
  entry('halloumi', 'dairy', 'جبنة حلوم', 'حلوم'),
  entry('cottage-cheese', 'dairy', 'جبنة قريش', 'قريش'),
  entry('butter', 'dairy', 'زبدة', 'زبده'),

  entry('tomatoes', 'produce', 'طماطم', 'بندورة'),
  entry('cucumber', 'produce', 'خيار'),
  entry('onion', 'produce', 'بصل'),
  entry('garlic', 'produce', 'ثوم'),
  entry('potatoes', 'produce', 'بطاطس'),
  entry('sweet-potato', 'produce', 'بطاطا', 'بطاطا حلوة'),
  entry('carrots', 'produce', 'جزر'),
  entry('zucchini', 'produce', 'كوسة', 'كوسا'),
  entry('okra', 'produce', 'بامية', 'باميا'),
  entry('spinach', 'produce', 'سبانخ'),
  entry('molokhia', 'produce', 'ملوخية'),
  entry('lettuce', 'produce', 'خس'),
  entry('parsley', 'produce', 'بقدونس'),
  entry('bell-pepper', 'produce', 'فلفل رومي', 'فلفل بارد', 'فليفلة'),
  entry('lemon', 'produce', 'ليمون'),

  entry('apples', 'fruit', 'تفاح'),
  entry('bananas', 'fruit', 'موز'),
  entry('oranges', 'fruit', 'برتقال'),

  entry('chicken', 'protein', 'دجاج', 'فراخ', 'دجاجة', 'دجاج كامل'),
  entry('chicken-breast', 'protein', 'صدور دجاج', 'صدر دجاج', 'فيليه دجاج'),
  entry('meat', 'protein', 'لحم', 'لحمة', 'لحم بقري', 'لحم غنم'),
  entry('minced-meat', 'protein', 'لحم مفروم', 'لحمة مفرومة', 'مفروم'),
  entry('fish', 'protein', 'سمك'),
  entry('fish-fillet', 'protein', 'سمك فيليه', 'فيليه سمك'),
];

/**
 * The dictionary in use: the built-in products plus the words the family added.
 * It is one shared list, replaced in place when the family's words change, so every
 * matcher that reads it sees the same products without being handed them one by one.
 */
export const CATALOG: CatalogEntry[] = [...BASE_CATALOG];

/** Rebuilds the dictionary in use from the built-in products and the family's own words. */
export function applyFamilyWords(words: readonly FamilyWord[]): void {
  CATALOG.splice(0, CATALOG.length, ...withFamilyWords(BASE_CATALOG, words));
}
