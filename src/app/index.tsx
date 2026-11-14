import { useEffect, useState } from 'react';
import { AppState, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fab, MicTab, Tab, type IconName } from '@/components/kit';
import { Toast } from '@/components/toast';
import { MaxContentWidth, RowDir, Rule, Spacing, themed } from '@/constants/theme';
import { AssistantScreen } from '@/screens/AssistantScreen';
import { BudgetScreen } from '@/screens/BudgetScreen';
import { ListScreen } from '@/screens/ListScreen';
import { MealsScreen } from '@/screens/MealsScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { OffersScreen } from '@/screens/OffersScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { useStore } from '@/store/store';
import { isSyncConfigured, subscribeToHousehold, syncNow } from '@/sync/sync';

type TabKey = 'budget' | 'list' | 'offers' | 'assistant' | 'meals' | 'settings';

type TabSpec = { key: TabKey; label: string; icon: IconName };

/** Two destinations on each side of the assistant's button. Settings opens from "Today". */
const TABS_BEFORE_MIC: readonly TabSpec[] = [
  { key: 'budget', label: 'اليوم', icon: { ios: 'house', android: 'home', web: 'home' } },
  { key: 'list', label: 'القائمة', icon: { ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' } },
];
const TABS_AFTER_MIC: readonly TabSpec[] = [
  { key: 'meals', label: 'الوجبات', icon: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' } },
  { key: 'offers', label: 'العروض', icon: { ios: 'tag', android: 'sell', web: 'sell' } },
];

const PUSH_DELAY_MS = 800;

/** Keeps this phone and the other one in step while a household is linked. */
function useHouseholdSync(): string {
  const householdId = useStore((state) => state.household?.id);
  const [syncError, setSyncError] = useState('');

  useEffect(() => {
    if (!householdId || !isSyncConfigured()) return;

    const run = (): void => {
      syncNow()
        .then(() => setSyncError(''))
        .catch((error: unknown) => setSyncError(error instanceof Error ? error.message : 'تعذّرت المزامنة'));
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribeStore = useStore.subscribe((state, previous) => {
      if (state.items === previous.items && state.plan === previous.plan) return;
      clearTimeout(timer);
      timer = setTimeout(run, PUSH_DELAY_MS);
    });
    const unsubscribeRemote = subscribeToHousehold(householdId, setSyncError);
    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') run();
    });
    run();

    return () => {
      clearTimeout(timer);
      unsubscribeStore();
      unsubscribeRemote();
      appState.remove();
    };
  }, [householdId]);

  return syncError;
}

/** True once the saved state has been read back from the phone's storage. */
function useHydrated(): boolean {
  // Starts false everywhere so the web's server render and first client render agree.
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    if (useStore.persist.hasHydrated()) setIsHydrated(true);
    return useStore.persist.onFinishHydration(() => setIsHydrated(true));
  }, []);
  return isHydrated;
}

export default function Home() {
  const [tab, setTab] = useState<TabKey>('budget');
  const syncError = useHouseholdSync();
  const styles = useStyles();
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isAddingOffer, setIsAddingOffer] = useState(false);
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [isWorkBox, setIsWorkBox] = useState(false);

  const hasOnboarded = useStore((state) => state.hasOnboarded);
  const isHydrated = useHydrated();

  // Until the saved state is read back, nothing is shown: a returning family must not see the welcome flash by.
  if (!isHydrated) return <SafeAreaView style={styles.root} />;
  if (!hasOnboarded) {
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <OnboardingScreen />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const renderTab = ({ key, label, icon }: TabSpec) => (
    <Tab key={key} label={label} icon={icon} selected={tab === key} onPress={() => setTab(key)} />
  );

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.container}>
              {tab === 'budget' && (
                <BudgetScreen
                  onOpenSettings={() => setTab('settings')}
                  onOpenList={() => setTab('list')}
                  onOpenMeals={() => setTab('meals')}
                />
              )}
              {tab === 'list' && <ListScreen isAdding={isAddingItem} onCloseAdd={() => setIsAddingItem(false)} />}
              {tab === 'offers' && <OffersScreen isAdding={isAddingOffer} onCloseAdd={() => setIsAddingOffer(false)} />}
              {tab === 'assistant' && <AssistantScreen />}
              {tab === 'meals' && (
                <MealsScreen
                  isAddingMeal={isAddingMeal}
                  onCloseAddMeal={() => setIsAddingMeal(false)}
                  onWorkView={setIsWorkBox}
                />
              )}
              {tab === 'settings' && <SettingsScreen syncError={syncError} onBack={() => setTab('budget')} />}
            </View>
          </ScrollView>
          <Toast />
          {tab === 'list' && <Fab label="أضف صنف" onPress={() => setIsAddingItem(true)} />}
          {tab === 'meals' && !isWorkBox && <Fab label="أضف أكلة" onPress={() => setIsAddingMeal(true)} />}
          {tab === 'offers' && <Fab label="أضف عرض" onPress={() => setIsAddingOffer(true)} />}
        </View>
        <View accessibilityRole="tablist" style={styles.tabs}>
          {TABS_BEFORE_MIC.map(renderTab)}
          <MicTab selected={tab === 'assistant'} onPress={() => setTab('assistant')} />
          {TABS_AFTER_MIC.map(renderTab)}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = themed((c) => ({
  root: { flex: 1, backgroundColor: c.paper },
  flex: { flex: 1 },
  content: { padding: Spacing.three, paddingBottom: Spacing.six + Spacing.five },
  container: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  tabs: {
    flexDirection: RowDir,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    backgroundColor: c.paper2,
    borderTopWidth: Rule.hair,
    borderTopColor: c.rule,
  },
}));
