import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { IconTile } from '@/components/bits';
import { Button, Card, Pill, T } from '@/components/ui';
import { ClimateTips } from '@/components/today/ClimateTips';
import { useStore } from '@/data/store';
import { todayKey } from '@/logic/dates';
import { hmAt, sunAdvice, sunAlt, uvWord, type SunDay } from '@/sun/sun';
import { useSunControls } from '@/sun/SunProvider';
import { colors, font } from '@/theme/tokens';

const H = 64;

/** Sun path across the day with the strong-sun window shaded and a dot for now. */
function SunArc({ day, now }: { day: SunDay; now: number }) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const t0 = (day.rise ?? day.hourly[0].t) - 36e5;
  const t1 = (day.set ?? day.hourly[day.hourly.length - 1].t) + 36e5;
  const x = (t: number) => ((t - t0) / (t1 - t0)) * w;
  // Highest point of the day, so the arc fills the height wherever you are.
  let maxAlt = 1;
  const pts: [number, number][] = [];
  for (let t = t0; t <= t1; t += 6e5) {
    const a = sunAlt(t, day.lat, day.lon);
    pts.push([t, a]);
    if (a > maxAlt) maxAlt = a;
  }
  const y = (a: number) => H - 6 - (Math.max(0, a) / maxAlt) * (H - 14);
  const d = pts
    .filter((p) => p[1] > -4)
    .map((p, j) => `${j ? 'L' : 'M'}${x(p[0]).toFixed(1)},${Math.min(H - 6, y(p[1])).toFixed(1)}`)
    .join(' ');
  const na = sunAlt(now, day.lat, day.lon);
  return (
    <View onLayout={onLayout} style={{ height: H, marginTop: 12 }} accessibilityElementsHidden>
      {w ? (
        <Svg width={w} height={H}>
          <Line x1={0} x2={w} y1={H - 6} y2={H - 6} stroke={colors.grid} />
          {day.strongStart != null && day.strongEnd != null ? (
            <Rect
              x={x(day.strongStart)}
              y={0}
              width={Math.max(0, x(day.strongEnd) - x(day.strongStart))}
              height={H - 6}
              fill={colors.morningSoft}
              rx={6}
            />
          ) : null}
          <Path d={d} fill="none" stroke={colors.morning} strokeWidth={2} strokeLinecap="round" />
          {na > 0 && now > t0 && now < t1 ? (
            <>
              <Circle cx={x(now)} cy={y(na)} r={9} fill={colors.morningSoft} />
              <Circle cx={x(now)} cy={y(na)} r={5} fill={colors.morningLight} />
            </>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

/** Today's sun: place, peak UV (live), sun arc, the one advice line and "Reapplied SPF". */
export function SunCard() {
  const s = useStore()!;
  const ctl = useSunControls();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const place = s.config.place;
  const day = s.sun;
  const placeLabel = place?.name || 'Set your city';

  const head = (
    <View style={styles.head}>
      <IconTile name="sun.max" color={colors.morning} />
      <View style={{ flex: 1 }}>
        <T variant="h2">Sun today</T>
        <Pressable
          onPress={() => router.push('/place')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Location: ${placeLabel}. Change`}>
          <View style={styles.placeRow}>
            <Text style={[styles.place, { flexShrink: 1 }]} numberOfLines={1}>
              {placeLabel}
            </Text>
            <Text style={[styles.place, { color: colors.muted }]}> · change</Text>
          </View>
        </Pressable>
      </View>
      {day ? (
        <Pill tone={Math.round(day.peak) >= 8 ? 'warn' : Math.round(day.peak) >= 3 ? 'plain' : 'on'}>
          UV {Math.round(day.peak)} · {uvWord(day.peak)}
        </Pill>
      ) : null}
    </View>
  );

  if (!day)
    return (
      <Card>
        {head}
        <T variant="sub" style={{ marginTop: 12 }}>
          {ctl?.loading ? 'Getting today’s UV…' : 'Allow location, or set your city, to see today’s UV and sun times.'}
        </T>
        {ctl?.perm === 'undetermined' ? (
          <Button label="Use my location" icon="location" small onPress={ctl.askLocation} style={styles.inline} />
        ) : null}
      </Card>
    );

  const k = todayKey();
  const ss = s.steps.find((x) => x.slot === 'am' && /sunscreen|spf/i.test(`${x.name} ${x.product}`));
  const spfAt = ss ? (s.days[k]?.done?.[ss.id] ?? null) : null;
  const reapplied = s.days[k]?.spf ?? [];
  const advice = sunAdvice(day, spfAt, reapplied, now);
  const nowUv = day.hourly.reduce((b, h) => (Math.abs(h.t - now) < Math.abs(b.t - now) ? h : b), day.hourly[0]).uv;

  return (
    <Card>
      {head}
      <SunArc day={day} now={now} />
      <View style={styles.times}>
        <Text style={styles.time}>↑ {hmAt(day.rise, day.tz)}</Text>
        <Text style={styles.time}>
          {day.strongStart != null
            ? `Strong ${hmAt(day.strongStart, day.tz)}–${hmAt(day.strongEnd, day.tz)}`
            : 'No strong-sun hours'}
        </Text>
        <Text style={styles.time}>↓ {hmAt(day.set, day.tz)}</Text>
      </View>
      <Text style={styles.advice}>
        {advice.line}{' '}
        <Text style={styles.adviceSub}>
          Outdoors, reapply every 2 h and after sweat or a swim.
          {reapplied.length ? ` Reapplied ${reapplied.length}× today.` : ''}
        </Text>
      </Text>
      <View style={styles.foot}>
        <Button
          label="Reapplied SPF"
          icon="plus"
          kind="line"
          small
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            s.logReapply();
          }}
        />
        <Text style={styles.note}>{day.live ? `Live UV · now ${Math.round(nowUv)}` : 'Estimate · offline'}</Text>
      </View>
      <ClimateTips />
      {ctl?.perm === 'undetermined' && !place?.manual ? (
        <Button
          label="Use my location"
          icon="location"
          kind="line"
          small
          onPress={ctl.askLocation}
          style={styles.inline}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  placeRow: { flexDirection: 'row', marginTop: 2 },
  place: { ...font.medium, fontSize: 13, color: colors.text },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  time: { ...font.mono, fontSize: 11, color: colors.dim },
  advice: { ...font.medium, fontSize: 14.5, lineHeight: 20, color: colors.text, marginTop: 12 },
  adviceSub: { ...font.regular, fontSize: 12.5, color: colors.muted },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  note: { ...font.mono, fontSize: 11, color: colors.dim },
  inline: { alignSelf: 'flex-start', marginTop: 12 },
});
