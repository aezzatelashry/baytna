import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { create } from 'zustand';

import { Txt } from '@/components/kit';
import { MaxContentWidth, MIN_TOUCH, Radius, RowDir, Spacing, themed } from '@/constants/theme';

const VISIBLE_MS = 5000;

interface ToastState {
  readonly message: string;
  readonly undo: (() => void) | null;
  /** Changes on every show, so the same message twice restarts the timer. */
  readonly stamp: number;
  show: (message: string, undo?: () => void) => void;
  hide: () => void;
}

const useToast = create<ToastState>()((set) => ({
  message: '',
  undo: null,
  stamp: 0,
  show: (message, undo) => set((state) => ({ message, undo: undo ?? null, stamp: state.stamp + 1 })),
  hide: () => set({ message: '', undo: null }),
}));

/** Says what just happened and offers to take it back for a few seconds. */
export function showToast(message: string, undo?: () => void): void {
  useToast.getState().show(message, undo);
}

/** Rendered once by the shell, above the bottom bar. */
export function Toast() {
  const message = useToast((state) => state.message);
  const undo = useToast((state) => state.undo);
  const stamp = useToast((state) => state.stamp);
  const hide = useToast((state) => state.hide);
  const styles = useStyles();

  useEffect(() => {
    if (message === '') return;
    const timer = setTimeout(hide, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, stamp, hide]);

  if (message === '') return null;

  const handleUndo = (): void => {
    undo?.();
    hide();
  };

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Animated.View entering={FadeInDown} exiting={FadeOutDown} accessibilityLiveRegion="polite" style={styles.bar}>
        <Txt kind="strong" style={styles.text}>
          {message}
        </Txt>
        {undo !== null && (
          <Pressable accessibilityRole="button" onPress={handleUndo} style={styles.undo}>
            <Txt kind="strong" style={styles.undoText}>
              تراجع
            </Txt>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const useStyles = themed((c) => ({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: Spacing.six + Spacing.four, alignItems: 'center', paddingHorizontal: Spacing.three },
  bar: {
    flexDirection: RowDir,
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    minHeight: MIN_TOUCH,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.control,
    backgroundColor: c.ink,
    boxShadow: c.shadow,
  },
  text: { flex: 1, color: c.paper },
  undo: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: Spacing.two },
  undoText: { color: c.accentSoft },
}));
