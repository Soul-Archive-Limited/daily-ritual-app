import type { ColorValue } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/bits';
import { useStore } from '@/data/store';
import type { DayStep } from '@/logic/scoring';
import { XP } from '@/logic/rewards';
import { colors, DEW, font, minTouch } from '@/theme/tokens';

type Props = {
  k: string;
  step: DayStep;
  doneAt?: number;
  tz: string | null;
  skipped?: boolean;
  optional?: boolean;
  future?: boolean;
  accent: ColorValue;
  /** % left when the product is running low (≤20%) */
  lowPct?: number;
};

/** Full-row tap to tick. Undone steps get a Skip button; skipped ones get Undo. */
export function StepRow({ k, step, doneAt, tz, skipped, optional, future, accent, lowPct }: Props) {
  const s = useStore()!;
  const done = !!doneAt;
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const fill = useSharedValue(done ? 1 : 0);
  const float = useSharedValue(0);

  useEffect(() => {
    fill.set(withTiming(done ? 1 : 0, { duration: reduce ? 0 : 250 }));
  }, [done, fill, reduce]);

  const ck = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const mark = useAnimatedStyle(() => ({ opacity: fill.value, transform: [{ scale: 0.4 + 0.6 * fill.value }] }));
  // "+10 XP" rises and fades from the tick.
  const xp = useAnimatedStyle(() => ({
    opacity: float.value > 0 && float.value < 1 ? 1 - float.value : 0,
    transform: [{ translateY: -22 * float.value }],
  }));

  const time =
    typeof doneAt === 'number'
      ? new Date(doneAt).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          ...(tz ? { timeZone: tz } : {}),
        })
      : '';

  const onTick = () => {
    if (!done && !reduce) {
      scale.set(withSequence(withTiming(1.25, { duration: 140 }), withTiming(1, { duration: 200 })));
      float.set(0.001);
      float.set(withTiming(1, { duration: 700 }));
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    s.tick(k, step.id);
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onTick}
        disabled={future}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done, disabled: future }}
        accessibilityLabel={`${step.name}${step.product ? `, ${step.product}` : ''}${skipped ? ', skipped' : ''}`}
        style={({ pressed }) => [styles.step, pressed && { backgroundColor: colors.fill }]}>
        <Animated.View
          style={[
            styles.ck,
            optional && { borderStyle: 'dashed' },
            skipped && { borderStyle: 'dotted', opacity: 0.6 },
            done && { borderWidth: 0, boxShadow: '0 6px 14px -6px rgba(46,158,102,0.7)' },
            ck,
          ]}>
          <Animated.View style={[styles.ckFill, mark]}>
            <LinearGradient colors={DEW} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.ckFill} />
            <Icon name="checkmark" size={14} color="#FFFFFF" />
          </Animated.View>
          <Animated.Text style={[styles.xp, xp]} pointerEvents="none">
            +{XP.step}
          </Animated.Text>
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, done && { color: colors.muted }, skipped && styles.struck]}>{step.name}</Text>
          {step.product ? (
            <Text style={styles.product}>
              {step.product}
              {lowPct != null ? <Text style={{ color: colors.gold }}> · {lowPct}% left</Text> : null}
            </Text>
          ) : null}
          {step.note && !done && !skipped ? <Text style={styles.note}>{step.note}</Text> : null}
        </View>
        <Text style={styles.time}>{skipped ? 'skipped' : time}</Text>
      </Pressable>
      {!future && !done && !optional ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${skipped ? 'Bring back' : 'Skip'} ${step.name} for this day`}
          onPress={() => {
            Haptics.selectionAsync();
            if (skipped) s.unskip(k, step.id);
            else s.skip(k, step.id);
          }}
          style={({ pressed }) => [styles.skip, pressed && { opacity: 0.6 }]}>
          <Text style={styles.skipText}>{skipped ? 'Undo' : 'Skip'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  step: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderRadius: 18,
    minHeight: minTouch + 6,
  },
  ck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ckFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xp: { ...font.bold, position: 'absolute', top: -14, fontSize: 12, color: colors.rose, width: 40, textAlign: 'center' },
  name: { ...font.semibold, fontSize: 16, lineHeight: 21, color: colors.text },
  struck: { textDecorationLine: 'line-through', color: colors.dim },
  product: { ...font.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  note: { ...font.regular, fontSize: 12.5, lineHeight: 17, color: colors.dim, marginTop: 2 },
  time: { ...font.mono, fontSize: 11, color: colors.dim },
  skip: {
    minHeight: minTouch,
    minWidth: minTouch,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: { ...font.semibold, fontSize: 12, color: colors.muted },
});
