import { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors } from '@/theme/tokens';

/**
 * Carries on from the launch screen: the same icon gives a little hop, an aura ring blooms out,
 * and the app fades in underneath. Under a second; skipped with Reduce Motion.
 */
export function Intro({ start, onDone }: { start: boolean; onDone: () => void }) {
  const reduce = useReducedMotion();
  const icon = useSharedValue(1);
  const ring = useSharedValue(0);
  const fade = useSharedValue(1);

  // Starts once the launch screen hides (data loaded), so the two join up.
  useEffect(() => {
    if (!start) return;
    if (reduce) {
      onDone();
      return;
    }
    icon.value = withSequence(withTiming(0.88, { duration: 160 }), withSpring(1.08, { damping: 7, stiffness: 220 }));
    ring.value = withDelay(180, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }));
    fade.value = withDelay(
      620,
      withTiming(0, { duration: 320 }, (ok) => {
        if (ok) scheduleOnRN(onDone);
      }),
    );
  }, [start, reduce, icon, ring, fade, onDone]);

  const whole = useAnimatedStyle(() => ({ opacity: fade.value }));
  const iconSt = useAnimatedStyle(() => ({ transform: [{ scale: icon.value * (1 + 0.25 * (1 - fade.value)) }] }));
  const ringSt = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - ring.value),
    transform: [{ scale: 0.6 + ring.value * 2.2 }],
  }));

  if (reduce) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.wrap, whole]} pointerEvents="none">
      <Animated.View style={[styles.ring, ringSt]} />
      <Animated.View style={iconSt}>
        <Image source={require('@/assets/images/splash-icon.png')} style={styles.icon} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  icon: { width: 120, height: 120 },
  ring: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 18, borderColor: '#F48BBD' },
});
