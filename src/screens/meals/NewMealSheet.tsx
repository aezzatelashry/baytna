import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Field, IconButton, Sheet, Txt, type IconName } from '@/components/kit';
import { showToast } from '@/components/toast';
import { RowDir, Spacing, themed } from '@/constants/theme';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  DIET_TAG_LABELS,
  MEAL_STYLE_LABELS,
  MEAL_STYLES,
  SLOT_LABELS,
  SLOTS,
  type Category,
  type DietTag,
  type Ingredient,
  type Meal,
  type MealSlot,
  type MealStyle,
  type Protein,
} from '@/domain/types';
import { useStore } from '@/store/store';

const DIET_TAGS = Object.keys(DIET_TAG_LABELS) as DietTag[];
const PROTEIN_LABELS: Record<Protein, string> = {
  chicken: 'دجاج',
  meat: 'لحم',
  fish: 'سمك',
  eggs: 'بيض',
  none: 'من غير',
};
const PROTEINS = Object.keys(PROTEIN_LABELS) as Protein[];
const REMOVE_ICON: IconName = { ios: 'xmark', android: 'close', web: 'close' };

function toggled<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((kept) => kept !== value) : [...list, value];
}

type NewMealSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  /** One of the family's own dishes to change. Give the sheet a `key` of its id so the fields start from it. */
  editing?: Meal;
};

/** The family adds one of its own dishes, or changes one, with what goes in it. */
export function NewMealSheet({ isOpen, onClose, editing }: NewMealSheetProps) {
  const addCustomMeal = useStore((state) => state.addCustomMeal);
  const updateCustomMeal = useStore((state) => state.updateCustomMeal);
  const styles = useStyles();
  const [name, setName] = useState(editing?.name ?? '');
  const [slots, setSlots] = useState<readonly MealSlot[]>(editing?.slots ?? ['lunch']);
  const [protein, setProtein] = useState<Protein>(editing?.protein ?? 'none');
  const [tags, setTags] = useState<readonly DietTag[]>(editing?.tags ?? []);
  const [ingredients, setIngredients] = useState<readonly Ingredient[]>(editing?.ingredients ?? []);
  const [ingredientName, setIngredientName] = useState('');
  const [category, setCategory] = useState<Category>('produce');
  const [style, setStyle] = useState<MealStyle>(editing?.style ?? 'home');
  const [isBoxable, setIsBoxable] = useState(editing?.boxable === true);
  const [minutes, setMinutes] = useState(editing?.minutes ? String(editing.minutes) : '');

  const canSave = name.trim() !== '' && slots.length > 0;

  const handleAddIngredient = (): void => {
    const wanted = ingredientName.trim();
    if (wanted === '') return;
    setIngredients([...ingredients, { name: wanted, qty: 1, unit: '', category }]);
    setIngredientName('');
  };
  const handleSave = (): void => {
    if (!canSave) return;
    const time = Number.parseInt(minutes, 10);
    const meal = {
      name,
      slots,
      protein,
      tags,
      ingredients,
      style,
      boxable: isBoxable,
      ...(Number.isFinite(time) && time > 0 ? { minutes: time } : {}),
    };
    if (editing) {
      updateCustomMeal(editing.id, meal);
      showToast(`اتعدّلت "${name.trim()}"`);
      onClose();
      return;
    }
    addCustomMeal(meal);
    showToast(`"${name.trim()}" اتضافت لأكلاتكم`);
    setName('');
    setTags([]);
    setIngredients([]);
    onClose();
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={editing ? 'عدّل الأكلة' : 'أكلة جديدة'}>
      <Field label="اسم الأكلة" value={name} onChangeText={setName} />

      <Txt kind="strong">تتاكل في</Txt>
      <View style={styles.chips}>
        {SLOTS.map((slot) => (
          <Chip key={slot} label={SLOT_LABELS[slot]} selected={slots.includes(slot)} onPress={() => setSlots(toggled(slots, slot))} />
        ))}
      </View>

      <Txt kind="strong">البروتين</Txt>
      <View style={styles.chips}>
        {PROTEINS.map((key) => (
          <Chip key={key} label={PROTEIN_LABELS[key]} selected={protein === key} onPress={() => setProtein(key)} />
        ))}
      </View>

      <Txt kind="strong">نوعها</Txt>
      <View style={styles.chips}>
        {MEAL_STYLES.map((key) => (
          <Chip key={key} label={MEAL_STYLE_LABELS[key]} selected={style === key} onPress={() => setStyle(key)} />
        ))}
        <Chip label="تنفع بوكس تاني يوم" selected={isBoxable} onPress={() => setIsBoxable(!isBoxable)} />
      </View>
      <Field label="بتاخد كام دقيقة تقريباً؟ (اختياري)" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" />

      <Txt kind="strong">فيها حاجة من دي؟</Txt>
      <View style={styles.chips}>
        {DIET_TAGS.map((tag) => (
          <Chip key={tag} label={DIET_TAG_LABELS[tag]} selected={tags.includes(tag)} onPress={() => setTags(toggled(tags, tag))} />
        ))}
      </View>

      <Txt kind="strong">المكونات</Txt>
      {ingredients.map((ingredient) => (
        <View key={ingredient.name} style={styles.row}>
          <Txt style={styles.grow}>
            {ingredient.name}، {CATEGORY_LABELS[ingredient.category]}
          </Txt>
          <IconButton
            icon={REMOVE_ICON}
            label={`شيل ${ingredient.name}`}
            onPress={() => setIngredients(ingredients.filter((kept) => kept !== ingredient))}
          />
        </View>
      ))}
      <Field label="اسم المكون" value={ingredientName} onChangeText={setIngredientName} onSubmitEditing={handleAddIngredient} />
      <View style={styles.chips}>
        {CATEGORIES.map((key) => (
          <Chip key={key} label={CATEGORY_LABELS[key]} selected={category === key} onPress={() => setCategory(key)} />
        ))}
      </View>
      <Button label="أضف المكون" onPress={handleAddIngredient} disabled={ingredientName.trim() === ''} />

      <Button kind="primary" label="احفظ الأكلة" onPress={handleSave} disabled={!canSave} />
    </Sheet>
  );
}

const useStyles = themed(() => ({
  chips: { flexDirection: RowDir, flexWrap: 'wrap', gap: Spacing.two },
  row: { flexDirection: RowDir, alignItems: 'center' },
  grow: { flex: 1 },
}));
