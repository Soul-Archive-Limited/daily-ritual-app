import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/bits';
import { AURA, DEW, font } from '@/theme/tokens';

type SV = SharedValue<number>;

/** Drag the knob; past 82% of the track it confirms, otherwise it springs back. */
function makeResponder(x: SV, max: SV, latest: RefObject<() => void>) {
  const back = () => x.set(withSpring(0, { damping: 16, stiffness: 220 }));
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => x.set(Math.max(0, Math.min(max.get(), g.dx))),
    onPanResponderRelease: () => {
      const m = max.get();
      if (m > 0 && x.get() > m * 0.82) {
        x.set(
          withSequence(
            withTiming(m, { duration: 90 }),
            withTiming(m, { duration: 260 }),
            withTiming(0, { duration: 260 }),
          ),
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        latest.current();
      } else {
        if (x.get() > 8) Haptics.selectionAsync();
        back();
      }
    },
    onPanResponderTerminate: back,
  });
}

const H = 62;
const KNOB = 52;
const PAD = 5;

/**
 * Slide the glossy knob to the end to confirm. VoiceOver users double-tap it instead.
 * `glass` is the frosted version used on top of aura art.
 */
export function SlideToConfirm({
  label,
  onConfirm,
  icon = 'checkmark',
  glass,
  style,
}: {
  label: string;
  onConfirm: () => void;
  icon?: 'checkmark' | 'arrow.right';
  glass?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const x = useSharedValue(0);
  const max = useSharedValue(0);
  const latest = useRef(onConfirm);
  useLayoutEffect(() => {
    latest.current = onConfirm;
  });

  // PanResponder rather than a gesture-handler gesture: it claims horizontal drags inside the page's ScrollView.
  // makeResponder only reads `latest` inside touch handlers, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => makeResponder(x, max, latest));

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const text = useAnimatedStyle(() => ({
    opacity: max.value ? interpolate(x.value, [0, max.value * 0.6], [1, 0], 'clamp') : 1,
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    max.set(Math.max(0, e.nativeEvent.layout.width - KNOB - PAD * 2));
  };

  return (
    <View
      onLayout={onLayout}
      style={[styles.track, glass && styles.glass, style]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label.replace(/^Slide to /, '')}
      accessibilityHint="Double-tap to confirm"
      accessibilityActions={[{ name: 'activate', label: label.replace(/^Slide to /, '') }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'activate' && latest.current()}>
      {glass ? null : (
        <LinearGradient colors={AURA} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      )}
      <Animated.View style={[styles.labelWrap, text]} pointerEvents="none">
        <Text style={styles.label}>
          {label} <Text style={styles.chev}>›››</Text>
        </Text>
      </Animated.View>
      <Animated.View style={[styles.knob, knob]} hitSlop={10} {...pan.panHandlers}>
        <LinearGradient colors={DEW} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.knobFill} />
        <View style={styles.knobShine} />
        <Icon name={icon} size={20} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: H,
    borderRadius: H / 2,
    overflow: 'hidden',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  glass: {
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  labelWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: KNOB,
  },
  label: { ...font.semibold, fontSize: 16, color: '#FFFFFF', letterSpacing: 0.1 },
  chev: { opacity: 0.8 },
  knob: {
    position: 'absolute',
    left: PAD,
    top: PAD,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 18px -6px rgba(30,90,60,0.6)',
  },
  knobFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  knobShine: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: 1.2,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
});
