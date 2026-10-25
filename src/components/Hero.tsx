import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { radius } from '@/theme/tokens';

const GLOWS: [string, number, number, number][] = [
  ['#FFC49A', 0.18, 0.2, 0.55],
  ['#F48BBD', 0.85, 0.3, 0.6],
  ['#A995FB', 0.5, 1.0, 0.75],
];

/**
 * Aura card under the large title: soft peach, rose and lilac light with a gentle dark fade at the
 * bottom, so white text reads the same in light and dark mode. Use `onPhoto` colours inside.
 */
export function Hero({ height = 260, children }: { height?: number; children?: ReactNode }) {
  return (
    <View style={[styles.card, { minHeight: height }]}>
      <LinearGradient colors={['#F9D3DF', '#F1C2DD', '#CFC2FA']} style={StyleSheet.absoluteFill} />
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          {GLOWS.map(([c], i) => (
            <RadialGradient key={i} id={`h${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={c} stopOpacity={1} />
              <Stop offset="0.6" stopColor={c} stopOpacity={0.5} />
              <Stop offset="1" stopColor={c} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {GLOWS.map(([, x, y, r], i) => (
          <Circle key={i} cx={x * 100} cy={y * 100} r={r * 100} fill={`url(#h${i})`} />
        ))}
      </Svg>
      <LinearGradient
        colors={['rgba(40,20,60,0)', 'rgba(40,20,60,0.12)', 'rgba(40,20,60,0.42)']}
        locations={[0, 0.4, 1]}
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
    justifyContent: 'flex-end',
    boxShadow: '0 18px 40px -26px rgba(120,60,160,0.45)',
  },
  body: { padding: 18, gap: 8 },
});
