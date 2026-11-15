/**
 * Hallmark · theme: Squeeze (dealt 1/3, seed family-grocery-budget-shared-3ae7·4baf30eb·2026-11-14·r0)
 * genre playful · signature: the money left this week as one huge figure.
 * Every colour and font in the app comes from this file.
 * Revised 2026-11-14 by hand at the owner's request: light and dark palettes, budget
 * status colours, and IBM Plex Sans Arabic for every text role (the theme's own faces
 * have no Arabic glyphs).
 * Revised 2026-11-15: the owner rejected the green. Three colour themes replace it
 * (royal violet by default, berry, azure) and the owner picks one in settings.
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

import { DEFAULT_COLOR_THEME, type ColorTheme } from '@/domain/types';
import { useStore } from '@/store/store';

/**
 * The app is Arabic-only, so rows always run right to left. A phone set to Arabic
 * already flips `row`; everywhere else the row is reversed by hand.
 */
export const RowDir = I18nManager.isRTL ? 'row' : 'row-reverse';

export interface Palette {
  readonly isDark: boolean;
  /** Screen ground. */
  readonly paper: string;
  /** Tiles and inputs, one step off the ground. */
  readonly paper2: string;
  /** Tab bar and selected chips. */
  readonly paper3: string;
  readonly ink: string;
  readonly muted: string;
  readonly rule: string;
  /** The theme's main colour: primary actions and the active tab. */
  readonly brand: string;
  readonly brandPressed: string;
  readonly brandInk: string;
  /** The warm second colour: prices and offers. */
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

const DARK_SHADOW = '0 2px 14px rgba(0, 0, 0, 0.4)';
const DARK_SCRIM = 'rgba(0, 0, 0, 0.62)';

/** Royal: electric violet on a cool white, with a hot coral for prices. The default. */
const royalLight: Palette = {
  isDark: false,
  paper: '#F6F4FF',
  paper2: '#FFFFFF',
  paper3: '#E9E4FB',
  ink: '#17133A',
  muted: '#59547A',
  rule: '#DFD9F5',
  brand: '#4A2BD9',
  brandPressed: '#381FB0',
  brandInk: '#FFFFFF',
  accent: '#C9361A',
  accentInk: '#FFFFFF',
  accentSoft: '#FFE5DC',
  track: '#E4DEF7',
  shadow: '0 4px 18px rgba(74, 43, 217, 0.12)',
  scrim: 'rgba(23, 19, 58, 0.5)',
  focus: '#B77900',
  ok: '#4A2BD9',
  tight: '#8F5600',
  over: '#B3261E',
};

const royalDark: Palette = {
  isDark: true,
  paper: '#0F0C26',
  paper2: '#1B1740',
  paper3: '#09071A',
  ink: '#F5F3FF',
  muted: '#B9B4D8',
  rule: '#332D66',
  brand: '#AC9AFF',
  brandPressed: '#917CF5',
  brandInk: '#130E3A',
  accent: '#FF9072',
  accentInk: '#3A0E05',
  accentSoft: '#45211A',
  track: '#2A2556',
  shadow: DARK_SHADOW,
  scrim: DARK_SCRIM,
  focus: '#FFD166',
  ok: '#AC9AFF',
  tight: '#FFC857',
  over: '#FF9C8F',
};

/** Sunset: a deep berry on a warm blush, with amber for prices. */
const sunsetLight: Palette = {
  isDark: false,
  paper: '#FFF5F2',
  paper2: '#FFFFFF',
  paper3: '#FBE3E2',
  ink: '#2B0F1F',
  muted: '#6B4A58',
  rule: '#F2D8D8',
  brand: '#B8155A',
  brandPressed: '#920E46',
  brandInk: '#FFFFFF',
  accent: '#A8500A',
  accentInk: '#FFFFFF',
  accentSoft: '#FDEACC',
  track: '#F6DEDD',
  shadow: '0 4px 18px rgba(184, 21, 90, 0.12)',
  scrim: 'rgba(43, 15, 31, 0.5)',
  focus: '#5B3FD0',
  ok: '#B8155A',
  tight: '#8F5600',
  over: '#B3261E',
};

const sunsetDark: Palette = {
  isDark: true,
  paper: '#1E0A16',
  paper2: '#33142A',
  paper3: '#14060E',
  ink: '#FFF3F6',
  muted: '#DDB8C6',
  rule: '#57284A',
  brand: '#FF8DB8',
  brandPressed: '#F06F9F',
  brandInk: '#3A0620',
  accent: '#FFC15C',
  accentInk: '#3A2302',
  accentSoft: '#47300D',
  track: '#45203A',
  shadow: DARK_SHADOW,
  scrim: DARK_SCRIM,
  focus: '#C9B8FF',
  ok: '#FF8DB8',
  tight: '#FFC857',
  over: '#FF9C8F',
};

/** Ocean: a bright azure on an airy white, with orange for prices. */
const oceanLight: Palette = {
  isDark: false,
  paper: '#F2F7FF',
  paper2: '#FFFFFF',
  paper3: '#E0ECFC',
  ink: '#0B1B33',
  muted: '#4A5A73',
  rule: '#D5E2F5',
  brand: '#0B5FD8',
  brandPressed: '#084BAE',
  brandInk: '#FFFFFF',
  accent: '#BD4409',
  accentInk: '#FFFFFF',
  accentSoft: '#FFE7D6',
  track: '#DAE6F7',
  shadow: '0 4px 18px rgba(11, 95, 216, 0.12)',
  scrim: 'rgba(11, 27, 51, 0.5)',
  focus: '#B77900',
  ok: '#0B5FD8',
  tight: '#8F5600',
  over: '#B3261E',
};

const oceanDark: Palette = {
  isDark: true,
  paper: '#07142A',
  paper2: '#112342',
  paper3: '#040D1D',
  ink: '#F1F6FF',
  muted: '#AFC0DA',
  rule: '#27416C',
  brand: '#7DB5FF',
  brandPressed: '#5C9DF2',
  brandInk: '#06162E',
  accent: '#FFA15C',
  accentInk: '#3A1802',
  accentSoft: '#45260F',
  track: '#1C3359',
  shadow: DARK_SHADOW,
  scrim: DARK_SCRIM,
  focus: '#FFD166',
  ok: '#7DB5FF',
  tight: '#FFC857',
  over: '#FF9C8F',
};

/** Every colour theme the owner can pick in settings, each with a light and a dark side. */
export const Palettes: Record<ColorTheme, { readonly light: Palette; readonly dark: Palette }> = {
  royal: { light: royalLight, dark: royalDark },
  sunset: { light: sunsetLight, dark: sunsetDark },
  ocean: { light: oceanLight, dark: oceanDark },
};

export const COLOR_THEME_LABELS: Record<ColorTheme, string> = {
  royal: 'بنفسجي ملكي',
  sunset: 'توتي دافي',
  ocean: 'أزرق محيط',
};

export const COLOR_THEMES = Object.keys(COLOR_THEME_LABELS) as ColorTheme[];

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
  const colorTheme = useStore((state) => state.colorTheme);
  const system = useSystemScheme();
  const scheme = mode === 'auto' ? system : mode;
  return (Palettes[colorTheme] ?? Palettes[DEFAULT_COLOR_THEME])[scheme];
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

export const Colors = { light: templateColors(royalLight), dark: templateColors(royalDark) } as const;

export type ThemeColor = keyof ReturnType<typeof templateColors>;

export const Fonts = { sans: Font.body, serif: Font.body, rounded: Font.display, mono: Font.body } as const;
