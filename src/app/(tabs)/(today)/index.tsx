import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Icon } from '@/components/bits';
import { Hero } from '@/components/Hero';
import { useLayout } from '@/components/layout';
import { Screen } from '@/components/Screen';
import { useOnDeviceAI } from '@/ai/coach';
import { ActivityCard } from '@/components/today/ActivityCard';
import { AskCard } from '@/components/today/AskCard';
import { DayBar } from '@/components/today/DayBar';
import { RemindersCard } from '@/components/today/RemindersCard';
import { RestockCard } from '@/components/today/RestockCard';
import { SlotSection } from '@/components/today/SlotSection';
import { SunCard } from '@/components/today/SunCard';
import { UpNext } from '@/components/today/UpNext';
import { Button, Pill } from '@/components/ui';
import { useStore } from '@/data/store';
import { checkinDue } from '@/skin/model';
import { greeting, parseKey, todayKey } from '@/logic/dates';
import { currentSlot, dayInfo, motive, streakCalc } from '@/logic/scoring';
import { colors, font, SLOTS, type SlotId, onPhoto } from '@/theme/tokens';

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

const enter = (i: number) => FadeInDown.duration(360).delay(40 * i);

export default function Today() {
  const s = useStore();
  const now = useClock();
  const { regular } = useLayout();
  const ai = useOnDeviceAI();
  const t = todayKey();
  const [picked, setPicked] = useState<string | null>(null);
  const [fold, setFold] = useState<Partial<Record<SlotId, boolean>>>({});

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
  const isFolded = (id: SlotId) => fold[id] ?? (isToday && id !== 'health' && id !== cur);

  const dateLine = parseKey(k).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const hero = (
    <Animated.View entering={enter(0)}>
      <Hero source={require('@/assets/images/hero/hero.webp')} height={regular ? 300 : 270}>
        <Text style={styles.date}>{isToday ? dateLine : `${dateLine} · past day`}</Text>
        <Text style={styles.greet} accessibilityRole="header">
          {isToday ? greeting(now) : `${weekday} log`}
          {isToday && config.name ? <Text style={styles.name}>, {config.name}</Text> : null}
        </Text>
        <Text style={styles.motive}>
          {m.before}
          {m.em ? <Text style={styles.em}>{m.em}</Text> : null}
          {m.after ?? ''}
        </Text>
        <View style={styles.pills}>
          {info.flags.travel ? (
            <Pill tone="onPhoto" icon={<Icon name="airplane" size={12} color={onPhoto.text} />}>
              Travel day
            </Pill>
          ) : null}
          {config.place?.name ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Location: ${config.place.name}. Change`}
              onPress={() => router.push('/place')}>
              <Pill tone="onPhoto" icon={<Icon name="location.fill" size={11} color={onPhoto.text} />}>
                {config.place.name}
              </Pill>
            </Pressable>
          ) : null}
          {streak.cur ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${streak.cur}-day streak. See progress`}
              onPress={() => router.navigate('/progress')}>
              <Pill tone="onPhoto" icon={<Icon name="flame.fill" size={12} color={onPhoto.text} />}>
                {streak.cur}-day streak
              </Pill>
            </Pressable>
          ) : null}
          {info.flags.shampoo ? (
            <Pill tone="onPhoto" icon={<Icon name="drop" size={12} color={onPhoto.text} />}>
              Wash {isToday ? 'night' : 'day'}
            </Pill>
          ) : null}
          {isToday && config.startedAt < t && checkinDue(s.checkins, config.checkinEvery).due ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skin check-in due. Start check-in"
              onPress={() => router.push('/checkin')}>
              <Pill tone="onPhoto" icon={<Icon name="camera" size={12} color={onPhoto.text} />}>
                Check-in due
              </Pill>
            </Pressable>
          ) : null}
        </View>
      </Hero>
    </Animated.View>
  );

  const overview = (
    <>
      {config.cards?.next !== false ? (
        <Animated.View entering={enter(1)}>
          <UpNext k={k} info={info} isToday={isToday} />
        </Animated.View>
      ) : null}
      {isToday && config.cards?.sun !== false ? (
        <Animated.View entering={enter(2)}>
          <SunCard />
        </Animated.View>
      ) : null}
      {isToday && ai && config.cards?.ask !== false ? (
        <Animated.View entering={enter(2)}>
          <AskCard />
        </Animated.View>
      ) : null}
      {isToday && config.notify === undefined ? (
        <Animated.View entering={enter(2)}>
          <RemindersCard />
        </Animated.View>
      ) : null}
      <Animated.View entering={enter(2)}>
        <DayBar k={k} info={info} onPick={(d) => setPicked(d === t ? null : d)} />
      </Animated.View>
    </>
  );

  const routines = (
    <>
      {SLOTS.map((sl, i) => (
        <Animated.View key={sl.id} entering={enter(3 + i)}>
          <SlotSection
            k={k}
            slotId={sl.id}
            info={info}
            future={future}
            folded={regular ? false : isFolded(sl.id)}
            onToggle={() => setFold((f) => ({ ...f, [sl.id]: !isFolded(sl.id) }))}
          />
        </Animated.View>
      ))}
      {isToday && config.cards?.restock !== false ? <RestockCard /> : null}
      {config.cards?.activity !== false ? (
        <Animated.View entering={enter(6)}>
          <ActivityCard k={k} future={future} />
        </Animated.View>
      ) : null}
      <Button
        label="See your week, streak and review"
        icon="chart.line.uptrend.xyaxis"
        kind="line"
        onPress={() => router.navigate('/progress')}
        style={{ alignSelf: 'center', marginTop: 4 }}
      />
    </>
  );

  return (
    <Screen wide={regular}>
      <Stack.Title>{isToday ? 'Today' : weekday}</Stack.Title>
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
            {overview}
          </View>
          <View style={styles.col}>{routines}</View>
        </View>
      ) : (
        <>
          {hero}
          {overview}
          {routines}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  columns: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  col: { flex: 1, gap: 14 },
  pills: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  date: { ...font.semibold, fontSize: 13, color: onPhoto.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  greet: { ...font.bold, fontSize: 30, lineHeight: 36, color: onPhoto.text },
  name: { color: onPhoto.muted },
  motive: { ...font.regular, fontSize: 16, lineHeight: 22, color: onPhoto.text },
  em: { ...font.semibold, color: onPhoto.accent },
});
