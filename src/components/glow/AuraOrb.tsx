import { useEffect, useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { CountUp } from '@/components/bits';
import type { OrbTheme } from '@/db/types';
import { font, usePalette } from '@/theme/tokens';

/** Orb colours: base, then three drifting lights. Unlocked by levels. */
export const ORB_THEMES: Record<OrbTheme, [string, string, string, string]> = {
  aura: ['#F6D3E2', '#FFD3B4', '#F4AACB', '#BDB0FF'],
  dawn: ['#FFE3D3', '#FFD0A0', '#FFB3A7', '#FFD9E8'],
  ocean: ['#D3EEF6', '#A6E2F0', '#8FB8FF', '#B8F0D8'],
  night: ['#D9D6FB', '#A9ABFF', '#8A8CF7', '#C9B3FF'],
  gold: ['#FFF0C8', '#FFE08A', '#F6C76A', '#FFD3B4'],
  pearl: ['#F1EFF6', '#FFFFFF', '#E9E3F7', '#F3E6EE'],
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Soft blob: a colour that fades to nothing at its edge. */
function Blob({
  id,
  color,
  cx,
  cy,
  r,
  o = 1,
}: {
  id: string;
  color: string;
  cx: number;
  cy: number;
  r: number;
  o?: number;
}) {
  return (
    <>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={o} />
          <Stop offset="0.55" stopColor={color} stopOpacity={o * 0.7} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
    </>
  );
}

/** One colour that slowly orbits the centre, each at its own pace and direction. */
function Orbit({
  id,
  color,
  cx,
  cy,
  r,
  o,
  secs,
  dir,
  size,
}: {
  id: string;
  color: string;
  cx: number;
  cy: number;
  r: number;
  o: number;
  secs: number;
  dir: 1 | -1;
  size: number;
}) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withTiming(1, { duration: secs * 1000, easing: Easing.linear }), -1, false);
  }, [reduce, t, secs]);
  const st = useAnimatedStyle(() => ({
    transform: [{ rotate: `${dir * t.value * 360}deg` }, { scale: 1 + 0.06 * Math.sin(t.value * Math.PI * 2) }],
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, st]}>
      <Svg viewBox="0 0 200 200" width={size} height={size}>
        <Blob id={id} color={color} cx={cx} cy={cy} r={r} o={o} />
      </Svg>
    </Animated.View>
  );
}

/**
 * The aura: soft peach, rose and lilac light that slowly swirls, glowing stronger as the day fills up,
 * with a thin ring for progress and the percentage in big thin type. The signature of Today.
 */
export function AuraOrb({
  p,
  size = 210,
  label = 'Today’s glow',
  theme = 'aura',
}: {
  p: number;
  size?: number;
  label?: string;
  theme?: OrbTheme;
}) {
  const [base, c1, c2, c3] = ORB_THEMES[theme] ?? ORB_THEMES.aura;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduce = useReducedMotion();
  const pal = usePalette();
  const breathe = useSharedValue(0);
  const prog = useSharedValue(reduce ? p : 0);

  useEffect(() => {
    if (reduce) return;
    breathe.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduce, breathe]);

  useEffect(() => {
    prog.value = reduce ? p : withTiming(p, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [p, reduce, prog]);

  const R = 96;
  const C = 2 * Math.PI * R;
  const ring = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - Math.min(1, prog.value)) }));
  // Pale in the morning, full glow by the end of the day.
  const glow = useAnimatedStyle(() => ({
    transform: [{ scale: 0.96 + 0.05 * breathe.value }],
    opacity: 0.72 + 0.28 * Math.min(1, prog.value) + 0.04 * breathe.value,
  }));

  return (
    <View
      style={{ width: size, height: size, alignSelf: 'center' }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}>
      <Animated.View style={[StyleSheet.absoluteFill, glow]}>
        <Svg viewBox="0 0 200 200" width={size} height={size} style={StyleSheet.absoluteFill}>
          <Blob id={`aBase${uid}`} color={base} cx={100} cy={100} r={88} />
        </Svg>
        <Orbit id={`aPeach${uid}`} color={c1} cx={70} cy={74} r={62} o={0.95} secs={14} dir={1} size={size} />
        <Orbit id={`aRose${uid}`} color={c2} cx={134} cy={88} r={60} o={0.9} secs={19} dir={-1} size={size} />
        <Orbit id={`aLilac${uid}`} color={c3} cx={100} cy={142} r={64} o={0.95} secs={23} dir={1} size={size} />
        <Svg viewBox="0 0 200 200" width={size} height={size} style={StyleSheet.absoluteFill}>
          <Blob id={`aShine${uid}`} color="#FFFFFF" cx={80} cy={66} r={30} o={0.5} />
        </Svg>
      </Animated.View>
      <Svg viewBox="0 0 200 200" width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={100} cy={100} r={R} fill="none" stroke={pal.line2} strokeWidth={1.5} />
        <AnimatedCircle
          cx={100}
          cy={100}
          r={R}
          fill="none"
          stroke={pal.text}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeDasharray={`${C} ${C}`}
          animatedProps={ring}
          transform="rotate(-90 100 100)"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <View style={styles.numRow}>
          <CountUp value={Math.round(p * 100)} style={styles.num} />
          <Text style={styles.pct}>%</Text>
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  numRow: { flexDirection: 'row', alignItems: 'flex-start' },
  num: {
    ...font.thin,
    fontSize: 62,
    lineHeight: 66,
    letterSpacing: -2.5,
    color: '#121214',
    fontVariant: ['tabular-nums'],
  },
  pct: { ...font.regular, fontSize: 20, marginTop: 8, color: 'rgba(18,18,20,0.6)' },
  label: {
    ...font.semibold,
    fontSize: 11.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: 'rgba(18,18,20,0.62)',
    marginTop: 2,
  },
});
