import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';

import { Icon } from '@/components/bits';
import { Seg } from '@/components/ui';
import { useStore, type DayType } from '@/data/store';
import { addDays, parseKey, todayKey, WD } from '@/logic/dates';
import { dayInfo, type DayInfo } from '@/logic/scoring';
import { colors, font, radius } from '@/theme/tokens';

const DAY_W = 56;

/** Last 30 days with a tiny progress bar each, plus Type of day for the selected day. */
export function DayBar({ k, info, onPick }: { k: string; info: DayInfo; onPick: (k: string) => void }) {
  const s = useStore()!;
  const t = todayKey();
  const scroller = useRef<ScrollViewInstance>(null);

  // Window of 30 days ending today, or around the selected day if it's older.
  let end = t;
  let from = addDays(end, -29);
  if (k < from) {
    from = addDays(k, -20);
    end = addDays(from, 29) > t ? t : addDays(from, 29);
  }
  const keys: string[] = [];
  for (let d = from; d <= end; d = addDays(d, 1)) keys.push(d);
  const idx = keys.indexOf(k);

  useEffect(() => {
    if (idx >= 0) scroller.current?.scrollTo({ x: Math.max(0, idx * (DAY_W + 2) - 120), animated: false });
  }, [idx]);

  const inRange = (d: string) => d >= s.config.startedAt && d <= t;
  const pick = (d: string) => {
    Haptics.selectionAsync();
    onPick(d);
  };

  const f = info.flags;
  const current: DayType = f.travel
    ? 'travel'
    : !s.config.exfoliateMode
      ? f.shampoo
        ? 'shampoo'
        : 'normal'
      : f.shampoo && f.exfoliate
        ? 'both'
        : f.shampoo
          ? 'shampoo'
          : f.exfoliate
            ? 'exfoliate'
            : 'normal';
  const options: [DayType, string][] = s.config.exfoliateMode
    ? [
        ['normal', 'Normal'],
        ['shampoo', 'Wash'],
        ['exfoliate', 'Exfoliate'],
        ['both', 'Both'],
        ['travel', 'Travel'],
      ]
    : [
        ['normal', 'No-wash day'],
        ['shampoo', 'Wash day'],
        ['travel', 'Travel day'],
      ];

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.scrub}>
        <RoundBtn icon="chevron.left" label="Previous day" onPress={() => pick(addDays(k, -1))} />
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 2 }}
          style={{ flex: 1 }}>
          {keys.map((d) => {
            const ok = inRange(d);
            const x = ok ? dayInfo(d, s.config, s.steps, s.days[d], t) : null;
            const sel = d === k;
            const date = parseKey(d);
            return (
              <Pressable
                key={d}
                onPress={() => pick(d)}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={`${date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}${x ? `, ${Math.round(x.p * 100)}% done` : ''}`}
                style={[styles.day, sel && styles.daySel]}>
                <Text style={[styles.wd, sel && { color: colors.sage }]}>{d === t ? 'Today' : WD[date.getDay()]}</Text>
                <Text style={styles.dn}>{date.getDate()}</Text>
                <View style={styles.bar}>
                  <View
                    style={{ width: `${x ? Math.round(x.p * 100) : 0}%`, height: '100%', backgroundColor: colors.sage }}
                  />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        <RoundBtn icon="chevron.right" label="Next day" disabled={k >= t} onPress={() => pick(addDays(k, 1))} />
      </View>

      <Seg
        options={options}
        value={current}
        label="Type of day"
        onChange={(v) => {
          if (v === current) return;
          Haptics.selectionAsync();
          s.setDayType(k, v);
        }}
      />
    </View>
  );
}

function RoundBtn({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: 'chevron.left' | 'chevron.right';
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={[styles.round, disabled && { opacity: 0.3 }]}>
      <Icon name={icon} size={14} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: radius.card,
    backgroundColor: colors.card,
  },
  round: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  day: { width: DAY_W, paddingTop: 8, paddingBottom: 9, borderRadius: 22, alignItems: 'center', gap: 1 },
  daySel: { backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.line2 },
  wd: { ...font.semibold, fontSize: 10.5, color: colors.dim },
  dn: { ...font.regular, fontSize: 20, lineHeight: 22, color: colors.text, fontVariant: ['tabular-nums'] },
  bar: { width: 24, height: 3, borderRadius: 2, backgroundColor: colors.line2, marginTop: 6, overflow: 'hidden' },
});
