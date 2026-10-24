import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';

/** Buttons pinned to the bottom of a setup page. */
export function Footer({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 16) }]}>{children}</View>;
}

const styles = StyleSheet.create({
  foot: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
    backgroundColor: colors.bg,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
});
