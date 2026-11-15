import { View } from 'react-native';

import { Chip, Tile, Txt } from '@/components/kit';
import { RowDir, Spacing, themed } from '@/constants/theme';
import { GUEST_CHOICES, guestFactor, guestsThisWeek } from '@/domain/guests';
import type { Rhythm } from '@/domain/meals';
import { sharedIngredients } from '@/domain/thrift';
import type { Meal } from '@/domain/types';
import { dayName } from '@/domain/week';
import { currentWeekStart, useStore } from '@/store/store';

const RHYTHMS: readonly { readonly label: string; readonly rhythm: Rhythm }[] = [
  { label: '4 خفيف، 2 بيتي، 1 مزاج', rhythm: { light: 4, home: 2, treat: 1 } },
  { label: '5 خفيف، 2 بيتي', rhythm: { light: 5, home: 2, treat: 0 } },
  { label: '3 خفيف، 3 بيتي، 1 مزاج', rhythm: { light: 3, home: 3, treat: 1 } },
];

function sameRhythm(a: Rhythm, b: Rhythm): boolean {
  return a.light === b.light && a.home === b.home && a.treat === b.treat;
}

/** How many light, home-style and treat lunches the next plan should have. */
export function RhythmPicker() {
  const rhythm = useStore((state) => state.rhythm);
  const setRhythm = useStore((state) => state.setRhythm);
  const styles = useStyles();

  return (
    <Tile>
      <Txt kind="title">إيقاع الأسبوع</Txt>
      <Txt>بيتطبّق على الغدا في الخطة الجاية. البروتين (لحم، سمك، دجاج) له الأولوية، والإيقاع بيختار جوّاه.</Txt>
      <View style={styles.chips}>
        {RHYTHMS.map((option) => (
          <Chip
            key={option.label}
            label={option.label}
            selected={sameRhythm(rhythm, option.rhythm)}
            onPress={() => setRhythm(option.rhythm)}
          />
        ))}
      </View>
    </Tile>
  );
}

type LeftoversPickerProps = {
  /** The days of this week, as date keys. */
  days: readonly string[];
};

/** One lunch a week with nothing to buy: the family finishes what is in the fridge. */
export function LeftoversPicker({ days }: LeftoversPickerProps) {
  const leftoversDay = useStore((state) => state.leftoversDay);
  const setLeftoversDay = useStore((state) => state.setLeftoversDay);
  const styles = useStyles();

  return (
    <Tile>
      <Txt kind="title">يوم البواقي</Txt>
      <Txt>غدا يوم واحد من اللي فاضل في التلاجة، من غير شراء. بيتطبّق في الخطة الجاية.</Txt>
      <View style={styles.chips}>
        <Chip label="من غير" selected={leftoversDay === null} onPress={() => setLeftoversDay(null)} />
        {days.map((date, index) => (
          <Chip key={date} label={dayName(date)} selected={leftoversDay === index} onPress={() => setLeftoversDay(index)} />
        ))}
      </View>
    </Tile>
  );
}

/** Guests this week: what a meal puts on the list grows with the people at the table. */
export function GuestsPicker() {
  const weekStartsOn = useStore((state) => state.weekStartsOn);
  const familySize = useStore((state) => state.members.length);
  const guests = guestsThisWeek(useStore((state) => state.guests), currentWeekStart(weekStartsOn));
  const setGuests = useStore((state) => state.setGuests);
  const styles = useStyles();

  const extra = Math.round((guestFactor(familySize, guests) - 1) * 100);

  if (familySize === 0) {
    return (
      <Tile>
        <Txt kind="title">ضيوف الأسبوع ده</Txt>
        <Txt>سجّل أفراد البيت من الإعدادات الأول، عشان الكميات تتحسب على عددكم الحقيقي.</Txt>
      </Tile>
    );
  }

  return (
    <Tile>
      <Txt kind="title">ضيوف الأسبوع ده</Txt>
      <Txt>
        {guests === 0
          ? 'لو جايلكم ضيوف، اختار عددهم والكميات تزيد لوحدها لما تضيف مكونات أكلة للقائمة.'
          : `الكميات هتزيد حوالي ${extra}% للأكلات اللي تضيف مكوناتها من دلوقتي. اللي في القائمة قبل كده زي ما هو.`}
      </Txt>
      <View style={styles.chips}>
        {GUEST_CHOICES.map((count) => (
          <Chip
            key={count}
            label={count === 0 ? 'مفيش' : `${count} ضيوف`}
            selected={guests === count}
            onPress={() => setGuests(count)}
          />
        ))}
      </View>
    </Tile>
  );
}

type SharedIngredientsProps = {
  /** The meals planned for this week. */
  meals: readonly Meal[];
};

/** Ingredients more than one of the week's meals needs: buy once, use twice. */
export function SharedIngredients({ meals }: SharedIngredientsProps) {
  const shared = sharedIngredients(meals);
  if (shared.length === 0) return null;

  return (
    <Tile>
      <Txt kind="title">اشتري مرة واستخدم مرتين</Txt>
      <Txt>المكونات دي داخلة في أكتر من أكلة الأسبوع ده، فاحسب كميتها مرة واحدة.</Txt>
      {shared.map((entry) => (
        <View key={entry.name}>
          <Txt kind="strong">{entry.name}</Txt>
          <Txt kind="label">{entry.meals.join('، ')}</Txt>
        </View>
      ))}
    </Tile>
  );
}

const useStyles = themed(() => ({
  chips: { flexDirection: RowDir, flexWrap: 'wrap', gap: Spacing.two },
}));
