import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Field, IconButton, Txt, type IconName } from '@/components/kit';
import { showToast } from '@/components/toast';
import { RowDir, Rule, Spacing, themed } from '@/constants/theme';
import { BASE_CATALOG, CATALOG } from '@/data/catalog';
import { findInCatalog } from '@/domain/catalog';
import { CATEGORIES, CATEGORY_LABELS, type Category } from '@/domain/types';
import { useStore } from '@/store/store';

const REMOVE_ICON: IconName = { ios: 'trash', android: 'delete', web: 'delete' };

/**
 * Teaches the dictionary the family's own words: another name for a product it knows
 * ("تمن" for rice), or a product it has never heard of. Offers, prices and the meal
 * plan all match through this dictionary.
 */
export function DictionaryBlock() {
  const familyWords = useStore((state) => state.familyWords);
  const addFamilyWord = useStore((state) => state.addFamilyWord);
  const removeFamilyWord = useStore((state) => state.removeFamilyWord);
  const styles = useStyles();
  const [word, setWord] = useState('');
  const [sameAs, setSameAs] = useState('');
  const [kind, setKind] = useState<Category>('pantry');

  const typed = word.trim();
  const alreadyKnown = typed === '' ? null : findInCatalog(typed, CATALOG);
  // Only a built-in product can take another name; the family's own products stand alone.
  const target = sameAs.trim() === '' ? null : findInCatalog(sameAs, BASE_CATALOG);
  const isNewProduct = target === null;

  const handleAdd = (): void => {
    if (typed === '' || alreadyKnown !== null) return;
    addFamilyWord({ word: typed, productId: target?.id ?? null, kind: target?.category ?? kind });
    showToast(isNewProduct ? `"${typed}" اتضاف كصنف جديد` : `"${typed}" بقى اسم تاني لـ ${target.name}`);
    setWord('');
    setSameAs('');
  };

  return (
    <View style={styles.block}>
      <Txt kind="title">قاموس الأصناف</Txt>
      <Txt>لو بتكتبوا صنف باسم التطبيق مش فاهمه، علّموه هنا. العروض والأسعار والخطة هتتعرف عليه.</Txt>
      <Field label="الاسم اللي بتكتبوه" value={word} onChangeText={setWord} />
      {alreadyKnown !== null && <Txt kind="label">{`الاسم ده معروف بالفعل: ${alreadyKnown.name}.`}</Txt>}
      <Field label="هو نفس أنهي صنف؟ (سيبه فاضي لو صنف جديد)" value={sameAs} onChangeText={setSameAs} />
      {sameAs.trim() !== '' && (
        <Txt kind="label">{target === null ? 'الصنف ده مش في القاموس، فالاسم هيتضاف كصنف جديد.' : `هيتضاف كاسم تاني لـ ${target.name}.`}</Txt>
      )}
      {isNewProduct && (
        <View style={styles.chips}>
          {CATEGORIES.map((key) => (
            <Chip key={key} label={CATEGORY_LABELS[key]} selected={kind === key} onPress={() => setKind(key)} />
          ))}
        </View>
      )}
      <Button kind="primary" label="ضيف للقاموس" disabled={typed === '' || alreadyKnown !== null} onPress={handleAdd} />

      {familyWords.map((each) => {
        const product = each.productId === null ? null : BASE_CATALOG.find((entry) => entry.id === each.productId);
        return (
          <View key={each.word} style={styles.word}>
            <View style={styles.grow}>
              <Txt kind="strong">{each.word}</Txt>
              <Txt kind="label">{product ? `اسم تاني لـ ${product.name}` : `صنف جديد، ${CATEGORY_LABELS[each.kind]}`}</Txt>
            </View>
            <IconButton icon={REMOVE_ICON} label={`شيل ${each.word} من القاموس`} tone="danger" onPress={() => removeFamilyWord(each.word)} />
          </View>
        );
      })}
    </View>
  );
}

const useStyles = themed((c) => ({
  block: { gap: Spacing.three },
  chips: { flexDirection: RowDir, flexWrap: 'wrap', gap: Spacing.two },
  grow: { flex: 1 },
  word: {
    flexDirection: RowDir,
    alignItems: 'center',
    gap: Spacing.two,
    borderBottomWidth: Rule.hair,
    borderBottomColor: c.rule,
  },
}));
