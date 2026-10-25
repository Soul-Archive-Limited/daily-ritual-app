import type { ReactNode, Ref } from 'react';
import { ScrollView, StyleSheet, type ScrollViewInstance, type ScrollViewProps } from 'react-native';

import { colors } from '@/theme/tokens';

import { DotGrid } from './DotGrid';

/**
 * Scrolling page under a native large-title header. Content keeps a readable width on iPad
 * (`wide` for dashboards that lay cards out in columns).
 */
export function Screen({
  children,
  wide,
  contentContainerStyle,
  ref,
  ...rest
}: ScrollViewProps & { children: ReactNode; wide?: boolean; ref?: Ref<ScrollViewInstance> }) {
  return (
    <ScrollView
      ref={ref}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={styles.screen}
      contentContainerStyle={[styles.content, { maxWidth: wide ? 1180 : 760 }, contentContainerStyle]}
      {...rest}>
      <DotGrid />
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { width: '100%', alignSelf: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 14 },
});
