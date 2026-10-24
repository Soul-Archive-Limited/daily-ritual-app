import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '@/data/store';
import { colors, font, radius } from '@/theme/tokens';

/** One toast at a time, above the tab bar, with an optional Undo. */
export function ToastHost() {
  const s = useStore();
  const insets = useSafeAreaInsets();
  const t = s?.toast;
  if (!t) return null;
  return (
    <Animated.View
      key={t.id}
      entering={FadeInDown.duration(280)}
      exiting={FadeOut.duration(180)}
      style={[styles.toast, { bottom: insets.bottom + 72 }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <Text style={styles.text}>{t.text}</Text>
      {t.undo ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => {
            const f = t.undo;
            s.dismissToast();
            f?.();
          }}
          style={styles.undo}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '92%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.text,
    paddingVertical: 11,
    paddingLeft: 18,
    paddingRight: 12,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  text: { ...font.semibold, fontSize: 14, color: colors.bg, flexShrink: 1 },
  undo: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 6 },
  undoText: { ...font.bold, fontSize: 14, color: colors.bg, textDecorationLine: 'underline' },
});
