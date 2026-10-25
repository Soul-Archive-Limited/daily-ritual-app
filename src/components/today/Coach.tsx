import * as Haptics from 'expo-haptics';
import { useEffect, useState, type RefObject } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type HostInstance,
  type ScrollViewInstance,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { SlideToConfirm } from '@/components/glow/SlideToConfirm';
import { Lune, type LuneMood } from '@/components/Lune';
import { colors, font } from '@/theme/tokens';

export type CoachStep = {
  target: RefObject<HostInstance | null>;
  title: string;
  text: string;
  mood?: LuneMood;
  /** Practise the slide control right in the tip */
  practice?: boolean;
  /** Circular highlight (the orb) */
  round?: boolean;
};

type Rect = { x: number; y: number; w: number; h: number };

const PAD = 8;
const R = 30;

/** A dark veil with a rounded hole around the highlighted part of the screen. */
function Veil({ r, W, H, round }: { r: Rect; W: number; H: number; round?: boolean }) {
  const x = r.x - PAD;
  const y = r.y - PAD;
  const w = r.w + PAD * 2;
  const h = r.h + PAD * 2;
  const k = round ? Math.min(w, h) / 2 : Math.min(R, w / 2, h / 2);
  const hole = `M${x + k} ${y}H${x + w - k}Q${x + w} ${y} ${x + w} ${y + k}V${y + h - k}Q${x + w} ${y + h} ${x + w - k} ${y + h}H${x + k}Q${x} ${y + h} ${x} ${y + h - k}V${y + k}Q${x} ${y} ${x + k} ${y}Z`;
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={`M0 0H${W}V${H}H0Z ${hole}`} fill="rgba(12,12,16,0.62)" fillRule="evenodd" />
      <Path d={hole} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={2} />
    </Svg>
  );
}

/**
 * First-run tour over Today: scrolls each part into view, lights it up, and Lune explains it.
 * One step lets you practise the slide. Skip any time.
 */
export function Coach({
  steps,
  scroll,
  scrollY,
  onDone,
}: {
  steps: CoachStep[];
  scroll: RefObject<ScrollViewInstance | null>;
  scrollY: RefObject<number>;
  onDone: () => void;
}) {
  const { width: W, height: H } = useWindowDimensions();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[i];

  useEffect(() => {
    let alive = true;
    const t1 = setTimeout(() => {
      step.target.current?.measureInWindow((x, y, w, h) => {
        if (!alive) return;
        const want = Math.max(90, Math.min(H * 0.3, H - h - 300));
        scroll.current?.scrollTo({ y: Math.max(0, (scrollY.current ?? 0) + y - want), animated: true });
        setTimeout(() => {
          step.target.current?.measureInWindow((x2, y2, w2, h2) => alive && setRect({ x: x2, y: y2, w: w2, h: h2 }));
        }, 420);
      });
    }, 60);
    return () => {
      alive = false;
      clearTimeout(t1);
    };
  }, [i, step, scroll, scrollY, H]);

  const next = () => {
    Haptics.selectionAsync();
    setRect(null);
    if (i < steps.length - 1) setI(i + 1);
    else onDone();
  };

  const below = rect ? rect.y + rect.h + PAD + 16 : 0;
  const tipBelow = rect ? below + 250 < H : true;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onDone} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        {rect ? <Veil r={rect} W={W} H={H} round={step.round} /> : <View style={[StyleSheet.absoluteFill, styles.dim]} />}
        {rect ? (
          <Animated.View
            key={i}
            entering={FadeInDown.duration(300)}
            style={[
              styles.tip,
              tipBelow ? { top: below } : { bottom: H - rect.y + PAD + 16 },
              { left: 16, right: 16, maxWidth: 520, alignSelf: 'center' },
            ]}
            accessibilityViewIsModal>
            <View style={styles.row}>
              <Lune mood={step.mood ?? 'happy'} size={52} still />
              <View style={{ flex: 1 }}>
                <Text style={styles.title} accessibilityRole="header">
                  {step.title}
                </Text>
                <Text style={styles.text}>{step.text}</Text>
              </View>
            </View>
            {step.practice ? <SlideToConfirm label="Try it: slide" onConfirm={next} style={{ marginTop: 12 }} /> : null}
            <View style={styles.foot}>
              <Pressable onPress={onDone} accessibilityRole="button" hitSlop={10}>
                <Text style={styles.skip}>Skip tour</Text>
              </Pressable>
              <Text style={styles.count}>
                {i + 1} of {steps.length}
              </Text>
              {step.practice ? (
                <View style={{ width: 70 }} />
              ) : (
                <Pressable onPress={next} accessibilityRole="button" style={styles.next}>
                  <Text style={styles.nextText}>{i === steps.length - 1 ? 'Let’s go' : 'Next'}</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn} />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(12,12,16,0.62)' },
  tip: {
    position: 'absolute',
    backgroundColor: colors.card,
    borderRadius: 26,
    borderCurve: 'continuous',
    padding: 16,
    boxShadow: '0 20px 50px -20px rgba(0,0,0,0.5)',
  },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  title: { ...font.bold, fontSize: 17, color: colors.text },
  text: { ...font.regular, fontSize: 14.5, lineHeight: 20, color: colors.muted, marginTop: 2 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  skip: { ...font.medium, fontSize: 14, color: colors.muted },
  count: { ...font.medium, fontSize: 13, color: colors.dim },
  next: {
    backgroundColor: colors.ink,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 70,
    alignItems: 'center',
  },
  nextText: { ...font.semibold, fontSize: 14.5, color: colors.onInk },
});
