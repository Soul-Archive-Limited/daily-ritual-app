import { router, Stack, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View, type HostInstance, type ScrollViewInstance } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Icon } from '@/components/bits';
import { AuraOrb } from '@/components/glow/AuraOrb';
import { useLayout } from '@/components/layout';
import type { LuneMood } from '@/components/Lune';
import { Screen } from '@/components/Screen';
import { useOnDeviceAI } from '@/ai/coach';
import { ActivityCard } from '@/components/today/ActivityCard';
import { AskCard } from '@/components/today/AskCard';
import { Coach, type CoachStep } from '@/components/today/Coach';
import { DayBar } from '@/components/today/DayBar';
import { LuneSays } from '@/components/today/LuneSays';
import { QuestsCard } from '@/components/today/QuestsCard';
import { RemindersCard } from '@/components/today/RemindersCard';
import { RestockCard } from '@/components/today/RestockCard';
import { RitualCards } from '@/components/today/RitualCards';
import { SlotSection } from '@/components/today/SlotSection';
import { SunCard } from '@/components/today/SunCard';
import { UpNext } from '@/components/today/UpNext';
import { useCelebrations } from '@/components/today/useCelebrations';
import { Button, Pill, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { useRewards } from '@/data/useRewards';
import { getKv, setKv } from '@/db/repo';
import { checkinDue } from '@/skin/model';
import { greeting, parseKey, todayKey } from '@/logic/dates';
import { currentSlot, dayInfo, motive, streakCalc, type DayInfo, type Streak } from '@/logic/scoring';
import { colors, font, SLOTS, type SlotId } from '@/theme/tokens';

/** Re-render every minute and when the app comes back, so greeting, Up next and "today" stay right. */
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && setNow(new Date()));
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);
  return now;
}

const enter = (i: number) => FadeInDown.duration(380).delay(50 * i);

/** How Lune feels about today. */
function luneMood(isToday: boolean, info: DayInfo, streak: Streak, now: Date): LuneMood {
  if (info.total && info.p >= 1) return 'cheer';
  if (!isToday) return 'happy';
  const h = now.getHours();
  if (streak.cur > 0 && !streak.todayGood && h >= 18) return 'worried';
  if ((h >= 22 || h < 5) && info.slot.pm.n > 0 && info.slot.pm.d === info.slot.pm.n) return 'sleepy';
  return 'happy';
}

export default function Today() {
  const s = useStore();
  const now = useClock();
  const { regular } = useLayout();
  const ai = useOnDeviceAI();
  const t = todayKey();
  const [picked, setPicked] = useState<string | null>(null);
  const [fold, setFold] = useState<Partial<Record<SlotId, boolean>>>({});
  const rewards = useRewards();
  useCelebrations(rewards);

  // First-run tour, and "Replay the tour" from Profile.
  const db = useSQLiteContext();
  const [tour, setTour] = useState(false);
  useFocusEffect(
    useCallback(() => {
      getKv<string>(db, 'tutorial').then((v) => setTour(v === 'pending'));
    }, [db]),
  );
  const scroller = useRef<ScrollViewInstance>(null);
  const scrollY = useRef(0);
  const orbRef = useRef<HostInstance>(null);
  const nextRef = useRef<HostInstance>(null);
  const ritualRef = useRef<HostInstance>(null);
  const questRef = useRef<HostInstance>(null);
  const luneRef = useRef<HostInstance>(null);

  // A picked day only sticks while it's in the past; after midnight we follow the new today.
  const k = picked && picked < t ? picked : t;
  const isToday = k === t;
  const future = k > t;

  // A tapped reminder opens today with that routine unfolded and the others folded;
  // a day tapped in Progress opens that day.
  const focus = s?.focus;
  const [seenFocus, setSeenFocus] = useState<number | null>(null);
  if (focus && focus.at !== seenFocus) {
    setSeenFocus(focus.at);
    setPicked(focus.day && focus.day < t ? focus.day : null);
    setFold(focus.slot ? { am: focus.slot !== 'am', pm: focus.slot !== 'pm' } : {});
  }

  const streak = useMemo(() => (s ? streakCalc(s.config, s.steps, s.days, t) : null), [s, t]);
  const info = useMemo(() => (s ? dayInfo(k, s.config, s.steps, s.days[k], t) : null), [s, k, t]);

  if (!s || !info || !streak) return <View style={styles.screen} />;
  const { config } = s;

  const weekday = parseKey(k).toLocaleDateString('en-GB', { weekday: 'long' });
  const m = motive(isToday, weekday, info, streak);
  const cur = currentSlot(now);
  // The routine for this time of day and Health start open; the others fold away (tap a card to open).
  const isOpen = (id: SlotId) => !(fold[id] ?? (isToday && id !== 'health' && id !== cur));
  const toggle = (id: SlotId) => setFold((f) => ({ ...f, [id]: isOpen(id) }));
  const dayXP = isToday ? rewards?.today : rewards?.byDay[k];

  const dateLine = parseKey(k).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const hero = (
    <Animated.View entering={enter(0)} style={styles.hero}>
      <Text style={styles.date}>{isToday ? dateLine : `${dateLine} · past day`}</Text>
      <Text style={styles.thin} accessibilityRole="header">
        {isToday ? `${greeting(now)},` : `${weekday}`}
      </Text>
      <Text style={styles.bold}>{isToday ? `${config.name || 'there'}.` : 'log.'}</Text>
      <View style={styles.pills}>
        {streak.cur ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${streak.cur}-day streak. See progress`}
            onPress={() => router.navigate('/progress')}>
            <Pill tone="ink" icon={<Icon name="flame.fill" size={12} color={colors.rose} />}>
              {streak.cur}-day glow
            </Pill>
          </Pressable>
        ) : null}
        {dayXP ? (
          <Pill tone="chip" icon={<Icon name="sparkles" size={12} color={colors.orchid} />}>
            {dayXP.total} / {dayXP.goal} XP
          </Pill>
        ) : null}
        {info.flags.travel ? (
          <Pill tone="chip" icon={<Icon name="airplane" size={12} color={colors.health} />}>
            Travel day
          </Pill>
        ) : null}
        {info.flags.shampoo ? (
          <Pill tone="chip" icon={<Icon name="drop.fill" size={11} color={colors.health} />}>
            Wash {isToday ? 'night' : 'day'}
          </Pill>
        ) : null}
        {isToday && config.startedAt < t && checkinDue(s.checkins, config.checkinEvery).due ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skin check-in due. Start check-in"
            onPress={() => router.push('/checkin')}>
            <Pill tone="chip" icon={<Icon name="camera.fill" size={11} color={colors.skin} />}>
              Check-in due
            </Pill>
          </Pressable>
        ) : null}
        {config.place?.name ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Location: ${config.place.name}. Change`}
            onPress={() => router.push('/place')}>
            <Pill tone="chip" icon={<Icon name="location.fill" size={11} color={colors.muted} />}>
              {config.place.name}
            </Pill>
          </Pressable>
        ) : null}
      </View>
      <Animated.View entering={enter(1)} style={styles.orb}>
        <View ref={orbRef} collapsable={false} style={{ alignSelf: 'center' }}>
          <AuraOrb p={info.p} label={isToday ? 'Today’s glow' : 'That day'} />
        </View>
      </Animated.View>
      <View ref={luneRef} collapsable={false}>
        <LuneSays mood={luneMood(isToday, info, streak, now)} line={m} />
      </View>
    </Animated.View>
  );

  const upNext =
    config.cards?.next !== false ? (
      <Animated.View entering={enter(2)}>
        <View ref={nextRef} collapsable={false}>
          <UpNext k={k} info={info} isToday={isToday} />
        </View>
      </Animated.View>
    ) : null;

  const extras = (
    <>
      {dayXP && info.total ? (
        <Animated.View entering={enter(5)}>
          <View ref={questRef} collapsable={false}>
            <QuestsCard day={dayXP} />
          </View>
        </Animated.View>
      ) : null}
      {isToday && config.cards?.sun !== false ? (
        <Animated.View entering={enter(6)}>
          <SunCard />
        </Animated.View>
      ) : null}
      {isToday && ai && config.cards?.ask !== false ? <AskCard /> : null}
      {isToday && config.notify === undefined ? <RemindersCard /> : null}
    </>
  );

  const routines = (
    <>
      <Animated.View entering={enter(3)} style={styles.sect}>
        <Text style={styles.sectTitle}>Rituals</Text>
        <T variant="label">{SLOTS.filter((x) => info.slot[x.id].n > 0).length} today</T>
      </Animated.View>
      <Animated.View entering={enter(3)}>
        <View ref={ritualRef} collapsable={false}>
          <RitualCards info={info} isOpen={regular ? () => true : isOpen} onOpen={regular ? () => {} : toggle} />
        </View>
      </Animated.View>
      {SLOTS.filter((sl) => regular || isOpen(sl.id)).map((sl) => (
        <Animated.View key={sl.id} entering={FadeInDown.duration(260)}>
          <SlotSection
            k={k}
            slotId={sl.id}
            info={info}
            future={future}
            folded={false}
            onToggle={() => (regular ? undefined : toggle(sl.id))}
          />
        </Animated.View>
      ))}
    </>
  );

  const more = (
    <>
      <DayBar k={k} info={info} onPick={(d) => setPicked(d === t ? null : d)} />
      {isToday && config.cards?.restock !== false ? <RestockCard /> : null}
      {config.cards?.activity !== false ? <ActivityCard k={k} future={future} /> : null}
      <Button
        label="See your week, streak and rewards"
        icon="chart.line.uptrend.xyaxis"
        kind="line"
        onPress={() => router.navigate('/progress')}
        style={{ alignSelf: 'center', marginTop: 4 }}
      />
    </>
  );

  const tourSteps: CoachStep[] = [
    {
      target: orbRef,
      round: true,
      title: 'This is your glow',
      text: 'It fills as you tick steps. Reach 80% and the day counts towards your streak.',
    },
    {
      target: nextRef,
      title: 'Up next',
      text: 'Your next step for this time of day. Slide to mark it done. Try it here:',
      practice: true,
    },
    {
      target: ritualRef,
      title: 'Your rituals',
      text: 'Tap Morning, Night or Health to see every step. Tap a step to tick it, or Skip it for today.',
    },
    ...(dayXP && info.total
      ? [
          {
            target: questRef,
            title: 'Quests and XP',
            text: 'Every step earns XP. Finish three quests a day, level up and collect badges.',
          },
        ]
      : []),
    {
      target: luneRef,
      title: 'And that’s me, Lune!',
      text: 'I’ll cheer you on and warn you when your streak needs you. Let’s start.',
      mood: 'cheer' as const,
    },
  ];

  const endTour = () => {
    setTour(false);
    setKv(db, 'tutorial', 'done');
  };

  return (
    <Screen
      wide={regular}
      ref={scroller}
      scrollEventThrottle={64}
      onScroll={(e) => {
        scrollY.current = e.nativeEvent.contentOffset.y;
      }}>
      {tour && isToday ? <Coach steps={tourSteps} scroll={scroller} scrollY={scrollY} onDone={endTour} /> : null}
      <Stack.Toolbar placement="right">
        {!isToday ? (
          <Stack.Toolbar.Button
            icon="arrow.uturn.backward"
            accessibilityLabel="Back to today"
            onPress={() => setPicked(null)}
          />
        ) : null}
        <Stack.Toolbar.Button
          icon="person.crop.circle"
          accessibilityLabel="Profile and settings"
          onPress={() => router.push('/profile')}
        />
      </Stack.Toolbar>
      {regular ? (
        <View style={styles.columns}>
          <View style={styles.col}>
            {hero}
            {upNext}
            {extras}
          </View>
          <View style={styles.col}>
            {routines}
            {more}
          </View>
        </View>
      ) : (
        <>
          {hero}
          {upNext}
          {routines}
          {extras}
          {more}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  columns: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  col: { flex: 1, gap: 14 },
  hero: { gap: 0, paddingTop: 4 },
  date: { ...font.light, fontSize: 15, color: colors.muted },
  thin: { ...font.thin, fontSize: 44, lineHeight: 46, letterSpacing: -1.6, color: colors.text, marginTop: 6 },
  bold: { ...font.bold, fontSize: 44, lineHeight: 48, letterSpacing: -1.6, color: colors.text },
  pills: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap' },
  orb: { marginTop: 18, marginBottom: 16 },
  sect: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 },
  sectTitle: { ...font.semibold, fontSize: 20, letterSpacing: -0.3, color: colors.text },
});
