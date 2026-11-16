import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, Field, IconButton, Sheet, Tile, Txt, type IconName } from '@/components/kit';
import { showToast } from '@/components/toast';
import { COLOR_THEME_LABELS, COLOR_THEMES, RowDir, Spacing } from '@/constants/theme';
import { formatSar, parsePrice } from '@/domain/budget';
import { ROLE_LABELS, ROLES } from '@/domain/orders';
import { COMMON_AVOIDS, DIET_TAG_LABELS, type DietTag, type Member, type ThemeMode } from '@/domain/types';
import { useStore } from '@/store/store';
import { LockBlock } from '@/screens/settings/LockBlock';
import { SyncBlock } from '@/screens/settings/SyncBlock';

const DIET_TAGS = Object.keys(DIET_TAG_LABELS) as DietTag[];

const THEME_MODES: readonly { mode: ThemeMode; label: string }[] = [
  { mode: 'auto', label: 'زي الموبايل' },
  { mode: 'light', label: 'فاتح' },
  { mode: 'dark', label: 'غامق' },
];

const DELETE_ICON: IconName = { ios: 'trash', android: 'delete', web: 'delete' };
/** Points toward the start of an Arabic line, which is the right. */
const BACK_ICON: IconName = { ios: 'chevron.right', android: 'arrow_forward', web: 'arrow_forward' };

type SyncProps = {
  syncError: string;
};

type SettingsScreenProps = SyncProps & {
  onBack: () => void;
};

export function SettingsScreen({ syncError, onBack }: SettingsScreenProps) {
  const budget = useStore((state) => state.budget);
  const setBudget = useStore((state) => state.setBudget);
  const myName = useStore((state) => state.myName);
  const setMyName = useStore((state) => state.setMyName);
  const members = useStore((state) => state.members);
  const addMember = useStore((state) => state.addMember);
  const fruitBudget = useStore((state) => state.fruitBudget);
  const setFruitBudget = useStore((state) => state.setFruitBudget);
  const role = useStore((state) => state.role);
  const setRole = useStore((state) => state.setRole);
  const notes = useStore((state) => state.notes);
  const forgetNote = useStore((state) => state.forgetNote);
  const themeMode = useStore((state) => state.themeMode);
  const setThemeMode = useStore((state) => state.setThemeMode);
  const colorTheme = useStore((state) => state.colorTheme);
  const setColorTheme = useStore((state) => state.setColorTheme);

  const [budgetText, setBudgetText] = useState(formatSar(budget));
  const [memberName, setMemberName] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  const handleBudget = (): void => {
    const value = parsePrice(budgetText);
    if (value !== null && value > 0) setBudget(value);
    else setBudgetText(formatSar(budget));
  };
  const handleAddMember = (): void => {
    if (memberName.trim() === '') return;
    addMember(memberName);
    setMemberName('');
    setIsAddingMember(false);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.inlineCenter}>
        <IconButton icon={BACK_ICON} label="ارجع لشاشة اليوم" onPress={onBack} />
        <Txt kind="head" style={styles.grow}>
          الإعدادات
        </Txt>
      </View>

      <Tile>
        <Field label="ميزانية الأسبوع بالريال" value={budgetText} onChangeText={setBudgetText} onEndEditing={handleBudget} keyboardType="decimal-pad" />
        <Field
          label="ميزانية الفاكهة في الأسبوع (اختياري)"
          defaultValue={fruitBudget > 0 ? formatSar(fruitBudget) : ''}
          onEndEditing={(event) => setFruitBudget(parsePrice(event.nativeEvent.text) ?? 0)}
          keyboardType="decimal-pad"
        />
        <Field label="اسمك، بيظهر جنب اللي بتضيفه" defaultValue={myName} onEndEditing={(event) => setMyName(event.nativeEvent.text)} />
      </Tile>

      <View style={styles.block}>
        <Txt kind="title">دورك في البيت</Txt>
        <Txt>اللي بيجهّز القائمة بيبعتها، واللي بيشتري بيبدأ المشوار ويقفله. بيتفعّل لما الموبايلين يتربطوا.</Txt>
        <View style={styles.chips}>
          {ROLES.map((each) => (
            <Chip key={each} label={ROLE_LABELS[each]} selected={role === each} onPress={() => setRole(each)} />
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <Txt kind="title">شكل التطبيق</Txt>
        <View style={styles.chips}>
          {THEME_MODES.map(({ mode, label }) => (
            <Chip key={mode} label={label} selected={themeMode === mode} onPress={() => setThemeMode(mode)} />
          ))}
        </View>
        <Txt kind="strong">لون التطبيق</Txt>
        <View style={styles.chips}>
          {COLOR_THEMES.map((theme) => (
            <Chip key={theme} label={COLOR_THEME_LABELS[theme]} selected={colorTheme === theme} onPress={() => setColorTheme(theme)} />
          ))}
        </View>
      </View>

      <LockBlock />

      <View style={styles.block}>
        <Txt kind="title">أفراد البيت والممنوعات</Txt>
        <Txt>اختار لكل فرد الأكل اللي ما يناسبوش، والوجبات هتتعلّم عليه.</Txt>
        {members.map((member) => (
          <MemberTile key={member.id} member={member} />
        ))}
        <Button label="أضف فرد" onPress={() => setIsAddingMember(true)} />
        <Sheet isOpen={isAddingMember} onClose={() => setIsAddingMember(false)} title="فرد جديد">
          <Field label="الاسم" autoFocus value={memberName} onChangeText={setMemberName} onSubmitEditing={handleAddMember} />
          <Button kind="primary" label="أضف" onPress={handleAddMember} disabled={memberName.trim() === ''} />
        </Sheet>
      </View>

      {notes.length > 0 && (
        <View style={styles.block}>
          <Txt kind="title">اللي المساعد فاكره</Txt>
          {notes.map((note) => (
            <View key={note} style={styles.inlineCenter}>
              <Txt style={styles.grow}>{note}</Txt>
              <IconButton icon={DELETE_ICON} label={`انسى: ${note}`} tone="danger" onPress={() => forgetNote(note)} />
            </View>
          ))}
        </View>
      )}

      <SyncBlock syncError={syncError} />
    </View>
  );
}

function MemberTile({ member }: { member: Member }) {
  const toggleExclude = useStore((state) => state.toggleExclude);
  const removeMember = useStore((state) => state.removeMember);
  const restoreMember = useStore((state) => state.restoreMember);
  const toggleAvoid = useStore((state) => state.toggleAvoid);
  const setAvoidsAtHome = useStore((state) => state.setAvoidsAtHome);
  const [custom, setCustom] = useState('');

  const avoids = member.avoids ?? [];
  // The common choices first, then whatever this person typed themselves.
  const avoidChoices = [...COMMON_AVOIDS, ...avoids.filter((word) => !COMMON_AVOIDS.includes(word))];
  const handleAddCustom = (): void => {
    if (custom.trim() === '') return;
    if (!avoids.includes(custom.trim())) toggleAvoid(member.id, custom);
    setCustom('');
  };

  const handleRemove = (): void => {
    removeMember(member.id);
    showToast(`اتشال "${member.name}"`, () => restoreMember(member));
  };

  return (
    <Tile>
      <View style={styles.inlineCenter}>
        <Txt kind="strong" style={styles.grow}>
          {member.name}
        </Txt>
        <IconButton icon={DELETE_ICON} label={`احذف ${member.name}`} tone="danger" onPress={handleRemove} />
      </View>
      <Txt kind="label">ما يناسبوش:</Txt>
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
      <Txt kind="label">مكونات ما ياخدهاش في أكل الشغل:</Txt>
      <View style={styles.chips}>
        {avoidChoices.map((word) => (
          <Chip key={word} label={word} selected={avoids.includes(word)} onPress={() => toggleAvoid(member.id, word)} />
        ))}
      </View>
      <View style={styles.inline}>
        <Field label="مكوّن تاني" grow value={custom} onChangeText={setCustom} onSubmitEditing={handleAddCustom} />
        <Button label="أضف" onPress={handleAddCustom} disabled={custom.trim() === ''} />
      </View>
      {avoids.length > 0 && (
        <Chip
          label="طبّقهم على أكل البيت كمان"
          selected={member.avoidsAtHome === true}
          onPress={() => setAvoidsAtHome(member.id, member.avoidsAtHome !== true)}
        />
      )}
    </Tile>
  );
}

const styles = StyleSheet.create({
  screen: { gap: Spacing.five },
  block: { gap: Spacing.three },
  inline: { flexDirection: RowDir, gap: Spacing.two, alignItems: 'flex-end' },
  chips: { flexDirection: RowDir, flexWrap: 'wrap', gap: Spacing.two },
  grow: { flex: 1 },
  inlineCenter: { flexDirection: RowDir, alignItems: 'center', gap: Spacing.two },
});
