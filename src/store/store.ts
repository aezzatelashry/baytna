import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { withMeta } from '@/data/meal-meta';
import { mealById, SEED_MEALS } from '@/data/seed-meals';
import { MAX_NOTES, type AssistantAction } from '@/domain/assistant';
import { lookupPrice, normalizeName, recordPrice } from '@/domain/budget';
import { DEFAULT_RHYTHM, generateWeekPlan, missingIngredients, styleSequence, type Rhythm } from '@/domain/meals';
import { EMPTY_FUND, fillFund, spendFromFund, type Fund, type FundKind } from '@/domain/funds';
import type { WasteEntry } from '@/domain/thrift';
import { isUrgentWhenAdded, nextStatus, ROLES, type OrderEvent, type OrderStatus, type Role } from '@/domain/orders';
import type { Category, DietTag, Ingredient, ListItem, Meal, MealSlot, Member, Offer, PlanEntry, PriceBook, SyncedRow, ThemeMode } from '@/domain/types';
import { restock, type Staple } from '@/domain/pantry';
import type { Shop, ShopPrices } from '@/domain/shops';
import type { CarCosts } from '@/domain/trip';
import { toDateKey, weekDays, weekStartOf } from '@/domain/week';
import {
  generateWorkWeek,
  safeWorkMeals,
  workDaysOf,
  workShoppingList,
  type Comfort,
  type ComfortEntry,
  type WorkBudgetMode,
  type WorkSlot,
  type WorkWeek,
} from '@/domain/workbox';
import { WORK_MEALS } from '@/data/work-meals';

export const DEFAULT_WEEKLY_BUDGET = 500;
const SATURDAY = 6;

export interface NewItem {
  readonly name: string;
  readonly qty: number;
  readonly unit: string;
  readonly category: Category;
  readonly estPrice: number | null;
  readonly mealId?: string | null;
}

export type NewOffer = Omit<Offer, 'id' | 'addedAt'>;
export type NewMeal = Omit<Meal, 'id'>;
export type NewStaple = Omit<Staple, 'id' | 'boughtOn'>;
export type NewShop = Omit<Shop, 'id'>;

/** The built-in meals followed by the family's own. */
export function allMeals(custom: readonly Meal[]): Meal[] {
  return [...SEED_MEALS.map(withMeta), ...custom];
}

export function findMeal(id: string, custom: readonly Meal[]): Meal | undefined {
  const builtIn = mealById(id);
  return builtIn ? withMeta(builtIn) : custom.find((meal) => meal.id === id);
}

export interface HouseholdLink {
  readonly id: string;
  readonly code: string;
}

interface State {
  readonly budget: number;
  readonly weekStartsOn: number;
  readonly myName: string;
  /** Local to this phone: follow the system, or force light (bright shops) or dark. */
  readonly themeMode: ThemeMode;
  /** False until the first-run welcome is finished or skipped. */
  readonly hasOnboarded: boolean;
  readonly members: readonly Member[];
  readonly items: readonly ListItem[];
  readonly plan: readonly PlanEntry[];
  readonly priceBook: PriceBook;
  /** Prices seen at named shops. Local to this phone for now. */
  readonly offers: readonly Offer[];
  /** How many light, home and treat lunches the family wants in a week. */
  readonly rhythm: Rhythm;
  readonly waste: readonly WasteEntry[];
  /** Money set aside weekly for restocking the store and for stocking up on offers. */
  readonly funds: Readonly<Record<FundKind, Fund>>;
  /** Weekly amount the family wants to keep for fruit. Zero means not tracked. */
  readonly fruitBudget: number;
  /** Long-life things: rice, oil, spices, cleaning. Kept apart from the weekly list. */
  readonly staples: readonly Staple[];
  readonly shops: readonly Shop[];
  readonly shopPrices: ShopPrices;
  readonly activeShopId: string | null;
  /** What driving costs the family, as they entered it. Null until they do. */
  readonly car: CarCosts | null;
  /** The member who takes packed meals to work. Their avoid list filters what is offered. */
  readonly workEaterId: string | null;
  readonly workHasMicrowave: boolean;
  /** Each week's packed meals, keyed by the week's first day. */
  readonly workWeeks: Readonly<Record<string, WorkWeek>>;
  readonly workOffset: number;
  readonly comfortLog: readonly ComfortEntry[];
  readonly workBudgetMode: WorkBudgetMode;
  /** Weekly amount for work food when it is budgeted apart. Zero until the family sets it. */
  readonly workBudget: number;
  /** What this phone's owner does: builds the list or buys it. */
  readonly role: Role;
  /** Each week's list status, keyed by the week's first day. Local until the family sync lands. */
  readonly orders: Readonly<Record<string, OrderStatus>>;
  /** Meals the family added themselves. Local to this phone for now. */
  readonly customMeals: readonly Meal[];
  readonly favorites: readonly string[];
  /** Meal id to YouTube video id. */
  readonly mealVideos: Readonly<Record<string, string>>;
  /** Preferences the assistant was asked to remember. Local to this phone. */
  readonly notes: readonly string[];
  readonly planOffset: number;
  readonly household: HouseholdLink | null;
  readonly lastPushedAt: string;
  readonly lastPulledAt: string;
}

interface Actions {
  setBudget: (budget: number) => void;
  setMyName: (name: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  finishOnboarding: () => void;
  addMember: (name: string) => void;
  removeMember: (id: string) => void;
  /** Takes back a removal, with the member's exclusions intact. */
  restoreMember: (member: Member) => void;
  toggleExclude: (memberId: string, tag: DietTag) => void;
  addItem: (item: NewItem) => void;
  /** Adds or removes one ingredient a member avoids. */
  toggleAvoid: (memberId: string, word: string) => void;
  /** Whether a member's avoided ingredients also count for meals at home. */
  setAvoidsAtHome: (memberId: string, atHome: boolean) => void;
  setCar: (car: CarCosts) => void;
  setRhythm: (rhythm: Rhythm) => void;
  setFundWeekly: (kind: FundKind, weekly: number) => void;
  spendFund: (kind: FundKind, amount: number) => void;
  /** Tops the funds up once for every week that has started. Safe to call on every open. */
  fillFunds: () => void;
  setFruitBudget: (amount: number) => void;
  updateCustomMeal: (id: string, meal: NewMeal) => void;
  /** Notes something thrown away and what it had cost. */
  addWaste: (name: string, price: number) => void;
  removeWaste: (id: string) => void;
  addStaple: (staple: NewStaple) => void;
  /** A new pack was bought today: its price is kept and the pack's life is measured. */
  restockStaple: (id: string, price: number) => void;
  removeStaple: (id: string) => void;
  restoreStaple: (staple: Staple) => void;
  addShop: (shop: NewShop) => void;
  removeShop: (id: string) => void;
  restoreShop: (shop: Shop) => void;
  /** The shop the family is buying from now; paid prices are remembered against it. */
  setActiveShop: (shopId: string | null) => void;
  setWorkEater: (memberId: string | null) => void;
  setWorkHasMicrowave: (hasMicrowave: boolean) => void;
  setWorkBudgetMode: (mode: WorkBudgetMode) => void;
  setWorkBudget: (amount: number) => void;
  /** Adds what is not already on this week's list. Returns how many items were added. */
  addIngredientsToList: (ingredients: readonly Ingredient[]) => number;
  generateWorkWeek: () => void;
  setWorkMeal: (date: string, slot: WorkSlot, mealId: string) => void;
  /** Puts what the week's packed meals need on the shopping list. Returns how many items were added. */
  addWorkWeekToList: () => number;
  logComfort: (date: string, mealId: string, comfort: Comfort) => void;
  setRole: (role: Role) => void;
  /** Moves this week's list along (send, start, finish...). False when this role may not do it now. */
  applyOrderEvent: (event: OrderEvent) => boolean;
  markNotFound: (id: string, substitute: string | null) => void;
  clearNotFound: (id: string) => void;
  setBought: (id: string, bought: boolean, paidPrice: number | null) => void;
  setEstPrice: (id: string, price: number | null) => void;
  removeItem: (id: string) => void;
  /** Takes back a delete. */
  restoreItem: (id: string) => void;
  addMealToList: (mealId: string) => number;
  /** Applies changes the assistant proposed, after the family confirmed them. */
  applyAssistantActions: (actions: readonly AssistantAction[]) => void;
  addOffers: (offers: readonly NewOffer[]) => void;
  removeOffer: (id: string) => void;
  forgetNote: (note: string) => void;
  generatePlan: () => void;
  togglePlanLock: (date: string, slot: MealSlot) => void;
  /** Trades the meal in this slot with the same slot on another day. */
  moveMeal: (date: string, slot: MealSlot, toDate: string) => void;
  addCustomMeal: (meal: NewMeal) => void;
  removeCustomMeal: (id: string) => void;
  restoreCustomMeal: (meal: Meal) => void;
  toggleFavorite: (mealId: string) => void;
  /** Links a YouTube video to a meal; null removes the link. */
  setMealVideo: (mealId: string, videoId: string | null) => void;
  setPlanMeal: (date: string, slot: MealSlot, mealId: string) => void;
  setHousehold: (household: HouseholdLink | null) => void;
  mergeRemote: (items: readonly ListItem[], plan: readonly PlanEntry[], pulledAt: string) => void;
  markPushed: (at: string) => void;
}

export type Store = State & Actions;

const now = (): string => new Date().toISOString();

export function currentWeekStart(weekStartsOn: number): string {
  return weekStartOf(new Date(), weekStartsOn);
}

function buildItem(input: NewItem, weekStart: string, addedBy: string, book: PriceBook): ListItem {
  return {
    id: Crypto.randomUUID(),
    updatedAt: now(),
    deleted: false,
    weekStart,
    name: input.name.trim(),
    qty: input.qty,
    unit: input.unit,
    category: input.category,
    estPrice: input.estPrice ?? lookupPrice(book, input.name),
    paidPrice: null,
    bought: false,
    mealId: input.mealId ?? null,
    addedBy,
  };
}

function patchRow<T extends SyncedRow>(rows: readonly T[], id: string, patch: Partial<T>): T[] {
  return rows.map((row) => (row.id === id ? { ...row, ...patch, updatedAt: now() } : row));
}

/** Last write wins per row id. */
export function mergeRows<T extends SyncedRow>(local: readonly T[], remote: readonly T[]): T[] {
  const byId = new Map(local.map((row) => [row.id, row]));
  for (const row of remote) {
    const mine = byId.get(row.id);
    if (!mine || row.updatedAt > mine.updatedAt) byId.set(row.id, row);
  }
  return [...byId.values()];
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      budget: DEFAULT_WEEKLY_BUDGET,
      weekStartsOn: SATURDAY,
      myName: '',
      themeMode: 'auto',
      hasOnboarded: false,
      members: [],
      items: [],
      plan: [],
      priceBook: {},
      offers: [],
      notes: [],
      rhythm: DEFAULT_RHYTHM,
      waste: [],
      funds: { pantry: EMPTY_FUND, offers: EMPTY_FUND },
      fruitBudget: 0,
      staples: [],
      shops: [],
      shopPrices: {},
      activeShopId: null,
      car: null,
      workEaterId: null,
      workHasMicrowave: false,
      workWeeks: {},
      workOffset: 0,
      comfortLog: [],
      workBudgetMode: 'inside',
      workBudget: 0,
      role: 'requester',
      orders: {},
      customMeals: [],
      favorites: [],
      mealVideos: {},
      planOffset: 0,
      household: null,
      lastPushedAt: '',
      lastPulledAt: '',

      setBudget: (budget) => set({ budget }),
      setMyName: (myName) => set({ myName: myName.trim() }),
      setThemeMode: (themeMode) => set({ themeMode }),
      finishOnboarding: () => set({ hasOnboarded: true }),

      addMember: (name) =>
        set((state) => ({
          members: [...state.members, { id: Crypto.randomUUID(), name: name.trim(), excludes: [] }],
        })),
      removeMember: (id) => set((state) => ({ members: state.members.filter((member) => member.id !== id) })),
      restoreMember: (member) =>
        set((state) => (state.members.some((kept) => kept.id === member.id) ? state : { members: [...state.members, member] })),
      toggleExclude: (memberId, tag) =>
        set((state) => ({
          members: state.members.map((member) =>
            member.id !== memberId
              ? member
              : {
                  ...member,
                  excludes: member.excludes.includes(tag)
                    ? member.excludes.filter((existing) => existing !== tag)
                    : [...member.excludes, tag],
                },
          ),
        })),

      addItem: (input) =>
        set((state) => {
          const weekStart = currentWeekStart(state.weekStartsOn);
          const item = buildItem(input, weekStart, state.myName, state.priceBook);
          const urgent = isUrgentWhenAdded(state.orders[weekStart] ?? 'draft');
          return { items: [...state.items, urgent ? { ...item, urgent } : item] };
        }),

      toggleAvoid: (memberId, word) =>
        set((state) => ({
          members: state.members.map((member) => {
            if (member.id !== memberId) return member;
            const avoids = member.avoids ?? [];
            const wanted = word.trim();
            if (wanted === '') return member;
            return { ...member, avoids: avoids.includes(wanted) ? avoids.filter((kept) => kept !== wanted) : [...avoids, wanted] };
          }),
        })),

      setAvoidsAtHome: (memberId, avoidsAtHome) =>
        set((state) => ({
          members: state.members.map((member) => (member.id === memberId ? { ...member, avoidsAtHome } : member)),
        })),

      setCar: (car) => set({ car }),
      setRhythm: (rhythm) => set({ rhythm }),
      addWaste: (name, price) =>
        set((state) => ({
          waste: [...state.waste, { id: Crypto.randomUUID(), date: toDateKey(new Date()), name: name.trim(), price }],
        })),
      removeWaste: (id) => set((state) => ({ waste: state.waste.filter((entry) => entry.id !== id) })),

      // Buying for the long-life store is paid out of its fund, not out of the week.
      addStaple: (input) =>
        set((state) => ({
          staples: [
            ...state.staples,
            { ...input, name: input.name.trim(), id: Crypto.randomUUID(), boughtOn: toDateKey(new Date()) },
          ],
          funds: { ...state.funds, pantry: spendFromFund(state.funds.pantry, input.price) },
        })),
      restockStaple: (id, price) =>
        set((state) => ({
          staples: state.staples.map((staple) => (staple.id === id ? restock(staple, price, toDateKey(new Date())) : staple)),
          funds: { ...state.funds, pantry: spendFromFund(state.funds.pantry, price) },
        })),

      setFundWeekly: (kind, weekly) =>
        set((state) => ({ funds: { ...state.funds, [kind]: { ...state.funds[kind], weekly } } })),
      spendFund: (kind, amount) =>
        set((state) => ({ funds: { ...state.funds, [kind]: spendFromFund(state.funds[kind], amount) } })),
      fillFunds: () =>
        set((state) => {
          const weekStart = currentWeekStart(state.weekStartsOn);
          const pantry = fillFund(state.funds.pantry, weekStart);
          const offers = fillFund(state.funds.offers, weekStart);
          return pantry === state.funds.pantry && offers === state.funds.offers ? state : { funds: { pantry, offers } };
        }),
      setFruitBudget: (fruitBudget) => set({ fruitBudget }),
      updateCustomMeal: (id, meal) =>
        set((state) => ({
          customMeals: state.customMeals.map((kept) => (kept.id === id ? { ...meal, name: meal.name.trim(), id } : kept)),
        })),
      removeStaple: (id) => set((state) => ({ staples: state.staples.filter((staple) => staple.id !== id) })),
      restoreStaple: (staple) =>
        set((state) => (state.staples.some((kept) => kept.id === staple.id) ? state : { staples: [...state.staples, staple] })),

      addShop: (input) =>
        set((state) => ({ shops: [...state.shops, { ...input, name: input.name.trim(), id: Crypto.randomUUID() }] })),
      removeShop: (id) =>
        set((state) => ({
          shops: state.shops.filter((shop) => shop.id !== id),
          activeShopId: state.activeShopId === id ? null : state.activeShopId,
        })),
      restoreShop: (shop) =>
        set((state) => (state.shops.some((kept) => kept.id === shop.id) ? state : { shops: [...state.shops, shop] })),
      setActiveShop: (activeShopId) => set({ activeShopId }),
      setWorkEater: (workEaterId) => set({ workEaterId }),
      setWorkHasMicrowave: (workHasMicrowave) => set({ workHasMicrowave }),
      setWorkBudgetMode: (workBudgetMode) => set({ workBudgetMode }),
      setWorkBudget: (workBudget) => set({ workBudget }),
      generateWorkWeek: () =>
        set((state) => {
          const weekStart = currentWeekStart(state.weekStartsOn);
          const eater = state.members.find((member) => member.id === state.workEaterId);
          const safe = safeWorkMeals(WORK_MEALS, eater, state.workHasMicrowave);
          const week = generateWorkWeek(safe, workDaysOf(weekDays(weekStart)), state.workOffset);
          return { workWeeks: { ...state.workWeeks, [weekStart]: week }, workOffset: state.workOffset + 1 };
        }),
      setWorkMeal: (date, slot, mealId) =>
        set((state) => {
          const weekStart = currentWeekStart(state.weekStartsOn);
          const week = state.workWeeks[weekStart] ?? {};
          return { workWeeks: { ...state.workWeeks, [weekStart]: { ...week, [date]: { ...week[date], [slot]: mealId } } } };
        }),
      addIngredientsToList: (ingredients) => {
        const state = get();
        const weekStart = currentWeekStart(state.weekStartsOn);
        const onList = new Set(
          state.items.filter((item) => item.weekStart === weekStart && !item.deleted).map((item) => normalizeName(item.name)),
        );
        const added = ingredients
          .filter((ingredient) => !onList.has(normalizeName(ingredient.name)))
          .map((ingredient) => buildItem({ ...ingredient, estPrice: null }, weekStart, state.myName, state.priceBook));
        set({ items: [...state.items, ...added] });
        return added.length;
      },
      addWorkWeekToList: () => {
        const state = get();
        const weekStart = currentWeekStart(state.weekStartsOn);
        const onList = new Set(
          state.items.filter((item) => item.weekStart === weekStart && !item.deleted).map((item) => normalizeName(item.name)),
        );
        const added = workShoppingList(state.workWeeks[weekStart] ?? {}, WORK_MEALS)
          .filter((ingredient) => !onList.has(normalizeName(ingredient.name)))
          .map((ingredient) => ({
            ...buildItem({ ...ingredient, estPrice: null }, weekStart, state.myName, state.priceBook),
            forWork: true,
          }));
        set({ items: [...state.items, ...added] });
        return added.length;
      },
      logComfort: (date, mealId, comfort) =>
        set((state) => ({
          comfortLog: [
            ...state.comfortLog.filter((entry) => entry.date !== date || entry.mealId !== mealId),
            { date, mealId, comfort },
          ],
        })),

      setRole: (role) => set({ role }),
      applyOrderEvent: (event) => {
        const state = get();
        const weekStart = currentWeekStart(state.weekStartsOn);
        const status = state.orders[weekStart] ?? 'draft';
        // On a phone that is not linked to a household, one person plays both roles.
        const roles = state.household ? [state.role] : ROLES;
        const next = roles.map((role) => nextStatus(status, event, role)).find((result) => result !== null);
        if (!next) return false;
        set({ orders: { ...state.orders, [weekStart]: next } });
        return true;
      },
      markNotFound: (id, substitute) =>
        set((state) => ({ items: patchRow(state.items, id, { notFound: true, substitute }) })),
      clearNotFound: (id) =>
        set((state) => ({ items: patchRow(state.items, id, { notFound: false, substitute: null }) })),

      setBought: (id, bought, paidPrice) =>
        set((state) => {
          const target = state.items.find((item) => item.id === id);
          if (!target) return state;
          const isPriced = bought && paidPrice !== null;
          const today = toDateKey(new Date());
          const priceBook = isPriced ? recordPrice(state.priceBook, target.name, paidPrice, today) : state.priceBook;
          // The same price is also remembered against the shop the family is buying from.
          const shopId = state.activeShopId;
          const shopPrices =
            isPriced && shopId !== null
              ? { ...state.shopPrices, [shopId]: recordPrice(state.shopPrices[shopId] ?? {}, target.name, paidPrice, today) }
              : state.shopPrices;
          return {
            priceBook,
            shopPrices,
            items: patchRow(state.items, id, { bought, paidPrice: bought ? paidPrice : null }),
          };
        }),

      setEstPrice: (id, estPrice) => set((state) => ({ items: patchRow(state.items, id, { estPrice }) })),
      removeItem: (id) => set((state) => ({ items: patchRow(state.items, id, { deleted: true }) })),
      restoreItem: (id) => set((state) => ({ items: patchRow(state.items, id, { deleted: false }) })),

      addMealToList: (mealId) => {
        const state = get();
        const meal = findMeal(mealId, state.customMeals);
        if (!meal) return 0;
        const weekStart = currentWeekStart(state.weekStartsOn);
        const weekItems = state.items.filter((item) => item.weekStart === weekStart);
        const added = missingIngredients(meal, weekItems).map((ingredient) =>
          buildItem({ ...ingredient, estPrice: null, mealId }, weekStart, state.myName, state.priceBook),
        );
        set({ items: [...state.items, ...added] });
        return added.length;
      },

      applyAssistantActions: (actions) => {
        for (const action of actions) {
          const state = get();
          if (action.type === 'add_item') {
            state.addItem({ name: action.name, qty: 1, unit: '', category: action.category, estPrice: action.estPrice });
          } else if (action.type === 'set_budget') {
            state.setBudget(action.amount);
          } else if (action.type === 'remember') {
            set({ notes: [...state.notes.filter((note) => note !== action.note), action.note].slice(-MAX_NOTES) });
          } else if (action.type === 'set_meal') {
            state.setPlanMeal(action.date, action.slot, action.mealId);
          } else {
            const weekStart = currentWeekStart(state.weekStartsOn);
            const wanted = normalizeName(action.name);
            state.items
              .filter((item) => item.weekStart === weekStart && !item.deleted && normalizeName(item.name) === wanted)
              .forEach((item) => state.removeItem(item.id));
          }
        }
      },

      addOffers: (incoming) =>
        set((state) => ({
          offers: [
            ...state.offers,
            ...incoming.map((offer) => ({
              ...offer,
              store: offer.store.trim(),
              name: offer.name.trim(),
              id: Crypto.randomUUID(),
              addedAt: toDateKey(new Date()),
            })),
          ],
        })),
      removeOffer: (id) => set((state) => ({ offers: state.offers.filter((offer) => offer.id !== id) })),
      forgetNote: (note) => set((state) => ({ notes: state.notes.filter((kept) => kept !== note) })),

      generatePlan: () =>
        set((state) => {
          const days = weekDays(currentWeekStart(state.weekStartsOn));
          const stamp = now();
          const isKept = (entry: PlanEntry): boolean => !entry.deleted && entry.locked === true && days.includes(entry.date);
          const locked = state.plan.filter(isKept);
          const retired = state.plan.map((entry) =>
            days.includes(entry.date) && !entry.deleted && !isKept(entry)
              ? { ...entry, deleted: true, updatedAt: stamp }
              : entry,
          );
          const fresh = generateWeekPlan(allMeals(state.customMeals), days, state.planOffset, {
            locked,
            favorites: new Set(state.favorites),
            styles: styleSequence(state.rhythm, days.length),
          })
            .filter((slot) => !locked.some((kept) => kept.date === slot.date && kept.slot === slot.slot))
            .map((slot) => ({ ...slot, id: Crypto.randomUUID(), updatedAt: stamp, deleted: false }));
          return { plan: [...retired, ...fresh], planOffset: state.planOffset + 1 };
        }),

      togglePlanLock: (date, slot) =>
        set((state) => {
          const entry = state.plan.find((row) => !row.deleted && row.date === date && row.slot === slot);
          return entry ? { plan: patchRow(state.plan, entry.id, { locked: entry.locked !== true }) } : state;
        }),

      moveMeal: (date, slot, toDate) => {
        const state = get();
        const here = state.plan.find((row) => !row.deleted && row.date === date && row.slot === slot);
        const there = state.plan.find((row) => !row.deleted && row.date === toDate && row.slot === slot);
        if (!here || date === toDate) return;
        // The two days trade meals, so no slot is left empty.
        state.setPlanMeal(toDate, slot, here.mealId);
        if (there) state.setPlanMeal(date, slot, there.mealId);
      },

      addCustomMeal: (meal) =>
        set((state) => ({
          customMeals: [...state.customMeals, { ...meal, name: meal.name.trim(), id: `custom-${Crypto.randomUUID()}` }],
        })),
      removeCustomMeal: (id) => set((state) => ({ customMeals: state.customMeals.filter((meal) => meal.id !== id) })),
      restoreCustomMeal: (meal) =>
        set((state) =>
          state.customMeals.some((kept) => kept.id === meal.id) ? state : { customMeals: [...state.customMeals, meal] },
        ),
      toggleFavorite: (mealId) =>
        set((state) => ({
          favorites: state.favorites.includes(mealId)
            ? state.favorites.filter((id) => id !== mealId)
            : [...state.favorites, mealId],
        })),
      setMealVideo: (mealId, videoId) =>
        set((state) => {
          const { [mealId]: _removed, ...rest } = state.mealVideos;
          return { mealVideos: videoId === null ? rest : { ...rest, [mealId]: videoId } };
        }),

      setPlanMeal: (date, slot, mealId) =>
        set((state) => {
          const existing = state.plan.find(
            (entry) => !entry.deleted && entry.date === date && entry.slot === slot,
          );
          if (existing) return { plan: patchRow(state.plan, existing.id, { mealId }) };
          const entry: PlanEntry = { id: Crypto.randomUUID(), updatedAt: now(), deleted: false, date, slot, mealId };
          return { plan: [...state.plan, entry] };
        }),

      setHousehold: (household) => set({ household, lastPushedAt: '', lastPulledAt: '' }),
      mergeRemote: (items, plan, pulledAt) =>
        set((state) => ({
          items: mergeRows(state.items, items),
          plan: mergeRows(state.plan, plan),
          lastPulledAt: pulledAt,
        })),
      markPushed: (lastPushedAt) => set({ lastPushedAt }),
    }),
    { name: 'baytna-v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
