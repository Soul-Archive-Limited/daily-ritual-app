import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountUp } from '@/components/bits';
import { Medal } from '@/components/glow/Medal';
import { Lune } from '@/components/Lune';
import { useRewards } from '@/data/useRewards';
import { useStore } from '@/data/store';
import { addDays, parseKey, todayKey } from '@/logic/dates';
import { LEVELS, UNLOCKS } from '@/logic/rewards';
import { streakCalc } from '@/logic/scoring';
import { AURA, font, SLOTS } from '@/theme/tokens';

const PIECES = ['#FFFFFF', '#FFE3C9', '#FFD1E6', '#E2D9FF', '#FFFFFF', '#C9F2DA'];

/** One piece of confetti drifting down and turning. */
function Piece({ i, w, h }: { i: number; w: number; h: number }) {
  const y = useSharedValue(0);
  const x0 = ((i * 97) % 100) / 100;
  const delay = (i * 137) % 1400;
  const dur = 2600 + ((i * 53) % 1600);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withTiming(1, { duration: dur, easing: Easing.linear }), -1, false));
  }, [y, delay, dur]);
  const st = useAnimatedStyle(() => ({
    transform: [
      { translateX: x0 * w + Math.sin(y.value * 6 + i) * 18 },
      { translateY: -40 + y.value * (h + 80) },
      { rotate: `${y.value * 540 + i * 30}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        styles.piece,
        { backgroundColor: PIECES[i % PIECES.length], width: i % 3 ? 8 : 6, height: i % 3 ? 14 : 6 },
        st,
      ]}
    />
  );
}

/** Full-screen reward: a finished routine, a new level or a new badge. Tap Continue to go back. */
export default function Celebrate() {
  const { kind, slot, id } = useLocalSearchParams<{ kind: 'ritual' | 'level' | 'badge'; slot?: string; id?: string }>();
  const s = useStore();
  const r = useRewards();
  const reduce = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const t = todayKey();
  const streak = useMemo(() => (s ? streakCalc(s.config, s.steps, s.days, t) : null), [s, t]);

  if (!r || !streak) return null;
  const today = r.today;
  const perfect = kind === 'ritual' && today.info.total > 0 && today.info.p >= 1;
  const slotName = SLOTS.find((x) => x.id === slot)?.name ?? 'Ritual';
  const badge = kind === 'badge' ? r.badges.find((b) => b.id === id) : undefined;
  const nextLevel = LEVELS[r.level.n] ?? `${r.level.name} +1`;

  // This week, Monday to Sunday: a filled dot for every day that counted.
  const mon = addDays(t, -((parseKey(t).getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const k = addDays(mon, i);
    const d = r.byDay[k];
    return { k, l: 'MTWTFSS'[i], on: !!d && d.info.total > 0 && d.info.p >= 0.8, today: k === t };
  });
  const quests = today.quests.filter((q) => q.done).length;

  const [thin, bold, line] =
    kind === 'level'
      ? [
          `Level ${r.level.n}`,
          `${r.level.name}.`,
          (() => {
            const u = UNLOCKS.find((x) => x.level === r.level.n);
            return u
              ? `You unlocked the ${u.name}${u.kind === 'outfit' ? ' for Lune' : ''}. Find it in Rewards.`
              : `Your glow grew. Next up: ${nextLevel}.`;
          })(),
        ]
      : kind === 'badge' && badge
        ? ['New badge', `${badge.name}.`, badge.desc]
        : perfect
          ? ['Perfect', 'day.', 'Every step, done. Lune is doing a happy dance.']
          : [
              `${slotName} ritual`,
              'done.',
              streak.todayGood ? 'Today counts for your streak.' : 'Nicely done. Keep the glow going.',
            ];

  return (
    <View style={styles.screen} accessibilityViewIsModal>
      <LinearGradient colors={AURA} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {reduce ? null : Array.from({ length: 22 }, (_, i) => <Piece key={i} i={i} w={width} h={height} />)}

      <View style={[styles.body, { paddingTop: insets.top + 24 }]}>
        <Animated.View entering={reduce ? undefined : ZoomIn.springify().damping(12)}>
          {badge ? (
            <Medal badge={badge} size={132} />
          ) : (
            <Lune mood="cheer" size={170} label="Lune is celebrating" outfit={s?.config.look?.outfit} />
          )}
        </Animated.View>

        {kind === 'ritual' && streak.cur > 0 ? (
          <Animated.View entering={reduce ? undefined : FadeIn.delay(200)} style={styles.flame}>
            <CountUp value={streak.cur} style={styles.flameNum} />
            <Text style={styles.flameLabel}>day glow</Text>
          </Animated.View>
        ) : null}

        <Animated.View
          entering={reduce ? undefined : FadeInDown.delay(260).duration(380)}
          style={{ alignItems: 'center' }}>
          <Text style={styles.thin} accessibilityRole="header">
            {thin}
          </Text>
          <Text style={styles.bold}>{bold}</Text>
          <Text style={styles.line}>{line}</Text>
        </Animated.View>

        <Animated.View entering={reduce ? undefined : FadeInDown.delay(380).duration(380)} style={styles.rewards}>
          <View style={styles.reward}>
            <Text style={styles.rNum}>+{today.total}</Text>
            <Text style={styles.rLabel}>XP today</Text>
          </View>
          <View style={styles.reward}>
            <Text style={styles.rNum}>{quests}/3</Text>
            <Text style={styles.rLabel}>quests</Text>
          </View>
          <View style={styles.reward}>
            <Text style={styles.rNum}>{r.level.n}</Text>
            <Text style={styles.rLabel}>{r.level.name}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={reduce ? undefined : FadeIn.delay(480)} style={styles.week}>
          {week.map((d) => (
            <View key={d.k} style={[styles.dot, d.on && styles.dotOn, d.today && styles.dotToday]}>
              <Text style={[styles.dotText, d.on && styles.dotTextOn]}>{d.l}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      <View style={[styles.btnWrap, { bottom: insets.bottom + 24 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.btn, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <Text style={styles.btnText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' },
  piece: { position: 'absolute', top: 0, left: 0, borderRadius: 3, opacity: 0.75 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 14, paddingBottom: 110 },
  flame: {
    marginTop: -6,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  flameNum: { ...font.light, fontSize: 26, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  flameLabel: { ...font.semibold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#FFFFFF' },
  thin: { ...font.thin, fontSize: 44, lineHeight: 46, letterSpacing: -1.5, color: '#FFFFFF', textAlign: 'center' },
  bold: { ...font.bold, fontSize: 44, lineHeight: 46, letterSpacing: -1.5, color: '#FFFFFF', textAlign: 'center' },
  line: {
    ...font.regular,
    fontSize: 16.5,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 320,
  },
  rewards: { flexDirection: 'row', gap: 10, marginTop: 6 },
  reward: {
    minWidth: 96,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  rNum: { ...font.light, fontSize: 24, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  rLabel: { ...font.medium, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  week: { flexDirection: 'row', gap: 8, marginTop: 6 },
  dot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: '#FFFFFF' },
  dotToday: { borderWidth: 2, borderColor: '#FFFFFF' },
  dotText: { ...font.semibold, fontSize: 12, color: '#FFFFFF' },
  dotTextOn: { color: '#F06FA5' },
  btnWrap: { position: 'absolute', left: 26, right: 26, alignItems: 'center' },
  btn: {
    width: '100%',
    maxWidth: 520,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { ...font.semibold, fontSize: 17, color: '#121214' },
});
