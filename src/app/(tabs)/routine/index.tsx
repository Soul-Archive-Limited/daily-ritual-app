import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Icon, IconTile } from '@/components/bits';
import { Hero } from '@/components/Hero';
import { ReorderList } from '@/components/routine/ReorderList';
import { RoutineCheckCard } from '@/components/routine/RoutineCheckCard';
import { ScheduleCard } from '@/components/routine/ScheduleCard';
import { StepCard } from '@/components/routine/StepCard';
import { Card, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { addDays, parseKey, todayKey, WD } from '@/logic/dates';
import { ruleOk } from '@/logic/schedule';
import { colors, font, radius, SLOTS, type SlotId, onPhoto } from '@/theme/tokens';

const ICONS: Record<SlotId, SFSymbol> = { am: 'sun.max', pm: 'moon', health: 'waveform.path.ecg' };
const enter = (i: number) => FadeInDown.duration(360).delay(40 * i);

export default function Routine() {
  const s = useStore();
  const scroll = useRef<ScrollViewInstance>(null);
  const sectionY = useRef<Partial<Record<SlotId, number>>>({});
  const bodyY = useRef(0);
  const [dragging, setDragging] = useState(false);

  if (!s) return <View style={styles.screen} />;
  const { config: c, steps } = s;

  const cnt = (sl: SlotId) => steps.filter((x) => x.slot === sl && x.on !== 'optional' && !x.paused).length;
  const total = cnt('am') + cnt('pm') + cnt('health');
  const noProduct = steps.filter((x) => x.type !== 'water' && !x.product).length;

  // A typical week: Monday to Sunday of this week.
  const t = todayKey();
  const mon = addDays(t, -((parseKey(t).getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const k = addDays(mon, i);
    const wd = parseKey(k).getDay();
    const f = { shampoo: c.shampooDays.includes(wd), exfoliate: c.exfoliateDays.includes(wd) };
    if (!c.exfoliateMode) f.exfoliate = f.shampoo;
    return { k, wd, f, n: steps.filter((x) => !x.paused && ruleOk(x.on, f)).length };
  });

  const jump = (sl: SlotId) => {
    const y = sectionY.current[sl];
    if (y != null) scroll.current?.scrollTo({ y: bodyY.current + y - 60, animated: true });
  };

  return (
    <ScrollView
      ref={scroll}
      style={styles.screen}
      scrollEnabled={!dragging}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <Animated.View entering={enter(0)}>
        <Hero source={require('@/assets/images/hero/drop.webp')} height={250}>
          <Text style={styles.title}>{total} steps, three routines</Text>
          <T variant="sub" style={{ color: onPhoto.muted }}>
            Tap a step to edit it. Hold its number and drag to reorder. Today shows them in this order.
          </T>
          <View style={styles.counts}>
            {SLOTS.map((sl) => (
              <Pressable
                key={sl.id}
                onPress={() => jump(sl.id)}
                accessibilityRole="button"
                accessibilityLabel={`${sl.name}: ${cnt(sl.id)} steps. Jump to list`}
                style={({ pressed }) => [styles.count, pressed && { opacity: 0.8 }]}>
                <Icon name={ICONS[sl.id]} size={15} color={sl.color} />
                <Text style={styles.countNum}>{cnt(sl.id)}</Text>
                <T variant="label" style={{ color: onPhoto.muted }}>
                  {sl.name}
                </T>
              </Pressable>
            ))}
          </View>
        </Hero>
      </Animated.View>

      <View style={styles.body} onLayout={(e) => (bodyY.current = e.nativeEvent.layout.y)}>
        {noProduct ? (
          <Animated.View entering={enter(1)} style={styles.nudge}>
            <Icon name="plus.circle" size={16} color={colors.gold} />
            <T variant="sub" style={{ flex: 1 }}>
              <Text style={{ ...font.semibold, color: colors.text }}>
                {noProduct} {noProduct === 1 ? 'step has' : 'steps have'} no product yet.
              </Text>{' '}
              Add them so Today shows exactly what to use.
            </T>
          </Animated.View>
        ) : null}

        <Animated.View entering={enter(1)} style={styles.week}>
          {week.map((d) => (
            <View key={d.k} style={[styles.wday, d.k === t && styles.wdayToday]}>
              <Text style={[styles.wdName, d.k === t && { color: colors.sage }]}>{WD[d.wd]}</Text>
              <Text style={styles.wdNum}>{d.n}</Text>
              <Text style={styles.wdSteps}>steps</Text>
              {d.f.shampoo ? <Text style={styles.wdTag}>Wash</Text> : <Text style={styles.wdTag}> </Text>}
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={enter(2)}>
          <RoutineCheckCard />
        </Animated.View>

        {SLOTS.map((sl, si) => {
          const list = steps.filter((x) => x.slot === sl.id);
          const ids = list.map((x) => x.id);
          return (
            <Animated.View
              key={sl.id}
              entering={enter(3 + si)}
              onLayout={(e) => (sectionY.current[sl.id] = e.nativeEvent.layout.y)}>
              <Card>
                <View style={styles.head}>
                  <IconTile name={ICONS[sl.id]} color={sl.color} />
                  <View style={{ flex: 1 }}>
                    <T variant="h2">{sl.name}</T>
                    <T variant="sub">
                      {list.length} {list.length === 1 ? 'step' : 'steps'}
                    </T>
                  </View>
                </View>
                <ReorderList
                  ids={ids}
                  onDragging={setDragging}
                  onReorder={(from, to) => {
                    const next = [...ids];
                    const [x] = next.splice(from, 1);
                    next.splice(to, 0, x);
                    s.reorderSlot(sl.id, next);
                  }}
                  renderRow={(id, i, handle) => {
                    const step = list.find((x) => x.id === id)!;
                    return <StepCard step={step} n={i + 1} accent={sl.color} last={false} handle={handle} />;
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    Haptics.selectionAsync();
                    const id = s.addStep(sl.id);
                    router.push({ pathname: '/step/[id]', params: { id, isNew: '1' } });
                  }}
                  style={({ pressed }) => [styles.add, pressed && { backgroundColor: colors.fill }]}>
                  <View style={styles.addDot}>
                    <Icon name="plus" size={13} color={colors.muted} />
                  </View>
                  <T style={{ color: colors.muted }}>Add a {sl.name.toLowerCase()} step</T>
                </Pressable>
              </Card>
            </Animated.View>
          );
        })}

        <Animated.View entering={enter(6)}>
          <ScheduleCard />
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 8, gap: 14 },
  title: { ...font.bold, fontSize: 28, lineHeight: 34, color: onPhoto.text },
  counts: { flexDirection: 'row', gap: 8, marginTop: 8 },
  count: {
    flex: 1,
    padding: 12,
    gap: 2,
    borderRadius: radius.small,
    backgroundColor: onPhoto.chip,
  },
  countNum: { ...font.bold, fontSize: 24, lineHeight: 28, color: onPhoto.text, marginTop: 2 },
  body: { paddingBottom: 32, gap: 14 },
  nudge: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.small,
    backgroundColor: colors.goldSoft,
  },
  week: { flexDirection: 'row', gap: 4 },
  wday: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  wdayToday: { borderColor: colors.sage },
  wdName: { ...font.semibold, fontSize: 11, color: colors.dim },
  wdNum: { ...font.semibold, fontSize: 22, lineHeight: 26, color: colors.text, marginTop: 2 },
  wdSteps: { ...font.regular, fontSize: 10, color: colors.dim },
  wdTag: { ...font.semibold, fontSize: 10, color: colors.health, marginTop: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    marginTop: 8,
    borderRadius: radius.small,
  },
  addDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
