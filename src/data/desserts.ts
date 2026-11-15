import type { Category, Ingredient } from '@/domain/types';

function ing(name: string, qty: number, unit: string, category: Category): Ingredient {
  return { name, qty, unit, category };
}

export interface Dessert {
  readonly id: string;
  readonly name: string;
  /** What it is good for: a way to use up fruit, or a plain home sweet. */
  readonly note: string;
  readonly ingredients: readonly Ingredient[];
}

/**
 * Simple home sweets and fruit dishes for a family of six. A starting point to edit;
 * quantities are rough and no prices are included.
 */
export const DESSERTS: readonly Dessert[] = [
  {
    id: 'ds-rice-pudding',
    name: 'أرز بلبن',
    note: 'حلو بيتي رخيص من المخزن',
    ingredients: [ing('أرز', 200, 'جم', 'pantry'), ing('حليب', 1, 'لتر', 'dairy'), ing('سكر', 150, 'جم', 'pantry')],
  },
  {
    id: 'ds-mahalabia',
    name: 'مهلبية',
    note: 'تتعمل في ربع ساعة',
    ingredients: [ing('حليب', 1, 'لتر', 'dairy'), ing('نشا', 60, 'جم', 'pantry'), ing('سكر', 120, 'جم', 'pantry')],
  },
  {
    id: 'ds-fruit-salad',
    name: 'سلطة فواكه',
    note: 'بتستخدم الفاكهة الموجودة قبل ما تبوظ',
    ingredients: [ing('موز', 4, 'حبة', 'fruit'), ing('تفاح', 3, 'حبة', 'fruit'), ing('برتقال', 4, 'حبة', 'fruit')],
  },
  {
    id: 'ds-banana-cake',
    name: 'كيكة الموز',
    note: 'للموز اللي استوى زيادة',
    ingredients: [ing('موز', 3, 'حبة', 'fruit'), ing('دقيق', 250, 'جم', 'pantry'), ing('بيض', 2, 'حبة', 'dairy'), ing('سكر', 120, 'جم', 'pantry'), ing('زيت', 100, 'مل', 'pantry')],
  },
  {
    id: 'ds-basbousa',
    name: 'بسبوسة',
    note: 'حلو الجمعة',
    ingredients: [ing('سميد', 300, 'جم', 'pantry'), ing('زبادي', 2, 'علبة', 'dairy'), ing('سكر', 250, 'جم', 'pantry'), ing('سمن', 100, 'جم', 'pantry')],
  },
  {
    id: 'ds-apple-compote',
    name: 'كومبوت تفاح بالقرفة',
    note: 'للتفاح اللي بدأ يدبل',
    ingredients: [ing('تفاح', 6, 'حبة', 'fruit'), ing('سكر', 80, 'جم', 'pantry'), ing('قرفة', 5, 'جم', 'pantry')],
  },
];
