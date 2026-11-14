import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, Field, IconButton, Sheet, Tile, Txt, type IconName } from '@/components/kit';
import { showToast } from '@/components/toast';
import { RowDir, Spacing } from '@/constants/theme';
import { formatSar, parsePrice } from '@/domain/budget';
import { ROLE_LABELS, ROLES } from '@/domain/orders';
import { COMMON_AVOIDS, DIET_TAG_LABELS, type DietTag, type Member, type ThemeMode } from '@/domain/types';
import { useStore } from '@/store/store';
import { isGoogleConfigured, signInWithGoogle } from '@/sync/google-auth';
import { createHousehold, isSyncConfigured, joinHousehold, syncNow } from '@/sync/sync';

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
  const role = useStore((state) => state.role);
  const setRole = useStore((state) => state.setRole);
  const notes = useStore((state) => state.notes);
  const forgetNote = useStore((state) => state.forgetNote);
  const themeMode = useStore((state) => state.themeMode);
  const setThemeMode = useStore((state) => state.setThemeMode);

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
      </View>

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

function SyncBlock({ syncError }: SyncProps) {
  const household = useStore((state) => state.household);
  const setHousehold = useStore((state) => state.setHousehold);
  const [code, setCode] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [accountName, setAccountName] = useState('');

  const run = async (link: () => ReturnType<typeof createHousehold>): Promise<void> => {
    setIsBusy(true);
    setError('');
    try {
      setHousehold(await link());
      await syncNow();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'حصل خطأ غير متوقع');
    } finally {
      setIsBusy(false);
    }
  };

  if (!isSyncConfigured()) {
    return (
      <View style={styles.block}>
        <Txt kind="title">المزامنة بين الموبايلين</Txt>
        <Txt>النسخة دي شغالة على الموبايل ده بس. المزامنة بتتفعّل لما يتضاف عنوان ومفتاح Supabase وقت البناء.</Txt>
      </View>
    );
  }

  const needsGoogle = isGoogleConfigured() && !isSignedIn;
  const handleGoogle = async (): Promise<void> => {
    setIsBusy(true);
    setError('');
    try {
      setAccountName(await signInWithGoogle());
      setIsSignedIn(true);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'حصل خطأ غير متوقع');
    } finally {
      setIsBusy(false);
    }
  };

  const shownError = error || syncError;

  return (
    <View style={styles.block}>
      <Txt kind="title">المزامنة بين الموبايلين</Txt>
      {household ? (
        <>
          <Txt>كود البيت، اكتبه على الموبايل التاني:</Txt>
          <Txt kind="head">{household.code}</Txt>
          <Button label="افصل الموبايل ده" onPress={() => setHousehold(null)} />
        </>
      ) : needsGoogle ? (
        <>
          <Txt>ادخل بحساب جوجل الأول، عشان البيت يفضل معاك لو غيّرت الموبايل.</Txt>
          <Button kind="primary" label="ادخل بحساب جوجل" disabled={isBusy} onPress={() => void handleGoogle()} />
        </>
      ) : (
        <>
          {accountName !== '' && <Txt kind="label">داخل باسم {accountName}</Txt>}
          <Button kind="primary" label="اعمل بيت جديد" disabled={isBusy} onPress={() => void run(createHousehold)} />
          <View style={styles.inline}>
            <Field label="أو اكتب كود البيت" grow value={code} onChangeText={setCode} autoCapitalize="characters" />
            <Button label="انضم" disabled={isBusy || code.trim() === ''} onPress={() => void run(() => joinHousehold(code))} />
          </View>
        </>
      )}
      {shownError !== '' && <Txt kind="label">{shownError}</Txt>}
    </View>
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
