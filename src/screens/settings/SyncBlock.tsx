import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Field, IconButton, Txt, type IconName } from '@/components/kit';
import { showToast } from '@/components/toast';
import { RowDir, Rule, Spacing, themed } from '@/constants/theme';
import { useStore, type HouseholdLink } from '@/store/store';
import { isGoogleConfigured, signInWithGoogle } from '@/sync/google-auth';
import {
  approveMember,
  createHousehold,
  householdPeople,
  isSyncConfigured,
  joinHousehold,
  leaveHousehold,
  removeMember,
  signedInAccountName,
  syncNow,
  type HouseholdPerson,
} from '@/sync/sync';

const APPROVE_ICON: IconName = { ios: 'checkmark', android: 'check', web: 'check' };
const REMOVE_ICON: IconName = { ios: 'xmark', android: 'close', web: 'close' };
const REFRESH_ICON: IconName = { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' };

type SyncBlockProps = {
  syncError: string;
};

function messageOf(caught: unknown): string {
  return caught instanceof Error ? caught.message : 'حصل خطأ غير متوقع';
}

/** Linking this phone to the household: Google sign-in, create or ask to join, and the owner's approvals. */
export function SyncBlock({ syncError }: SyncBlockProps) {
  const household = useStore((state) => state.household);
  const setHousehold = useStore((state) => state.setHousehold);
  const myName = useStore((state) => state.myName);
  const styles = useStyles();
  const [code, setCode] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [accountName, setAccountName] = useState('');

  // The session outlives the screen: ask for it again whenever the screen opens.
  useEffect(() => {
    let isCurrent = true;
    signedInAccountName()
      .then((name) => {
        if (!isCurrent || name === null) return;
        setAccountName(name);
        setIsSignedIn(true);
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, []);

  /** Runs one request with the busy flag up and any failure shown under the block. */
  const attempt = async (work: () => Promise<void>): Promise<void> => {
    setIsBusy(true);
    setError('');
    try {
      await work();
    } catch (caught: unknown) {
      setError(messageOf(caught));
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

  const link = (make: () => Promise<HouseholdLink>): Promise<void> =>
    attempt(async () => {
      setHousehold(await make());
      await syncNow();
    });
  const handleGoogle = (): Promise<void> =>
    attempt(async () => {
      setAccountName(await signInWithGoogle());
      setIsSignedIn(true);
    });
  const handleCheck = (): Promise<void> => attempt(syncNow);
  const handleCancelRequest = (target: HouseholdLink): Promise<void> =>
    attempt(async () => {
      await leaveHousehold(target.id);
      setHousehold(null);
      showToast('طلب الانضمام اتلغى');
    });

  const needsGoogle = isGoogleConfigured() && !isSignedIn;
  const shownError = error || syncError;

  return (
    <View style={styles.block}>
      <Txt kind="title">المزامنة بين الموبايلين</Txt>
      {household?.status === 'pending' ? (
        <>
          <Txt>طلبك اتبعت. البيت هيتفتح على الموبايل ده أول ما صاحب البيت يوافق من موبايله.</Txt>
          <Button kind="primary" label="شوف الرد" disabled={isBusy} onPress={() => void handleCheck()} />
          <Button label="الغي الطلب" disabled={isBusy} onPress={() => void handleCancelRequest(household)} />
        </>
      ) : household ? (
        <>
          <Txt>كود البيت، اكتبه على الموبايل التاني:</Txt>
          <Txt kind="head">{household.code}</Txt>
          <People household={household} />
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
          <Button
            kind="primary"
            label="اعمل بيت جديد"
            disabled={isBusy}
            onPress={() => void link(() => createHousehold(myName))}
          />
          <View style={styles.inline}>
            <Field label="أو اكتب كود البيت" grow value={code} onChangeText={setCode} autoCapitalize="characters" />
            <Button
              label="اطلب الانضمام"
              disabled={isBusy || code.trim() === ''}
              onPress={() => void link(() => joinHousehold(code, myName))}
            />
          </View>
          <Txt kind="label">صاحب البيت هو اللي بيوافق على أي موبايل جديد.</Txt>
        </>
      )}
      {shownError !== '' && <Txt kind="label">{shownError}</Txt>}
    </View>
  );
}

type PeopleProps = {
  household: HouseholdLink;
};

/** Who is in the household. On the owner's phone, requests wait here for a yes or a no. */
function People({ household }: PeopleProps) {
  const styles = useStyles();
  const [people, setPeople] = useState<readonly HouseholdPerson[]>([]);
  const [problem, setProblem] = useState('');
  const isOwner = household.isOwner === true;

  const load = useCallback(async (): Promise<void> => {
    try {
      setPeople(await householdPeople(household.id));
      setProblem('');
    } catch (caught: unknown) {
      setProblem(messageOf(caught));
    }
  }, [household.id]);

  useEffect(() => {
    let isCurrent = true;
    householdPeople(household.id)
      .then((loaded) => {
        if (isCurrent) setPeople(loaded);
      })
      .catch((caught: unknown) => {
        if (isCurrent) setProblem(messageOf(caught));
      });
    return () => {
      isCurrent = false;
    };
  }, [household.id]);

  const act = async (work: () => Promise<void>, done: string): Promise<void> => {
    try {
      await work();
      showToast(done);
      await load();
    } catch (caught: unknown) {
      setProblem(messageOf(caught));
    }
  };

  const nameOf = (person: HouseholdPerson): string => (person.name !== '' ? person.name : 'من غير اسم');
  const waiting = people.filter((person) => person.status === 'pending');
  const members = people.filter((person) => person.status === 'member');

  return (
    <View style={styles.people}>
      <View style={styles.row}>
        <Txt kind="strong" style={styles.grow}>
          أفراد البيت
        </Txt>
        <IconButton icon={REFRESH_ICON} label="حدّث أفراد البيت" onPress={() => void load()} />
      </View>
      {waiting.map((person) => (
        <View key={person.userId} style={styles.person}>
          <View style={styles.grow}>
            <Txt kind="strong">{nameOf(person)}</Txt>
            <Txt kind="label">عايز ينضم للبيت</Txt>
          </View>
          <IconButton
            icon={APPROVE_ICON}
            label={`وافق على ${nameOf(person)}`}
            onPress={() => void act(() => approveMember(household.id, person.userId), `${nameOf(person)} بقى من أفراد البيت`)}
          />
          <IconButton
            icon={REMOVE_ICON}
            label={`ارفض ${nameOf(person)}`}
            tone="danger"
            onPress={() => void act(() => removeMember(household.id, person.userId), `اترفض طلب ${nameOf(person)}`)}
          />
        </View>
      ))}
      {members.map((person) => (
        <View key={person.userId} style={styles.person}>
          <Txt style={styles.grow}>
            {nameOf(person)}
            {person.isMe ? ' (إنت)' : ''}
          </Txt>
          {isOwner && !person.isMe && (
            <IconButton
              icon={REMOVE_ICON}
              label={`شيل ${nameOf(person)} من البيت`}
              tone="danger"
              onPress={() => void act(() => removeMember(household.id, person.userId), `${nameOf(person)} اتشال من البيت`)}
            />
          )}
        </View>
      ))}
      {isOwner && waiting.length === 0 && <Txt kind="label">مفيش طلبات انضمام مستنية.</Txt>}
      {problem !== '' && <Txt kind="label">{problem}</Txt>}
    </View>
  );
}

const useStyles = themed((c) => ({
  block: { gap: Spacing.three },
  inline: { flexDirection: RowDir, gap: Spacing.two, alignItems: 'flex-end' },
  people: { gap: Spacing.one },
  row: { flexDirection: RowDir, alignItems: 'center', gap: Spacing.two },
  grow: { flex: 1 },
  person: {
    flexDirection: RowDir,
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    borderBottomWidth: Rule.hair,
    borderBottomColor: c.rule,
  },
}));
