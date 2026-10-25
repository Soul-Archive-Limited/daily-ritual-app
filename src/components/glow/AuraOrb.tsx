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
import { font, usePalette } from '@/theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Soft blob: a colour that fades to nothing at its edge. */
function Blob({ id, color, cx, cy, r, o = 1 }: { id: string; color: string; cx: number; cy: number; r: number; o?: number }) {
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

/**
 * The aura: a soft glow of the day's colours that breathes slowly, with a thin ring for today's progress
 * and the percentage in big thin type. The signature of Today.
 */
export function AuraOrb({ p, size = 210, label = 'Today’s glow' }: { p: number; size?: number; label?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduce = useReducedMotion();
  const pal = usePalette();
  const breathe = useSharedValue(0);
  const prog = useSharedValue(reduce ? p : 0);

  useEffect(() => {
    if (reduce) return;
    breathe.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduce, breathe]);

  useEffect(() => {
    prog.value = reduce ? p : withTiming(p, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [p, reduce, prog]);

  const R = 96;
  const C = 2 * Math.PI * R;
  const ring = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - Math.min(1, prog.value)) }));
  const glow = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.05 * breathe.value }],
    opacity: 0.9 + 0.1 * breathe.value,
  }));

  return (
    <View
      style={{ width: size, height: size, alignSelf: 'center' }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}>
      <Animated.View style={[StyleSheet.absoluteFill, glow]}>
        <Svg viewBox="0 0 200 200" width={size} height={size}>
          <Blob id={`aBase${uid}`} color="#F7C3D8" cx={100} cy={100} r={86} />
          <Blob id={`aPeach${uid}`} color="#FFCFA6" cx={74} cy={72} r={62} />
          <Blob id={`aRose${uid}`} color="#F59AC4" cx={132} cy={82} r={60} />
          <Blob id={`aLilac${uid}`} color="#B0A0FF" cx={100} cy={140} r={64} />
          <Blob id={`aShine${uid}`} color="#FFFFFF" cx={78} cy={64} r={30} o={0.55} />
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
  num: { ...font.thin, fontSize: 62, lineHeight: 66, letterSpacing: -2.5, color: '#121214', fontVariant: ['tabular-nums'] },
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

