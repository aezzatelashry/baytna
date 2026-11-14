import type { Category, Ingredient, Meal } from '@/domain/types';

function ing(name: string, qty: number, unit: string, category: Category): Ingredient {
  return { name, qty, unit, category };
}

/**
 * Starter meal library for a family of six. Quantities are a starting point
 * to edit, and no prices are included: prices come from what the family pays.
 */
export const SEED_MEALS: readonly Meal[] = [
  {
    id: 'bf-eggs-cheese',
    name: 'بيض وجبنة وخبز',
    slots: ['breakfast', 'dinner'],
    protein: 'eggs',
    tags: ['dairy', 'gluten'],
    ingredients: [ing('بيض', 12, 'حبة', 'dairy'), ing('جبنة بيضاء', 500, 'جم', 'dairy'), ing('خبز', 2, 'ربطة', 'bakery')],
  },
  {
    id: 'bf-foul',
    name: 'فول مدمس',
    slots: ['breakfast'],
    protein: 'none',
    tags: ['legumes'],
    ingredients: [ing('فول مدمس', 2, 'علبة', 'pantry'), ing('طماطم', 500, 'جم', 'produce'), ing('خبز', 2, 'ربطة', 'bakery')],
  },
  {
    id: 'bf-taameya',
    name: 'طعمية',
    slots: ['breakfast'],
    protein: 'none',
    tags: ['legumes', 'fried'],
    ingredients: [ing('عجينة طعمية', 500, 'جم', 'pantry'), ing('زيت', 1, 'لتر', 'pantry'), ing('خبز', 2, 'ربطة', 'bakery')],
  },
  {
    id: 'bf-labneh-zaatar',
    name: 'لبنة وزعتر',
    slots: ['breakfast', 'dinner'],
    protein: 'none',
    tags: ['dairy', 'gluten'],
    ingredients: [ing('لبنة', 500, 'جم', 'dairy'), ing('زعتر', 100, 'جم', 'pantry'), ing('خبز', 2, 'ربطة', 'bakery'), ing('خيار', 500, 'جم', 'produce')],
  },
  {
    id: 'bf-shakshuka',
    name: 'شكشوكة',
    slots: ['breakfast', 'dinner'],
    protein: 'eggs',
    tags: ['gluten'],
    ingredients: [ing('بيض', 10, 'حبة', 'dairy'), ing('طماطم', 1, 'كجم', 'produce'), ing('بصل', 500, 'جم', 'produce'), ing('خبز', 2, 'ربطة', 'bakery')],
  },
  {
    id: 'ln-kabsa-chicken',
    name: 'كبسة دجاج',
    slots: ['lunch'],
    protein: 'chicken',
    tags: [],
    ingredients: [ing('دجاج', 2, 'حبة', 'protein'), ing('أرز', 1, 'كجم', 'pantry'), ing('بصل', 500, 'جم', 'produce'), ing('طماطم', 500, 'جم', 'produce')],
  },
  {
    id: 'ln-chicken-potato',
    name: 'صينية دجاج بالبطاطس',
    slots: ['lunch'],
    protein: 'chicken',
    tags: [],
    ingredients: [ing('دجاج', 2, 'حبة', 'protein'), ing('بطاطس', 2, 'كجم', 'produce'), ing('بصل', 500, 'جم', 'produce'), ing('أرز', 1, 'كجم', 'pantry')],
  },
  {
    id: 'ln-fish-sayadeya',
    name: 'صيادية سمك',
    slots: ['lunch'],
    protein: 'fish',
    tags: [],
    ingredients: [ing('سمك', 1.5, 'كجم', 'protein'), ing('أرز', 1, 'كجم', 'pantry'), ing('بصل', 1, 'كجم', 'produce'), ing('ليمون', 250, 'جم', 'produce')],
  },
  {
    id: 'ln-fish-fried',
    name: 'سمك مقلي وأرز',
    slots: ['lunch'],
    protein: 'fish',
    tags: ['fried'],
    ingredients: [ing('سمك', 1.5, 'كجم', 'protein'), ing('أرز', 1, 'كجم', 'pantry'), ing('زيت', 1, 'لتر', 'pantry'), ing('خس', 1, 'حبة', 'produce')],
  },
  {
    id: 'ln-meat-okra',
    name: 'بامية باللحم',
    slots: ['lunch'],
    protein: 'meat',
    tags: [],
    ingredients: [ing('لحم', 1, 'كجم', 'protein'), ing('بامية', 1, 'كجم', 'produce'), ing('صلصة طماطم', 1, 'علبة', 'pantry'), ing('أرز', 1, 'كجم', 'pantry')],
  },
  {
    id: 'ln-kofta',
    name: 'كفتة بالطحينة',
    slots: ['lunch'],
    protein: 'meat',
    tags: [],
    ingredients: [ing('لحم مفروم', 1, 'كجم', 'protein'), ing('طحينة', 250, 'جم', 'pantry'), ing('بطاطس', 1, 'كجم', 'produce'), ing('أرز', 1, 'كجم', 'pantry')],
  },
  {
    id: 'ln-molokhia',
    name: 'ملوخية وأرز',
    slots: ['lunch'],
    protein: 'none',
    tags: [],
    ingredients: [ing('ملوخية', 2, 'كيس', 'produce'), ing('أرز', 1, 'كجم', 'pantry'), ing('ثوم', 100, 'جم', 'produce')],
  },
  {
    id: 'ln-koshari',
    name: 'كشري',
    slots: ['lunch'],
    protein: 'none',
    tags: ['legumes', 'gluten'],
    ingredients: [ing('عدس', 500, 'جم', 'pantry'), ing('مكرونة', 500, 'جم', 'pantry'), ing('أرز', 500, 'جم', 'pantry'), ing('صلصة طماطم', 1, 'علبة', 'pantry'), ing('بصل', 1, 'كجم', 'produce')],
  },
  {
    id: 'ln-bechamel',
    name: 'مكرونة بشاميل',
    slots: ['lunch'],
    protein: 'none',
    tags: ['dairy', 'gluten'],
    ingredients: [ing('مكرونة', 1, 'كجم', 'pantry'), ing('حليب', 1, 'لتر', 'dairy'), ing('دقيق', 250, 'جم', 'pantry'), ing('لحم مفروم', 500, 'جم', 'protein')],
  },
  {
    id: 'ln-omelette-potato',
    name: 'عجة بيض وبطاطس',
    slots: ['lunch', 'dinner'],
    protein: 'eggs',
    tags: ['fried'],
    ingredients: [ing('بيض', 12, 'حبة', 'dairy'), ing('بطاطس', 1.5, 'كجم', 'produce'), ing('زيت', 1, 'لتر', 'pantry'), ing('خبز', 2, 'ربطة', 'bakery')],
  },
  {
    id: 'dn-lentil-soup',
    name: 'شوربة عدس',
    slots: ['dinner'],
    protein: 'none',
    tags: ['legumes'],
    ingredients: [ing('عدس', 500, 'جم', 'pantry'), ing('جزر', 500, 'جم', 'produce'), ing('بصل', 250, 'جم', 'produce'), ing('خبز', 2, 'ربطة', 'bakery')],
  },
  {
    id: 'dn-veg-soup',
    name: 'شوربة خضار',
    slots: ['dinner'],
    protein: 'none',
    tags: [],
    ingredients: [ing('جزر', 500, 'جم', 'produce'), ing('كوسة', 500, 'جم', 'produce'), ing('بطاطس', 500, 'جم', 'produce'), ing('شعرية', 250, 'جم', 'pantry')],
  },
  {
    id: 'dn-yogurt-fruit',
    name: 'زبادي وفاكهة',
    slots: ['dinner'],
    protein: 'none',
    tags: ['dairy'],
    ingredients: [ing('زبادي', 6, 'علبة', 'dairy'), ing('موز', 1, 'كجم', 'produce'), ing('تفاح', 1, 'كجم', 'produce')],
  },
  {
    id: 'dn-tuna-sandwich',
    name: 'ساندوتشات تونة',
    slots: ['dinner'],
    protein: 'fish',
    tags: ['gluten'],
    ingredients: [ing('تونة', 3, 'علبة', 'protein'), ing('خبز', 2, 'ربطة', 'bakery'), ing('خيار', 500, 'جم', 'produce'), ing('طماطم', 500, 'جم', 'produce')],
  },
];

export function mealById(id: string): (typeof SEED_MEALS)[number] | undefined {
  return SEED_MEALS.find((meal) => meal.id === id);
}
