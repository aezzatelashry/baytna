import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import { View } from 'react-native';
import { create } from 'zustand';

import { Button, Chip, Field, Tile, Txt } from '@/components/kit';
import { Radius, RowDir, Spacing, themed } from '@/constants/theme';
import { buildSnapshot, type AssistantReply } from '@/domain/assistant';
import { summarizeBudget } from '@/domain/budget';
import { toDateKey, weekDays } from '@/domain/week';
import { speak, stopSpeaking, useVoiceInput } from '@/hooks/use-voice';
import { allMeals, currentWeekStart, findMeal, useStore } from '@/store/store';
import { askAssistant, isSyncConfigured, type AssistantTurn } from '@/sync/sync';

import { ReplyCard } from './assistant/ReplyCard';

type ChatEntry =
  | { readonly id: string; readonly role: 'user'; readonly text: string }
  | { readonly id: string; readonly role: 'assistant'; readonly reply: AssistantReply; readonly isApplied: boolean };

interface ChatStore {
  readonly entries: readonly ChatEntry[];
  add: (entry: ChatEntry) => void;
  markApplied: (id: string) => void;
}

/** The conversation lives for as long as the app is open, so switching tabs does not lose it. */
const useChat = create<ChatStore>()((set) => ({
  entries: [],
  add: (entry) => set((state) => ({ entries: [...state.entries, entry] })),
  markApplied: (id) =>
    set((state) => ({
      entries: state.entries.map((entry) =>
        entry.id === id && entry.role === 'assistant' ? { ...entry, isApplied: true } : entry,
      ),
    })),
}));

/** Every meal the assistant may put in the plan: the built-in ones and the family's own. */
function knownMealIds(): Set<string> {
  return new Set(allMeals(useStore.getState().customMeals).map((meal) => meal.id));
}

const EXAMPLES = ['ضيف لبن وعيش للقائمة', 'بدّل غدا بكرة بحاجة فيها دجاج', 'عايز فيديو لطريقة الكبسة'];

/** What the assistant is told about the app right now. Family names are left out. */
function snapshotNow(): string {
  const state = useStore.getState();
  const weekStart = currentWeekStart(state.weekStartsOn);
  const days = weekDays(weekStart);
  const weekItems = state.items.filter((item) => item.weekStart === weekStart && !item.deleted);
  const summary = summarizeBudget(weekItems, state.budget);
  return buildSnapshot({
    today: toDateKey(new Date()),
    days,
    budget: summary.budget,
    spent: summary.spent,
    remaining: summary.remaining,
    toBuy: weekItems.filter((item) => !item.bought).map((item) => item.name),
    plan: state.plan
      .filter((entry) => !entry.deleted && days.includes(entry.date))
      .map((entry) => ({ date: entry.date, slot: entry.slot, mealName: findMeal(entry.mealId, state.customMeals)?.name ?? entry.mealId })),
    meals: allMeals(state.customMeals).map((meal) => ({ id: meal.id, name: meal.name, slots: meal.slots })),
    avoided: [...new Set(state.members.flatMap((member) => member.excludes))],
    notes: state.notes,
  });
}

function toHistory(entries: readonly ChatEntry[]): AssistantTurn[] {
  return entries.map((entry) =>
    entry.role === 'user' ? { role: 'user', text: entry.text } : { role: 'assistant', text: entry.reply.reply },
  );
}

export function AssistantScreen() {
  const entries = useChat((state) => state.entries);
  const add = useChat((state) => state.add);
  const markApplied = useChat((state) => state.markApplied);
  const applyAssistantActions = useStore((state) => state.applyAssistantActions);
  const styles = useStyles();
  const [draft, setDraft] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [isSpoken, setIsSpoken] = useState(true);

  const send = async (text: string): Promise<void> => {
    const message = text.trim();
    if (message === '' || isBusy) return;
    const history = toHistory(useChat.getState().entries);
    add({ id: Crypto.randomUUID(), role: 'user', text: message });
    setDraft('');
    setProblem('');
    setIsBusy(true);
    try {
      const reply = await askAssistant(message, history, snapshotNow(), knownMealIds());
      add({ id: Crypto.randomUUID(), role: 'assistant', reply, isApplied: false });
      if (isSpoken) speak(reply.reply);
    } catch (caught: unknown) {
      setProblem(caught instanceof Error ? caught.message : 'حصل خطأ غير متوقع');
    } finally {
      setIsBusy(false);
    }
  };
  const voice = useVoiceInput((sentence) => void send(sentence));

  if (!isSyncConfigured()) {
    return (
      <View style={styles.screen}>
        <Txt kind="head">المساعد</Txt>
        <Tile>
          <Txt>المساعد بيشتغل من خادم البيت. هيتفعّل لما يتضاف عنوان ومفتاح Supabase وقت البناء.</Txt>
          <Txt kind="label">لما يشتغل هتقدر تكلّمه بالصوت أو بالكتابة، مثلاً:</Txt>
          {EXAMPLES.map((example) => (
            <Txt key={example} kind="strong">
              {example}
            </Txt>
          ))}
        </Tile>
      </View>
    );
  }

  const handleToggleSpoken = (): void => {
    if (isSpoken) stopSpeaking();
    setIsSpoken(!isSpoken);
  };

  return (
    <View style={styles.screen}>
      <Txt kind="head">المساعد</Txt>

      {entries.length === 0 && (
        <View style={styles.block}>
          <Txt>اطلب اللي عايزه بالصوت أو بالكتابة. أي تغيير هيتعرض عليك الأول وما يتنفّذش غير لما توافق.</Txt>
          <View style={styles.chips}>
            {EXAMPLES.map((example) => (
              <Chip key={example} label={example} selected={false} onPress={() => void send(example)} />
            ))}
          </View>
        </View>
      )}

      {entries.map((entry) =>
        entry.role === 'user' ? (
          <View key={entry.id} style={styles.mine}>
            <Txt kind="strong" style={styles.mineText}>
              {entry.text}
            </Txt>
          </View>
        ) : (
          <ReplyCard
            key={entry.id}
            reply={entry.reply}
            isApplied={entry.isApplied}
            onApply={() => {
              applyAssistantActions(entry.reply.actions);
              markApplied(entry.id);
            }}
          />
        ),
      )}

      {isBusy && <Txt kind="label">بيفكّر…</Txt>}
      {voice.isListening && <Txt kind="label">سامعك: {voice.partial}</Txt>}
      {(problem !== '' || voice.problem !== '') && (
        <Txt kind="label" tone="over">
          {problem || voice.problem}
        </Txt>
      )}

      <Tile>
        {voice.isAvailable && (
          <Button
            kind="primary"
            label={voice.isListening ? 'خلّصت كلامي' : 'اتكلّم'}
            disabled={isBusy}
            onPress={() => (voice.isListening ? voice.stop() : void voice.start())}
          />
        )}
        <Field
          label="أو اكتب طلبك"
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => void send(draft)}
          returnKeyType="send"
        />
        <View style={styles.actions}>
          <Button label="ابعت" disabled={isBusy || draft.trim() === ''} onPress={() => void send(draft)} />
          <Chip label="اقرا الرد بصوت" selected={isSpoken} onPress={handleToggleSpoken} />
        </View>
      </Tile>
    </View>
  );
}

const useStyles = themed((c) => ({
  screen: { gap: Spacing.three },
  block: { gap: Spacing.three },
  chips: { flexDirection: RowDir, flexWrap: 'wrap', gap: Spacing.two },
  actions: { flexDirection: RowDir, flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  mine: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    backgroundColor: c.brand,
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  mineText: { color: c.brandInk },
}));
