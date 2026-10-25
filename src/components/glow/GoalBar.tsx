import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { AURA, colors } from '@/theme/tokens';

/** A rounded bar filled with the aura gradient, animating to its value. */
export function GoalBar({ p, height = 8 }: { p: number; height?: number }) {
  const reduce = useReducedMotion();
  const v = useSharedValue(reduce ? p : 0);
  useEffect(() => {
    v.value = reduce ? p : withTiming(p, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [p, reduce, v]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.round(Math.min(1, v.value) * 100)}%` }));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <Animated.View style={[styles.fill, { borderRadius: height / 2 }, fill]}>
        <LinearGradient colors={AURA} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flex: 1, backgroundColor: colors.fill, overflow: 'hidden' },
  fill: { height: '100%', overflow: 'hidden' },
});
