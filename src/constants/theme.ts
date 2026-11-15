/**
 * Hallmark · theme: Squeeze (dealt 1/3, seed family-grocery-budget-shared-3ae7·4baf30eb·2026-11-14·r0)
 * genre playful · signature: the money left this week as one huge figure.
 * Every colour and font in the app comes from this file.
 * Revised 2026-11-14 by hand at the owner's request: a light and a dark palette on the
 * same green, budget status colours, and IBM Plex Sans Arabic for every text role
 * (the theme's own faces have no Arabic glyphs).
 */
import '@/global.css';

import { useSyncExternalStore } from 'react';
import {
  I18nManager,
  Platform,
  StyleSheet,
  useColorScheme,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useStore } from '@/store/store';

/**
 * The app is Arabic-only, so rows always run right to left. A phone set to Arabic
 * already flips `row`; everywhere else the row is reversed by hand.
 */
export const RowDir = I18nManager.isRTL ? 'row' : 'row-reverse';

export interface Palette {
  /** Screen ground. */
  readonly paper: string;
  /** Tiles and inputs, one step off the ground. */
  readonly paper2: string;
  /** Tab bar and selected chips. */
  readonly paper3: string;
  readonly ink: string;
  readonly muted: string;
  readonly rule: string;
  /** The green: primary actions and the active tab. */
  readonly brand: string;
  readonly brandPressed: string;
  readonly brandInk: string;
  /** The tomato red: prices and offers. */
  readonly accent: string;
  readonly accentInk: string;
  /** A quiet wash of the accent, for chips that hold accent-coloured text. */
  readonly accentSoft: string;
  /** The unfilled part of a ring or a bar. */
  readonly track: string;
  /** Soft lift under cards and sheets, as a CSS box-shadow. */
  readonly shadow: string;
  /** Dims the screen behind a sheet. */
  readonly scrim: string;
  readonly focus: string;
  /** Budget status: inside, nearly spent, over. */
  readonly ok: string;
  readonly tight: string;
  readonly over: string;
}

const light: Palette = {
  paper: '#FBF6EC',
  paper2: '#FFFFFF',
  paper3: '#F1E9D8',
  ink: '#12261A',
  muted: '#55614F',
  rule: '#E8DFCC',
  brand: '#1F6B3A',
  brandPressed: '#164F2A',
  brandInk: '#FFFFFF',
  accent: '#C73A22',
  accentInk: '#FFFFFF',
  accentSoft: '#FBE4DD',
  track: '#EFE7D6',
  shadow: '0 2px 12px rgba(18, 38, 26, 0.08)',
  scrim: 'rgba(18, 38, 26, 0.45)',
  focus: '#B8860B',
  ok: '#1F6B3A',
  tight: '#8F5600',
  over: '#B3261E',
};

const dark: Palette = {
  paper: '#0F1F16',
  paper2: '#1A2E22',
  paper3: '#0A1710',
  ink: '#F4F7F2',
  muted: '#B3C4B7',
  rule: '#2F4A39',
  brand: '#7FD49B',
  brandPressed: '#5FBE80',
  brandInk: '#0B1F13',
  accent: '#FF8A70',
  accentInk: '#3A0E05',
  accentSoft: '#45201A',
  track: '#24392C',
  shadow: '0 2px 12px rgba(0, 0, 0, 0.35)',
  scrim: 'rgba(0, 0, 0, 0.6)',
  focus: '#F5D36B',
  ok: '#7FD49B',
  tight: '#F5C563',
  over: '#FF9C8F',
};

export const Palettes = { light, dark } as const;

const subscribeToNothing = (): (() => void) => () => undefined;

/**
 * The system's light or dark setting. On the web the server cannot know it, so the
 * first render says light on both sides and the real value arrives right after.
 */
function useSystemScheme(): 'light' | 'dark' {
  const isHydrated = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const system = useColorScheme();
  return isHydrated && system === 'dark' ? 'dark' : 'light';
}

/** The palette for this phone: the owner's choice in settings, else the system's. */
export function usePalette(): Palette {
  const mode = useStore((state) => state.themeMode);
  const system = useSystemScheme();
  const scheme = mode === 'auto' ? (system === 'dark' ? 'dark' : 'light') : mode;
  return Palettes[scheme];
}

/**
 * Builds a stylesheet per palette, once each. Use at module level:
 * `const useStyles = themed((c) => ({ box: { backgroundColor: c.paper } }))`.
 */
export function themed<T extends Record<string, ViewStyle | TextStyle>>(build: (palette: Palette) => T): () => T {
  const sheets = new Map<Palette, T>();
  return function useThemedStyles(): T {
    const palette = usePalette();
    const existing = sheets.get(palette);
    if (existing) return existing;
    const created = StyleSheet.create(build(palette));
    sheets.set(palette, created);
    return created;
  };
}

/** Font files are loaded in the root layout; each weight is its own family. */
export const Font = {
  display: 'IBMPlexSansArabic_700Bold',
  strong: 'IBMPlexSansArabic_600SemiBold',
  body: 'IBMPlexSansArabic_400Regular',
} as const;

export const Size = { figure: 80, head: 28, title: 20, body: 17, label: 14, tab: 12 } as const;

export const Radius = { card: 24, control: 14, sheet: 28, pill: 999 } as const;

export const Rule = { hair: 1, bar: 2, ring: 3 } as const;

export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;

export const MIN_TOUCH = 48;
export const ICON_SIZE = 24;
export const MaxContentWidth = 560;
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

/** Kept for the Expo template components that still read `Colors` and `Fonts`. */
function templateColors(palette: Palette) {
  return {
    text: palette.ink,
    background: palette.paper,
    backgroundElement: palette.paper2,
    backgroundSelected: palette.paper3,
    textSecondary: palette.muted,
  } as const;
}

export const Colors = { light: templateColors(light), dark: templateColors(dark) } as const;

export type ThemeColor = keyof ReturnType<typeof templateColors>;

export const Fonts = { sans: Font.body, serif: Font.body, rounded: Font.display, mono: Font.body } as const;
