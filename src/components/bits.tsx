import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, Text, View, type ColorValue, type StyleProp, type TextStyle } from 'react-native';
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { colors, font } from '@/theme/tokens';

export function Icon({ name, size = 18, color = colors.text }: { name: SFSymbol; size?: number; color?: ColorValue }) {
  return <SymbolView name={name} size={size} tintColor={color} weight="medium" style={{ width: size, height: size }} />;
}

/** Square icon tile used in card headers (web .ic). */
export function IconTile({ name, color }: { name: SFSymbol; color: ColorValue }) {
  return (
    <View style={styles.tile}>
      <Icon name={name} size={19} color={color} />
    </View>
  );
}

export function MiniRing({ p, color = colors.sage, size = 58 }: { p: number; color?: ColorValue; size?: number }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="image"
      accessibilityLabel={`${Math.round(p * 100)}% done`}>
      <Svg viewBox="0 0 58 58" width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={29} cy={29} r={r} fill="none" stroke={colors.grid} strokeWidth={5} />
        {p > 0 ? (
          <Circle
            cx={29}
            cy={29}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={`${(c * p).toFixed(1)} ${c.toFixed(1)}`}
          />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <CountUp value={Math.round(p * 100)} suffix="%" style={styles.ringText} />
      </View>
    </View>
  );
}

/** Number that counts up when it first appears (≤400 ms). Later changes show instantly. Respects Reduce Motion. */
export function CountUp({
  value,
  suffix = '',
  style,
}: {
  value: number;
  suffix?: string;
  style?: StyleProp<TextStyle>;
}) {
  const reduce = useReducedMotion();
  const [first] = useState(value);
  const [shown, setShown] = useState<number | null>(reduce ? null : 0);
  useEffect(() => {
    if (reduce) return;
    const t0 = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - t0) / 380);
      setShown(t >= 1 ? null : Math.round(first * (1 - Math.pow(1 - t, 3))));
      if (t >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [first, reduce]);
  return (
    <Text style={style}>
      {shown ?? value}
      {suffix}
    </Text>
  );
}

/** Thin progress bar (web .mb). */
export function Bar({ p, color, height = 3 }: { p: number; color: ColorValue; height?: number }) {
  return (
    <View style={[styles.bar, { height, borderRadius: height }]}>
      <View
        style={{
          width: `${Math.round(Math.min(1, p) * 100)}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: height,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  ringText: { ...font.semibold, fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] },
  bar: { backgroundColor: colors.line2, overflow: 'hidden', width: '100%' },
});
