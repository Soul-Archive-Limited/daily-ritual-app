import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/bits';
import { useStore } from '@/data/store';
import type { DayStep } from '@/logic/scoring';
import { colors, font, radius } from '@/theme/tokens';

export const litres = (ml: number) => `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1).replace(/\.0$/, '')}`;

/** "1.4 L of 3 L", a bottle that fills, quick-add chips and a 100 ml slider. */
export function Water({ k, step, ml, future }: { k: string; step: DayStep; ml: number; future?: boolean }) {
  const s = useStore()!;
  const goal = step.goal || 3000;
  const [draft, setDraft] = useState<number | null>(null);
  const shown = draft ?? ml;
  const p = Math.min(1, shown / goal);
  const reduce = useReducedMotion();

  const level = useSharedValue(p);
  useEffect(() => {
    level.set(withTiming(p, { duration: reduce ? 0 : 400 }));
  }, [p, level, reduce]);
  // Scale a full-size fill from the bottom: a percentage height inside a stretched box breaks layout.
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: level.value }] }));

  const add = (n: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    s.setWater(k, ml + n);
  };

  const chips: [number, string][] = [
    [200, '+200 ml'],
    [500, '+500 ml'],
    [1000, '+1 L'],
  ];

  return (
    <View style={styles.box}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <View style={styles.title}>
            <Icon name="drop.fill" size={16} color={colors.health} />
            <Text style={styles.name}>{step.name}</Text>
          </View>
          <Text style={styles.big} accessibilityLabel={`${litres(shown)} litres of ${litres(goal)}`}>
            {litres(shown)}
            <Text style={styles.unit}> L of {litres(goal)} L</Text>
          </Text>
          <View style={styles.chips}>
            {chips.map(([n, label]) => (
              <Chip key={n} label={label} disabled={future} onPress={() => add(n)} />
            ))}
            <Chip label="−200" a11y="Remove 200 ml" disabled={future || !ml} onPress={() => add(-200)} />
          </View>
        </View>
        <View style={styles.bottle} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Animated.View style={[styles.fill, fillStyle]} />
          <View style={StyleSheet.absoluteFill}>
            <Text style={styles.lvl}>{Math.round(p * 100)}%</Text>
          </View>
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

/** Minimal slider: drag or tap the track. Snaps to `step`. */
function Slider({
  value,
  max,
  step,
  disabled,
  onChange,
  onEnd,
}: {
  value: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (v: number) => void;
  onEnd: (v: number) => void;
}) {
  const width = useSharedValue(0);
  const x = useSharedValue(0);
  const last = useSharedValue(value);

  useEffect(() => {
    if (width.get()) x.set((value / max) * width.get());
    last.set(value);
  }, [value, max, width, x, last]);

  const onLayout = (e: LayoutChangeEvent) => {
    width.set(e.nativeEvent.layout.width);
    x.set((value / max) * e.nativeEvent.layout.width);
  };

  const snap = (px: number) => {
    const w = width.get() || 1;
    const raw = Math.max(0, Math.min(1, px / w)) * max;
    return Math.round(raw / step) * step;
  };

  const move = (px: number) => {
    const v = snap(px);
    x.set((v / max) * width.get());
    if (v !== last.get()) {
      last.set(v);
      onChange(v);
      if (v % 500 === 0) Haptics.selectionAsync();
    }
  };

  // Callbacks run on the JS thread: each move updates the litres shown above.
  const pan = usePanGesture({
    runOnJS: true,
    enabled: !disabled,
    minDistance: 0,
    onBegin: (e) => move(e.x),
    onUpdate: (e) => move(e.x),
    onFinalize: () => onEnd(last.get()),
  });

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - 13 }] }));
  const track = useAnimatedStyle(() => ({ width: x.value }));

  return (
    <GestureDetector gesture={pan}>
      <View
        style={styles.slider}
        onLayout={onLayout}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Water drunk today"
        accessibilityValue={{ text: `${litres(value)} litres` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const v = Math.max(0, Math.min(max, value + (e.nativeEvent.actionName === 'increment' ? step : -step)));
          onEnd(v);
        }}>
        <View style={styles.rail}>
          <Animated.View style={[styles.railOn, track]} />
        </View>
        <Animated.View style={[styles.thumb, thumb, disabled && { opacity: 0.4 }]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  box: { padding: 14, borderRadius: 20, backgroundColor: colors.fill, marginBottom: 10, gap: 6 },
  top: { flexDirection: 'row', gap: 14 },
  title: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { ...font.semibold, fontSize: 15, color: colors.text },
  big: { ...font.light, fontSize: 44, lineHeight: 50, color: colors.text, marginTop: 6, letterSpacing: -1 },
  unit: { ...font.medium, fontSize: 17, color: colors.muted, letterSpacing: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.card2,
  },
  chipText: { ...font.semibold, fontSize: 13, color: colors.text },
  bottle: {
    width: 74,
    minHeight: 124,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.line2,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,.25)',
    justifyContent: 'flex-end',
  },
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    transformOrigin: 'bottom',
    backgroundColor: colors.health,
  },
  lvl: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 120,
    ...font.bold,
    fontSize: 12,
    color: colors.text,
    textShadowColor: 'rgba(0,0,0,.5)',
    textShadowRadius: 4,
  },
  slider: { height: 44, justifyContent: 'center', marginTop: 4 },
  rail: { height: 6, borderRadius: 3, backgroundColor: colors.line2, overflow: 'hidden' },
  railOn: { height: '100%', backgroundColor: colors.health },
  thumb: {
    position: 'absolute',
    left: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.text,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});
