import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { onPhoto, radius } from '@/theme/tokens';

/**
 * Photo card under the large title (like Apple's Fitness and Journal). Text sits on a dark
 * fade at the bottom, so it reads the same in light and dark mode; use `onPhoto` colours inside.
 */
export function Hero({
  source,
  height = 260,
  children,
}: {
  source: ImageSource | number;
  height?: number;
  children?: ReactNode;
}) {
  return (
    <View style={[styles.card, { minHeight: height }]}>
      <Image
        source={source}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="top"
        transition={250}
        accessibilityIgnoresInvertColors
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.72)']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: onPhoto.chip,
    justifyContent: 'flex-end',
  },
  body: { padding: 18, gap: 8 },
});
