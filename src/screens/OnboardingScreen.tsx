import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Chip, Field, Tile, Txt } from '@/components/kit';
import { Radius, RowDir, Spacing, themed } from '@/constants/theme';
import { formatSar, parsePrice } from '@/domain/budget';
import { DIET_TAG_LABELS, type DietTag } from '@/domain/types';
import { useStore } from '@/store/store';

const DIET_TAGS = Object.keys(DIET_TAG_LABELS) as DietTag[];
const STEP_TITLES = ['ميزانية الأسبوع', 'مين في البيت؟', 'أول خطة أكل'];
const DOT_SIZE = 8;

/** First run: the budget, who eats at home and what they avoid, then a first meal plan. */
export function OnboardingScreen() {
  const budget = useStore((state) => state.budget);
  const setBudget = useStore((state) => state.setBudget);
  const members = useStore((state) => state.members);
  const addMember = useStore((state) => state.addMember);
  const toggleExclude = useStore((state) => state.toggleExclude);
  const generatePlan = useStore((state) => state.generatePlan);
  const finishOnboarding = useStore((state) => state.finishOnboarding);
  const styles = useStyles();

  const [step, setStep] = useState(0);
  const [budgetText, setBudgetText] = useState(formatSar(budget));
  const [memberName, setMemberName] = useState('');
  const isLast = step === STEP_TITLES.length - 1;

  const handleAddMember = (): void => {
    if (memberName.trim() === '') return;
    addMember(memberName);
    setMemberName('');
  };
  const handleNext = (): void => {
    if (step === 0) {
      const value = parsePrice(budgetText);
      if (value !== null && value > 0) setBudget(value);
    }
    if (step === 1) handleAddMember();
    if (!isLast) return setStep(step + 1);
    generatePlan();
    finishOnboarding();
  };

  return (
    <View style={styles.screen}>
      <View>
        <Txt kind="label">أهلاً بيك في بيتنا</Txt>
        <Txt kind="head">{STEP_TITLES[step]}</Txt>
      </View>

      <View accessibilityLabel={`خطوة ${step + 1} من ${STEP_TITLES.length}`} style={styles.dots}>
        {STEP_TITLES.map((title, index) => (
          <View key={title} style={[styles.dot, index <= step && styles.dotDone]} />
        ))}
      </View>

      <Animated.View key={step} entering={FadeIn}>
        <Tile>
          {step === 0 && (
            <>
              <Txt>اكتب المبلغ اللي بتصرفوه على البقالة في الأسبوع. تقدر تغيّره في أي وقت.</Txt>
              <Field label="الميزانية بالريال" value={budgetText} onChangeText={setBudgetText} keyboardType="decimal-pad" />
            </>
          )}
          {step === 1 && (
            <>
              <Txt>أضف كل فرد، واختار الأكل اللي ما يناسبوش عشان الوجبات تتعلّم عليه.</Txt>
              {members.map((member) => (
                <View key={member.id} style={styles.member}>
                  <Txt kind="strong">{member.name}</Txt>
                  <View style={styles.chips}>
                    {DIET_TAGS.map((tag) => (
                      <Chip
                        key={tag}
                        label={DIET_TAG_LABELS[tag]}
                        selected={member.excludes.includes(tag)}
                        onPress={() => toggleExclude(member.id, tag)}
                      />
                    ))}
                  </View>
                </View>
              ))}
              <Field label="اسم فرد" value={memberName} onChangeText={setMemberName} onSubmitEditing={handleAddMember} />
              <Button label="أضف الفرد" onPress={handleAddMember} disabled={memberName.trim() === ''} />
            </>
          )}
          {step === 2 && (
            <Txt>هنعملك خطة 21 وجبة للأسبوع: يوم لحم، يوم سمك، ويومين دجاج. وتقدر تبدّل أي وجبة بعد كده.</Txt>
          )}
        </Tile>
      </Animated.View>

      <Button kind="primary" label={isLast ? 'اعمل الخطة وابدأ' : 'التالي'} onPress={handleNext} />
      <Button label="تخطّى دلوقتي" onPress={finishOnboarding} />
    </View>
  );
}

const useStyles = themed((c) => ({
  screen: { gap: Spacing.four, paddingTop: Spacing.five },
  dots: { flexDirection: RowDir, gap: Spacing.two },
  dot: { flex: 1, height: DOT_SIZE, borderRadius: Radius.pill, backgroundColor: c.track },
  dotDone: { backgroundColor: c.brand },
  member: { gap: Spacing.two, paddingVertical: Spacing.two },
  chips: { flexDirection: RowDir, flexWrap: 'wrap', gap: Spacing.two },
}));
