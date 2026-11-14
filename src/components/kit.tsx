import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {
  Font,
  ICON_SIZE,
  MaxContentWidth,
  MIN_TOUCH,
  Radius,
  RowDir,
  Rule,
  Size,
  Spacing,
  themed,
  usePalette,
} from '@/constants/theme';

type TxtKind = 'figure' | 'head' | 'title' | 'body' | 'strong' | 'label';
export type Tone = 'ok' | 'tight' | 'over';

type TxtProps = {
  kind?: TxtKind;
  /** Colours the text by budget status; always paired with words, never colour alone. */
  tone?: Tone;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
};

export function Txt({ kind = 'body', tone, style, children }: TxtProps) {
  const styles = useStyles();
  return <Text style={[styles.text, styles[kind], tone && styles[tone], style]}>{children}</Text>;
}

type BoxProps = {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** A surface one step off the ground. Never nested inside another tile. */
export function Tile({ style, children }: BoxProps) {
  const styles = useStyles();
  return <View style={[styles.tile, style]}>{children}</View>;
}

/** Rows separated by a hair rule. */
export function Row({ style, children }: BoxProps) {
  const styles = useStyles();
  return <View style={[styles.row, style]}>{children}</View>;
}

export type IconName = NonNullable<Exclude<SymbolViewProps['name'], string>>;

type IconProps = {
  name: IconName;
  color: string;
  size?: number;
};

/** SF Symbols on iOS, Material Symbols on Android and web. Decorative: labels carry the meaning. */
export function Icon({ name, color, size = ICON_SIZE }: IconProps) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}

type IconButtonProps = {
  icon: IconName;
  /** Read by screen readers; the icon alone carries no words. */
  label: string;
  onPress: () => void;
  tone?: 'plain' | 'danger';
};

/** A round, icon-only action for secondary things: share, delete, open. */
export function IconButton({ icon, label, onPress, tone = 'plain' }: IconButtonProps) {
  const styles = useStyles();
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}>
      <Icon name={icon} color={tone === 'danger' ? palette.over : palette.muted} size={ICON_BUTTON_GLYPH} />
    </Pressable>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary';
  disabled?: boolean;
};

export function Button({ label, onPress, kind = 'secondary', disabled = false }: ButtonProps) {
  const styles = useStyles();
  const isPrimary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary && styles.buttonPrimary,
        pressed && isPrimary && styles.buttonPrimaryPressed,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text style={[styles.text, styles.strong, styles.buttonText, isPrimary && styles.buttonPrimaryText]}>
        {label}
      </Text>
    </Pressable>
  );
}

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function Chip({ label, selected, onPress }: ChipProps) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}>
      <Text numberOfLines={1} style={[styles.text, styles.label, selected && styles.chipSelectedText]}>
        {label}
      </Text>
    </Pressable>
  );
}

type TabProps = {
  label: string;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
};

/** One destination in the bottom bar: icon over label, equal share of the width. */
export function Tab({ label, icon, selected, onPress }: TabProps) {
  const styles = useStyles();
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <View style={[styles.tabIcon, selected && styles.tabIconSelected]}>
        <Icon name={icon} color={selected ? palette.brandInk : palette.muted} />
      </View>
      <Text numberOfLines={1} style={[styles.text, styles.tabLabel, selected && styles.tabLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

type MicTabProps = {
  selected: boolean;
  onPress: () => void;
};

/** The assistant's button: raised in the middle of the bottom bar. */
export function MicTab({ selected, onPress }: MicTabProps) {
  const styles = useStyles();
  const palette = usePalette();
  return (
    <View style={styles.micTab}>
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel="المساعد"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={({ pressed }) => [styles.micButton, selected && styles.micButtonSelected, pressed && styles.pressed]}>
        <Icon name={MIC_ICON} color={selected ? palette.accentInk : palette.brandInk} size={MIC_GLYPH} />
      </Pressable>
    </View>
  );
}

type FabProps = {
  label: string;
  onPress: () => void;
};

/** The floating "add" button. Sits over the screen's scroll area. */
export function Fab({ label, onPress }: FabProps) {
  const styles = useStyles();
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
      <Icon name={ADD_ICON} color={palette.brandInk} size={FAB_GLYPH} />
    </Pressable>
  );
}

type SheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/** A panel that slides up from the bottom for adding or editing one thing. */
export function Sheet({ isOpen, onClose, title, children }: SheetProps) {
  const styles = useStyles();
  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.scrim} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="اقفل"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.sheetGrip} />
          <Txt kind="title">{title}</Txt>
          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  grow?: boolean;
};

export function Field({ label, grow = false, style, ...input }: FieldProps) {
  const styles = useStyles();
  const palette = usePalette();
  return (
    <View style={grow ? styles.fieldGrow : styles.field}>
      <Txt kind="label">{label}</Txt>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={palette.muted}
        selectionColor={palette.brand}
        style={[styles.text, styles.body, styles.input, style]}
        {...input}
      />
    </View>
  );
}

const ICON_BUTTON_GLYPH = 22;
const GRIP_WIDTH = 40;
const FAB_SIZE = 60;
const FAB_GLYPH = 30;
const MIC_SIZE = 60;
const MIC_GLYPH = 28;
const ADD_ICON: IconName = { ios: 'plus', android: 'add', web: 'add' };
const MIC_ICON: IconName = { ios: 'mic.fill', android: 'mic', web: 'mic' };
const TAB_ICON_WIDTH = 56;
const TAB_ICON_HEIGHT = 32;

const useStyles = themed((c) => ({
  text: { color: c.ink, fontFamily: Font.body, textAlign: 'right', writingDirection: 'rtl' },
  figure: {
    fontFamily: Font.display,
    fontSize: Size.figure,
    lineHeight: Size.figure * 1.15,
    fontVariant: ['tabular-nums', 'lining-nums'],
  },
  head: { fontFamily: Font.display, fontSize: Size.head, lineHeight: Size.head * 1.4 },
  title: { fontFamily: Font.display, fontSize: Size.title, lineHeight: Size.title * 1.5 },
  body: { fontSize: Size.body, lineHeight: Size.body * 1.6, color: c.muted },
  strong: { fontFamily: Font.strong, fontSize: Size.body, lineHeight: Size.body * 1.6 },
  label: { fontFamily: Font.strong, fontSize: Size.label, lineHeight: Size.label * 1.6, color: c.muted },
  ok: { color: c.ok },
  tight: { color: c.tight },
  over: { color: c.over },
  tile: {
    backgroundColor: c.paper2,
    borderRadius: Radius.card,
    boxShadow: c.shadow,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  scrim: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.paper,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    padding: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    maxHeight: '88%',
    alignSelf: 'center',
  },
  sheetBody: { gap: Spacing.three },
  sheetGrip: { alignSelf: 'center', width: GRIP_WIDTH, height: Spacing.one, borderRadius: Radius.pill, backgroundColor: c.rule },
  fab: {
    position: 'absolute',
    bottom: Spacing.three,
    left: Spacing.three,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: Radius.pill,
    backgroundColor: c.brand,
    boxShadow: c.shadow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micTab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  micButton: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: Radius.pill,
    backgroundColor: c.brand,
    boxShadow: c.shadow,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -Spacing.three,
  },
  micButtonSelected: { backgroundColor: c.accent },
  row: {
    flexDirection: RowDir,
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: MIN_TOUCH,
    paddingVertical: Spacing.two,
    borderBottomWidth: Rule.hair,
    borderBottomColor: c.rule,
  },
  button: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.control,
    borderWidth: Rule.bar,
    borderColor: c.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: c.brand, textAlign: 'center' },
  buttonPrimary: { backgroundColor: c.brand },
  buttonPrimaryPressed: { backgroundColor: c.brandPressed, borderColor: c.brandPressed },
  buttonPrimaryText: { color: c.brandInk },
  iconButton: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: { backgroundColor: c.paper3 },
  pressed: { transform: [{ translateY: 1 }] },
  disabled: { opacity: 0.45 },
  chip: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: c.paper2,
    borderWidth: Rule.bar,
    borderColor: c.rule,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: c.brand, borderColor: c.brand },
  chipSelectedText: { color: c.brandInk },
  tab: { flex: 1, minWidth: 0, minHeight: MIN_TOUCH, alignItems: 'center', gap: Spacing.one },
  tabIcon: {
    width: TAB_ICON_WIDTH,
    height: TAB_ICON_HEIGHT,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconSelected: { backgroundColor: c.brand },
  tabLabel: { fontFamily: Font.strong, fontSize: Size.tab, textAlign: 'center', color: c.muted },
  tabLabelSelected: { color: c.ink },
  field: { gap: Spacing.one },
  fieldGrow: { gap: Spacing.one, flex: 1 },
  input: {
    minWidth: 0,
    minHeight: MIN_TOUCH,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.control,
    borderWidth: Rule.bar,
    borderColor: c.rule,
    backgroundColor: c.paper2,
    color: c.ink,
  },
}));
