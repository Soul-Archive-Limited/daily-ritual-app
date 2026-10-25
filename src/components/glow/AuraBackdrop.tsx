import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

function Glow({ color, cx, cy, r, drift, i }: { color: string; cx: number; cy: number; r: number; drift: number; i: number }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withTiming(1, { duration: 7000 + i * 1300, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduce, t, i]);
  const st = useAnimatedStyle(() => ({
    transform: [{ translateX: drift * (t.value - 0.5) }, { translateY: drift * 0.6 * (0.5 - t.value) }],
  }));
  return (
    // The canvas overhangs the screen by the drift, so its edge never slides into view.
    <Animated.View style={[{ position: 'absolute', top: -drift, left: -drift, right: -drift, bottom: -drift }, st]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={`g${i}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="0.6" stopColor={color} stopOpacity={0.55} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={cx + drift} cy={cy + drift} r={r} fill={`url(#g${i})`} />
      </Svg>
    </Animated.View>
  );
}

/** Full-bleed living aura: soft peach, rose and lilac light drifting slowly. Used behind onboarding. */
export function AuraBackdrop() {
  const { width: w, height: h } = useWindowDimensions();
  const m = Math.max(w, h);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={['#F9D3DF', '#F4C7E0', '#D9CCFB']} style={StyleSheet.absoluteFill} />
      <Glow i={0} color="#FFC49A" cx={w * 0.22} cy={h * 0.26} r={m * 0.42} drift={40} />
      <Glow i={1} color="#F48BBD" cx={w * 0.82} cy={h * 0.36} r={m * 0.44} drift={50} />
      <Glow i={2} color="#A995FB" cx={w * 0.5} cy={h * 0.84} r={m * 0.5} drift={36} />
      <LinearGradient
        colors={['rgba(40,20,60,0)', 'rgba(40,20,60,0.28)']}
        start={{ x: 0, y: 0.45 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
