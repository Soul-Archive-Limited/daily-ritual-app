import * as Haptics from 'expo-haptics';
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Icon } from '@/components/bits';
import { Card } from '@/components/ui';
import { useStore } from '@/data/store';
import type { DayStep } from '@/logic/scoring';
import { colors, font } from '@/theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export const litres = (ml: number) => `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1).replace(/\.0$/, '')}`;

/* ---------- The body ---------- */

const W = 120;
const H = 240;

/** Smooth closed curve through points (Catmull-Rom to Bézier). */
function smooth(pts: [number, number][]) {
  const n = pts.length;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return `${d}Z`;
}

// Right half of a standing figure, top of the neck down to the crotch; mirrored for the left.
const HALF: [number, number][] = [
  [65, 50],
  [67, 58],
  [84, 63],
  [94, 74],
  [98, 108],
  [100, 140],
  [96, 150],
  [90, 140],
  [87, 108],
  [83, 86],
  [80, 116],
  [84, 142],
  [81, 186],
  [78, 222],
  [80, 232],
  [66, 234],
  [65, 222],
  [66, 186],
  [61, 154],
];
const BODY = smooth([
  ...HALF,
  ...[...HALF]
    .reverse()
    .slice(1, -1)
    .map(([x, y]) => [W - x, y] as [number, number]),
]);
const HEAD = 'M60 6a21 23 0 1 0 0.01 0Z';

/** Red → amber → green as the Health routine fills, like a battery. */
function healthTint(f: number) {
  if (f >= 1) return { a: '#8BE3AE', b: '#46B37A', word: 'Glowing' };
  if (f >= 0.5) return { a: '#FFE08A', b: '#E5B23F', word: 'Getting there' };
  return { a: '#FFC1B5', b: '#F07F6E', word: 'Thirsty' };
}

/** A wave along the water line, as an SVG path (runs on the UI thread). */
function wavePath(level: number, phase: number, shift: number, amp: number) {
  'worklet';
  const y = 8 + (1 - level) * (H - 8);
  const t = phase * Math.PI * 2 + shift;
  let d = `M0 ${H}L0 ${y.toFixed(1)}`;
  for (let x = 0; x <= W; x += 6) d += `L${x} ${(y + Math.sin(x / 14 + t) * amp).toFixed(1)}`;
  return `${d}L${W} ${H}Z`;
}

/** Two drifting waves at the water line. */
function Waves({ level, phase }: { level: SharedValue<number>; phase: SharedValue<number> }) {
  const back = useAnimatedProps(() => ({ d: wavePath(level.value, phase.value, 1.6, 3.5) }));
  const front = useAnimatedProps(() => ({ d: wavePath(level.value, phase.value, 0, 4.5) }));
  return (
    <>
      <AnimatedPath animatedProps={back} fill="#7FD3EA" opacity={0.55} />
      <AnimatedPath animatedProps={front} fill="url(#water)" />
    </>
  );
}

function Body({ p, health, onTap }: { p: number; health: number; onTap: () => void }) {
  const reduce = useReducedMotion();
  const level = useSharedValue(p);
  const phase = useSharedValue(0);
  const squish = useSharedValue(1);
  const tint = healthTint(health);

  useEffect(() => {
    level.value = withTiming(p, { duration: reduce ? 0 : 1100, easing: Easing.out(Easing.cubic) });
  }, [p, reduce, level]);
  useEffect(() => {
    if (reduce) return;
    phase.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1, false);
  }, [reduce, phase]);

  const press = useAnimatedStyle(() => ({ transform: [{ scale: squish.value }] }));

  return (
    <Pressable
      onPress={() => {
        if (!reduce) squish.set(withSequence(withTiming(0.94, { duration: 90 }), withSpring(1, { damping: 8 })));
        onTap();
      }}
      accessibilityRole="button"
      accessibilityLabel="Add a glass of water, 250 ml"
      hitSlop={6}>
      <Animated.View style={press}>
        <Svg width={W * 0.78} height={H * 0.78} viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            <ClipPath id="body">
              <Path d={BODY} />
              <Path d={HEAD} />
            </ClipPath>
            <LinearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tint.a} stopOpacity={0.55} />
              <Stop offset="1" stopColor={tint.b} stopOpacity={0.55} />
            </LinearGradient>
            <LinearGradient id="water" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#8FE3F5" />
              <Stop offset="1" stopColor="#2F8FD0" />
            </LinearGradient>
          </Defs>
          <G clipPath="url(#body)">
            <Rect width={W} height={H} fill="url(#skin)" />
            <Waves level={level} phase={phase} />
            <Rect x={14} y={10} width={10} height={H} fill="#fff" opacity={0.18} />
          </G>
          <Path d={BODY} fill="none" stroke={tint.b} strokeWidth={2} />
          <Path d={HEAD} fill="none" stroke={tint.b} strokeWidth={2} />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

/* ---------- Slider ---------- */

type Latest = {
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (v: number) => void;
  onEnd: (v: number) => void;
};

function makeSlider(
  width: SharedValue<number>,
  x: SharedValue<number>,
  last: SharedValue<number>,
  latest: RefObject<Latest>,
) {
  const move = (px: number) => {
    const { max, step, onChange } = latest.current;
    const w = width.get() || 1;
    const v = Math.round((Math.max(0, Math.min(1, px / w)) * max) / step) * step;
    x.set((v / max) * w);
    if (v !== last.get()) {
      last.set(v);
      onChange(v);
      if (v % 500 === 0) Haptics.selectionAsync();
    }
  };
  return PanResponder.create({
    onStartShouldSetPanResponder: () => !latest.current.disabled,
    onMoveShouldSetPanResponderCapture: (_, g) => !latest.current.disabled && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => move(e.nativeEvent.locationX),
    onPanResponderMove: (e) => move(e.nativeEvent.locationX),
    onPanResponderRelease: () => latest.current.onEnd(last.get()),
    onPanResponderTerminate: () => latest.current.onEnd(last.get()),
  });
}

/** Drag or tap the track; snaps to `step`. */
function Slider(props: Latest & { value: number }) {
  const { value, max, step } = props;
  const width = useSharedValue(0);
  const x = useSharedValue(0);
  const last = useSharedValue(value);
  const latest = useRef<Latest>(props);
  useLayoutEffect(() => {
    latest.current = props;
  });
  useEffect(() => {
    if (width.get()) x.set((value / max) * width.get());
    last.set(value);
  }, [value, max, width, x, last]);

  // makeSlider only reads `latest` inside touch handlers, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => makeSlider(width, x, last, latest));

  const onLayout = (e: LayoutChangeEvent) => {
    width.set(e.nativeEvent.layout.width);
    x.set((value / max) * e.nativeEvent.layout.width);
  };
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - 13 }] }));
  const track = useAnimatedStyle(() => ({ width: x.value }));

  return (
    <View
      style={styles.slider}
      onLayout={onLayout}
      {...pan.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Water drunk today"
      accessibilityValue={{ text: `${litres(value)} litres` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) =>
        props.onEnd(Math.max(0, Math.min(max, value + (e.nativeEvent.actionName === 'increment' ? step : -step))))
      }>
      <View style={styles.rail} pointerEvents="none">
        <Animated.View style={[styles.railOn, track]} />
      </View>
      <Animated.View style={[styles.thumb, thumb, props.disabled && { opacity: 0.4 }]} pointerEvents="none" />
    </View>
  );
}

function Chip({
  label,
  onPress,
  disabled,
  a11y,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  a11y?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y ?? `Add ${label.replace('+', '')}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        pressed && { transform: [{ scale: 0.95 }], backgroundColor: colors.healthSoft },
        disabled && { opacity: 0.35 },
      ]}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

/**
 * Water as a body that fills from the feet up, with moving water. Tap the body for a glass (250 ml).
 * Its colour shows the whole Health routine: red, then amber, then green when everything is done.
 */
export function Water({
  k,
  step,
  ml,
  future,
  health,
}: {
  k: string;
  step: DayStep;
  ml: number;
  future?: boolean;
  /** 0..1 of the Health routine done (water counts in part) */
  health: number;
}) {
  const s = useStore()!;
  const goal = step.goal || 3000;
  const [draft, setDraft] = useState<number | null>(null);
  const shown = draft ?? ml;
  const p = Math.min(1, shown / goal);
  const tint = healthTint(health);

  const add = (n: number) => {
    if (future) return;
    Haptics.impactAsync(n > 0 ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Soft);
    s.setWater(k, ml + n);
  };

  return (
    <Card>
      <View style={styles.top}>
        <Body p={p} health={health} onTap={() => add(250)} />
        <View style={{ flex: 1 }}>
          <View style={styles.title}>
            <Icon name="drop.fill" size={15} color={colors.health} />
            <Text style={styles.name}>{step.name}</Text>
          </View>
          <Text style={styles.big} accessibilityLabel={`${litres(shown)} litres of ${litres(goal)}`}>
            {litres(shown)}
            <Text style={styles.unit}> of {litres(goal)} L</Text>
          </Text>
          <View style={[styles.state, { backgroundColor: `${tint.b}22` }]}>
            <View style={[styles.dot, { backgroundColor: tint.b }]} />
            <Text style={styles.stateText}>
              {tint.word} · Health {Math.round(health * 100)}%
            </Text>
          </View>
          <View style={styles.chips}>
            {(
              [
                [200, '+200 ml'],
                [500, '+500 ml'],
                [1000, '+1 L'],
              ] as const
            ).map(([n, label]) => (
              <Chip key={n} label={label} disabled={future} onPress={() => add(n)} />
            ))}
            <Chip label="−200" a11y="Remove 200 ml" disabled={future || !ml} onPress={() => add(-200)} />
          </View>
          <Text style={styles.hint}>Tap the body for a glass</Text>
        </View>
      </View>
      <Slider
        value={Math.min(shown, goal)}
        max={goal}
        step={100}
        disabled={future}
        onChange={setDraft}
        onEnd={(v) => {
          setDraft(null);
          s.setWater(k, v);
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  title: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  name: { ...font.semibold, fontSize: 16, color: colors.text },
  big: { ...font.thin, fontSize: 46, lineHeight: 52, color: colors.text, marginTop: 2, letterSpacing: -1.5 },
  unit: { ...font.medium, fontSize: 16, color: colors.muted, letterSpacing: 0 },
  state: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  stateText: { ...font.semibold, fontSize: 12, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
  },
  chipText: { ...font.semibold, fontSize: 13, color: colors.text },
  hint: { ...font.regular, fontSize: 11.5, color: colors.dim, marginTop: 8 },
  slider: { height: 44, justifyContent: 'center', marginTop: 10 },
  rail: { height: 6, borderRadius: 3, backgroundColor: colors.fill, overflow: 'hidden' },
  railOn: { height: '100%', backgroundColor: colors.health, borderRadius: 3 },
  thumb: {
    position: 'absolute',
    left: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.card,
    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
  },
});
