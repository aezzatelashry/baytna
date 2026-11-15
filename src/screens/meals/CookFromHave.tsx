import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Field, IconButton, Tile, Txt, type IconName } from '@/components/kit';
import { showToast } from '@/components/toast';
import { RowDir, Rule, Spacing, themed } from '@/constants/theme';
import { DESSERTS } from '@/data/desserts';
import { cookIdeas, type CookIdea, type Cookable } from '@/domain/cook';
import { membersExcludedFrom } from '@/domain/meals';
import type { Meal } from '@/domain/types';
import { useVoiceInput } from '@/hooks/use-voice';
import { allMeals, useStore } from '@/store/store';

const CART_ICON: IconName = { ios: 'cart.badge.plus', android: 'add_shopping_cart', web: 'add_shopping_cart' };
const INPUT_HEIGHT = 96;

function isMeal(dish: Cookable): dish is Meal {
  return 'tags' in dish;
}

/** "What can I cook from what I have?": type or say what is at home, get dishes that fit. */
export function CookFromHave() {
  const customMeals = useStore((state) => state.customMeals);
  const staples = useStore((state) => state.staples);
  const styles = useStyles();
  const [text, setText] = useState('');
  const [isPantryCounted, setIsPantryCounted] = useState(true);
  const voice = useVoiceInput((sentence) => setText((current) => (current.trim() === '' ? sentence : `${current}، ${sentence}`)));

  const dishes: readonly Cookable[] = [...allMeals(customMeals), ...DESSERTS];
  // The long-life store is at home too: rice, oil and spices need not be typed again.
  const pantry = isPantryCounted ? staples.map((staple) => staple.name).join('، ') : '';
  const ideas = text.trim() === '' ? [] : cookIdeas(`${text}، ${pantry}`, dishes);
  const ready = ideas.filter((idea) => idea.missing.length === 0);
  const nearly = ideas.filter((idea) => idea.missing.length > 0);

  return (
    <View style={styles.block}>
      <Tile>
        <Txt kind="title">أطبخ إيه من اللي عندي؟</Txt>
        <Field
          label="اكتب اللي موجود عندك، وافصل بفاصلة"
          value={text}
          onChangeText={setText}
          multiline
          placeholder="بيض، طماطم، جبنة، رز بايت"
          style={styles.input}
        />
        {voice.isAvailable && (
          <Button
            label={voice.isListening ? 'خلّصت كلامي' : 'قول اللي عندك بصوتك'}
            onPress={() => (voice.isListening ? voice.stop() : void voice.start())}
          />
        )}
        {voice.isListening && <Txt kind="label">سامعك: {voice.partial}</Txt>}
        {voice.problem !== '' && (
          <Txt kind="label" tone="over">
            {voice.problem}
          </Txt>
        )}
        {staples.length > 0 && (
          <Chip label="احسب اللي في المخزن كمان" selected={isPantryCounted} onPress={() => setIsPantryCounted(!isPantryCounted)} />
        )}
        <Txt kind="label">{'المطابقة بالكلمة الأساسية: لو كتبت "جبنة" بتتحسب لأي نوع جبنة.'}</Txt>
      </Tile>

      {text.trim() !== '' && ideas.length === 0 && (
        <Tile>
          <Txt kind="title">مفيش أكلة قريبة</Txt>
          <Txt>{'اللي كتبته ما بيكمّلش أكلة من أكلاتكم. جرّب تكتب مكونات أكتر، أو ضيف أكلة جديدة من "أكل البيت".'}</Txt>
        </Tile>
      )}
      <Ideas title="تتعمل دلوقتي" ideas={ready} />
      <Ideas title="ناقصها حاجة أو اتنين" ideas={nearly} />
    </View>
  );
}

type IdeasProps = {
  title: string;
  ideas: readonly CookIdea<Cookable>[];
};

function Ideas({ title, ideas }: IdeasProps) {
  const members = useStore((state) => state.members);
  const addIngredientsToList = useStore((state) => state.addIngredientsToList);
  const styles = useStyles();
  if (ideas.length === 0) return null;

  const handleAddMissing = (idea: CookIdea<Cookable>): void => {
    const missing = idea.dish.ingredients.filter((ingredient) => idea.missing.includes(ingredient.name));
    const added = addIngredientsToList(missing);
    showToast(added === 0 ? 'الناقص موجود في القائمة' : `اتضاف ${added} صنف للقائمة`);
  };

  return (
    <Tile>
      <Txt kind="title">{title}</Txt>
      {ideas.map((idea) => {
        const excluded = isMeal(idea.dish) ? membersExcludedFrom(idea.dish, members).map((member) => member.name) : [];
        return (
          <View key={idea.dish.id} style={styles.idea}>
            <View style={styles.grow}>
              <Txt kind="strong">{idea.dish.name}</Txt>
              {idea.missing.length > 0 && <Txt kind="label">ناقص: {idea.missing.join('، ')}</Txt>}
              {excluded.length > 0 && (
                <Txt kind="label" tone="tight">
                  مش مناسبة لـ {excluded.join(' و')}
                </Txt>
              )}
            </View>
            {idea.missing.length > 0 && (
              <IconButton
                icon={CART_ICON}
                label={`أضف الناقص من ${idea.dish.name} للقائمة`}
                onPress={() => handleAddMissing(idea)}
              />
            )}
          </View>
        );
      })}
    </Tile>
  );
}

const useStyles = themed((c) => ({
  block: { gap: Spacing.four },
  input: { minHeight: INPUT_HEIGHT, paddingTop: Spacing.two, textAlignVertical: 'top' },
  idea: {
    flexDirection: RowDir,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: Rule.hair,
    borderBottomColor: c.rule,
  },
  grow: { flex: 1 },
}));
