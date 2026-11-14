import { Linking, View } from 'react-native';

import { Button, Txt } from '@/components/kit';
import { Radius, RowDir, Rule, Spacing, themed } from '@/constants/theme';
import type { AssistantAction, AssistantReply } from '@/domain/assistant';
import { formatSar } from '@/domain/budget';
import { CATEGORY_LABELS, SLOT_LABELS, type Meal } from '@/domain/types';
import { dayName } from '@/domain/week';
import { findMeal, useStore } from '@/store/store';

function describe(action: AssistantAction, customMeals: readonly Meal[]): string {
  switch (action.type) {
    case 'add_item': {
      const price = action.estPrice === null ? '' : ` بـ ${formatSar(action.estPrice)} ريال`;
      return `أضيف "${action.name}" في ${CATEGORY_LABELS[action.category]}${price}`;
    }
    case 'remove_item':
      return `أشيل "${action.name}" من القائمة`;
    case 'set_budget':
      return `أخلّي ميزانية الأسبوع ${formatSar(action.amount)} ريال`;
    case 'remember':
      return `أفتكر: ${action.note}`;
    case 'set_meal':
      return `${SLOT_LABELS[action.slot]} يوم ${dayName(action.date)}: ${findMeal(action.mealId, customMeals)?.name ?? action.mealId}`;
  }
}

type ReplyCardProps = {
  reply: AssistantReply;
  isApplied: boolean;
  onApply: () => void;
};

/** One assistant turn: what it said, the changes it proposes, and any videos it found. */
export function ReplyCard({ reply, isApplied, onApply }: ReplyCardProps) {
  const styles = useStyles();
  const customMeals = useStore((state) => state.customMeals);

  return (
    <View style={styles.card}>
      <Txt kind="strong">{reply.reply}</Txt>

      {reply.actions.length > 0 && (
        <View style={styles.block}>
          <Txt kind="label">التغييرات المقترحة</Txt>
          {reply.actions.map((action, index) => (
            <Txt key={`${action.type}-${index}`}>{describe(action, customMeals)}</Txt>
          ))}
          {isApplied ? (
            <Txt kind="label" tone="ok">
              اتنفّذت.
            </Txt>
          ) : (
            <Button kind="primary" label="نفّذ التغييرات" onPress={onApply} />
          )}
        </View>
      )}

      {reply.videos.map((video) => (
        <View key={video.url} style={styles.video}>
          <View style={styles.grow}>
            <Txt kind="strong">{video.title}</Txt>
            {video.channel !== '' && <Txt kind="label">{video.channel}</Txt>}
          </View>
          <Button label="افتح في يوتيوب" onPress={() => void Linking.openURL(video.url)} />
        </View>
      ))}
    </View>
  );
}

const useStyles = themed((c) => ({
  card: {
    backgroundColor: c.paper2,
    borderRadius: Radius.card,
    boxShadow: c.shadow,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  block: { gap: Spacing.two },
  video: {
    flexDirection: RowDir,
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: Rule.hair,
    borderTopColor: c.rule,
  },
  grow: { flex: 1, minWidth: 0 },
}));
