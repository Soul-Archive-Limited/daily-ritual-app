import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { aiErrorText, useOnDeviceAI, weeklyReview } from '@/ai/coach';
import { buildContext } from '@/ai/context';
import { Bar, CountUp, Icon, IconTile } from '@/components/bits';
import { Columns } from '@/components/Columns';
import { fmtDay, Spark, TrendChart } from '@/components/progress/charts';
import { Button, Card, Pill, Seg, T } from '@/components/ui';
import { SLOT_ICONS } from '@/components/today/SlotSection';
import { useStore } from '@/data/store';
import { useShelf } from '@/data/useShelf';
import type { Review } from '@/db/types';
import { parseKey, todayKey, WD } from '@/logic/dates';
import {
  overview,
  pct,
  rangeKeys,
  RANGES,
  stepRows,
  timeline,
  weekBlocks,
  weeklyRhythm,
  WEEKDAYS_PLURAL,
  type InfoFn,
  type Range,
  weekStart,
} from '@/logic/progress';
import { MILES, type Streak } from '@/logic/scoring';
import { colors, font, minTouch, radius, SLOTS, type SlotId, usePalette } from '@/theme/tokens';

const enter = (i: number) => FadeInDown.duration(360).delay(40 * Math.min(i, 8));

/** Open a day on Today. */
export function openDay(setFocus: (f: { day: string; at: number }) => void, k: string) {
  setFocus({ day: k, at: Date.now() });
  router.navigate('/');
}

export function OverviewView({ info, today, streak }: { info: InfoFn; today: string; streak: Streak }) {
  const s = useStore()!;
  const pal = usePalette();
  const [range, setRange] = useState<Range>(30);
  const keys = useMemo(() => rangeKeys(range, s.config.startedAt, today), [range, s.config.startedAt, today]);
  const o = useMemo(() => overview(keys, info, s.days, s.config.startedAt), [keys, info, s.days, s.config.startedAt]);
  const review = s.reviews[0];
  const enough = o.logged >= 7;

  return (
    <View style={{ gap: 14 }}>
      <Animated.View entering={enter(0)} style={{ gap: 12 }}>
        <Text style={styles.h1}>
          Overview{' '}
          <Text style={{ color: colors.muted }}>
            · last {keys.length} {keys.length === 1 ? 'day' : 'days'}
          </Text>
        </Text>
        <Seg options={RANGES} value={range} onChange={setRange} label="Range" />
      </Animated.View>

      <Columns>
        <Animated.View entering={enter(1)}>
          <Card style={[styles.q, { flex: 1 }]}>
            <Text style={styles.qLabel}>Am I more consistent?</Text>
            <Text style={styles.answer}>
              {pct(o.avg)}% of steps done
              {o.delta ? (
                <Text style={{ color: o.delta > 0 ? colors.sage : colors.gold }}>
                  {' '}
                  {o.delta > 0 ? `+${o.delta}` : `−${Math.abs(o.delta)}`}
                </Text>
              ) : null}
            </Text>
            <T variant="sub">
              {o.delta == null
                ? 'Not enough earlier history to compare yet.'
                : o.delta > 0
                  ? `Up from ${pct(o.prevAvg!)}% the ${keys.length} days before.`
                  : o.delta < 0
                    ? `Down from ${pct(o.prevAvg!)}% the ${keys.length} days before.`
                    : 'Same as the period before.'}{' '}
              {o.perfect} perfect {o.perfect === 1 ? 'day' : 'days'}. Streak {streak.cur} (best {streak.best}).
            </T>
          </Card>
        </Animated.View>

        <Animated.View entering={enter(2)}>
          <Card style={[styles.q, { flex: 1 }]}>
            <Text style={styles.qLabel}>What do I keep missing?</Text>
            {enough && o.top.length ? (
              <View style={{ gap: 6, marginTop: 4 }}>
                {o.top.map((m) => (
                  <View key={m.step.id} style={styles.li}>
                    <View style={[styles.kdot, { backgroundColor: SLOTS.find((x) => x.id === m.step.slot)?.color }]} />
                    <T variant="sub" style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, ...font.semibold }}>{m.step.name}</Text>{' '}
                      {m.step.type === 'water' ? 'under goal' : 'missed'} {m.n} of {m.of}
                      {m.mostly != null ? `, mostly ${WEEKDAYS_PLURAL[m.mostly]}` : ''}
                    </T>
                  </View>
                ))}
              </View>
            ) : (
              <T variant="sub" style={{ marginTop: 4 }}>
                {enough ? 'Nothing stands out. Steady.' : `Patterns show after 7 logged days (${o.logged} so far).`}
              </T>
            )}
          </Card>
        </Animated.View>

        <Animated.View entering={enter(3)}>
          <Card style={[styles.q, { flex: 1 }]}>
            <Text style={styles.qLabel}>What should I change?</Text>
            {review?.focus ? (
              <>
                <Text style={[styles.answer, { fontSize: 18, lineHeight: 24 }]}>{review.focus}</Text>
                <T variant="sub">From the weekly review of {fmtDay(review.week)}.</T>
              </>
            ) : enough && o.top[0] ? (
              <>
                <Text style={[styles.answer, { fontSize: 18, lineHeight: 24 }]}>
                  Make “{o.top[0].step.name}” easier
                </Text>
                <T variant="sub">Put it where you’ll see it, or move it next to a step you never skip.</T>
              </>
            ) : (
              <T variant="sub" style={{ marginTop: 4 }}>
                A focus shows here once there’s a week of logs or a weekly review.
              </T>
            )}
          </Card>
        </Animated.View>
      </Columns>

      <Columns max={2}>
        <Animated.View entering={enter(4)} style={{ flex: 1 }}>
          <StreakCard sk={streak} />
        </Animated.View>

        <Animated.View entering={enter(5)} style={{ flex: 1 }}>
          <Card style={{ flex: 1 }}>
            <T variant="h2">Trend</T>
            <T variant="sub">Line = 7-day average · dots = single days</T>
            <TrendChart keys={keys} vals={o.vals} avg7={o.avg7} today={today} />
          </Card>
        </Animated.View>
      </Columns>

      <Animated.View entering={enter(6)}>
        <ReviewCard reviews={s.reviews} />
      </Animated.View>

      <Columns>
        {o.slots.map((z, i) => {
          const sl = SLOTS.find((x) => x.id === z.id)!;
          return (
            <Animated.View key={z.id} entering={enter(7 + i)}>
              <Card>
                <View style={styles.head}>
                  <IconTile name={SLOT_ICONS[z.id]} color={sl.color} />
                  <T variant="h2" style={{ flex: 1 }}>
                    {sl.name}
                  </T>
                  <Text style={styles.mid}>
                    <CountUp value={pct(z.p)} />
                    <Text style={styles.unit}>%</Text>
                  </Text>
                </View>
                <Spark vals={z.spark} color={sl.color} light={sl.light} stop={pal[sl.key]} id={`sp-${z.id}`} />
                <T variant="sub" style={{ fontSize: 12.5, marginTop: 6 }}>
                  {z.missedMost ? (
                    <>
                      Missed most: <Text style={{ color: colors.text, ...font.semibold }}>{z.missedMost[0]}</Text> (
                      {z.missedMost[1]}×)
                    </>
                  ) : (
                    'Nothing missed'
                  )}
                </T>
              </Card>
            </Animated.View>
          );
        })}
      </Columns>

      <Animated.View entering={enter(10)}>
        <Details keys={keys} info={info} today={today} />
      </Animated.View>
    </View>
  );
}

function StreakCard({ sk }: { sk: Streak }) {
  const next = MILES.find((m) => m > sk.cur) ?? sk.cur + 30;
  const prev = [0, ...MILES].filter((m) => m <= sk.cur).pop() ?? 0;
  const risk = !sk.todayGood && sk.cur > 0 && new Date().getHours() >= 18;
  const note = sk.todayGood
    ? 'Today counts. Streak is safe until tomorrow.'
    : sk.cur > 0 && sk.shields > 0
      ? 'Miss today and a shield saves the streak.'
      : sk.cur > 0
        ? 'Get today to 80% or it resets to 0. Your best is kept.'
        : sk.lost
          ? `Your ${sk.lost.len}-day run ended ${fmtDay(sk.lost.k)}. Today can be day 1.`
          : 'Reach 80% today to start a streak.';
  return (
    <Card style={{ flex: 1 }}>
      <View style={styles.head}>
        <IconTile name="flame" color={colors.sage} />
        <T variant="h2" style={{ flex: 1 }}>
          Streak
        </T>
        {risk ? <Pill tone="warn">At risk</Pill> : sk.todayGood ? <Pill tone="on">Counted</Pill> : null}
      </View>
      <View style={[styles.head, { alignItems: 'flex-end', marginTop: 14 }]}>
        <Text style={[styles.big, { flex: 1 }]}>
          <CountUp value={sk.cur} />
          <Text style={styles.unit}> {sk.cur === 1 ? 'day' : 'days'}</Text>
        </Text>
        <View
          style={styles.shields}
          accessible
          accessibilityLabel={`${sk.shields} of 2 shields. Every 7 days in a row earns one; it saves the streak on a missed day.`}>
          {[0, 1].map((j) => (
            <Icon
              key={j}
              name={j < sk.shields ? 'shield.fill' : 'shield'}
              size={20}
              color={j < sk.shields ? colors.sage : colors.dim}
            />
          ))}
        </View>
      </View>
      <View style={{ marginTop: 10 }}>
        <Bar p={(sk.cur - prev) / (next - prev)} color={colors.sage} height={4} />
      </View>
      <View style={[styles.head, { justifyContent: 'space-between', marginTop: 6 }]}>
        <T variant="sub" style={{ fontSize: 12 }}>
          {next - sk.cur} to {next} days
        </T>
        <T variant="sub" style={{ fontSize: 12 }}>
          Best {sk.best}
        </T>
      </View>
      <T variant="sub" style={{ marginTop: 10 }}>
        {note}
      </T>
    </Card>
  );
}

function ReviewCard({ reviews }: { reviews: Review[] }) {
  const s = useStore()!;
  const shelf = useShelf();
  const ai = useOnDeviceAI();
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const r = reviews[0];
  const week = weekStart(todayKey());
  const thisWeek = r?.week === week;

  const write = async () => {
    setBusy(true);
    try {
      const ctx = buildContext({ ...s, shelf, sun: s.sun });
      await s.saveReview(await weeklyReview(ctx, week));
      s.showToast('Weekly review saved');
    } catch (e) {
      const msg = aiErrorText(e);
      if (msg) s.showToast(msg);
    } finally {
      setBusy(false);
    }
  };

  // Without Apple Intelligence and with no reviews yet, there is nothing to show.
  if (!ai && !r) return null;
  return (
    <Card>
      <View style={styles.head}>
        <IconTile name="sparkles" color={colors.sage} />
        <T variant="h2" style={{ flex: 1 }}>
          Weekly review
        </T>
        {ai ? (
          <Button
            label={busy ? 'Writing…' : thisWeek ? 'Rewrite' : 'Write'}
            kind={thisWeek ? 'line' : 'primary'}
            small
            disabled={busy}
            onPress={write}
          />
        ) : null}
      </View>
      {!r ? (
        <T variant="sub" style={{ marginTop: 14 }}>
          Apple Intelligence reads your week on this phone and writes a short review: what went well, what slipped and
          one thing to focus on. Nothing leaves your device.
        </T>
      ) : (
        <>
          <T variant="sub" style={{ fontSize: 12, marginTop: 12 }}>
            Week of {fmtDay(r.week)}
          </T>
          <Text style={styles.rvHead}>{r.headline}</Text>
          {r.wins.length ? <List title="Went well" color={colors.sage} items={r.wins} /> : null}
          {r.slips.length ? <List title="Slipped" color={colors.gold} items={r.slips} /> : null}
          {r.skin ? (
            <T variant="sub" style={{ marginTop: 10 }}>
              <Text style={{ color: colors.text, ...font.semibold }}>Skin:</Text> {r.skin}
            </T>
          ) : null}
          {r.body ? (
            <T variant="sub" style={{ marginTop: 6 }}>
              <Text style={{ color: colors.text, ...font.semibold }}>Body:</Text> {r.body}
            </T>
          ) : null}
          {r.focus ? (
            <View style={styles.focus}>
              <T variant="label">Focus next week</T>
              <Text style={styles.focusText}>{r.focus}</Text>
            </View>
          ) : null}
          {reviews.length > 1 ? (
            <>
              <Pressable onPress={() => setMore((v) => !v)} accessibilityRole="button" style={styles.moreBtn}>
                <T variant="label" style={{ color: colors.text }}>
                  Earlier reviews ({reviews.length - 1})
                </T>
                <Icon name={more ? 'chevron.up' : 'chevron.down'} size={12} color={colors.muted} />
              </Pressable>
              {more
                ? reviews.slice(1, 9).map((x) => (
                    <T key={x.week} variant="sub" style={{ marginTop: 8 }}>
                      <Text style={{ color: colors.text, ...font.semibold }}>{fmtDay(x.week)}:</Text> {x.headline}
                      {x.focus ? ` Focus: ${x.focus}` : ''}
                    </T>
                  ))
                : null}
            </>
          ) : null}
        </>
      )}
    </Card>
  );
}

function List({ title, color, items }: { title: string; color: ColorValue; items: string[] }) {
  return (
    <View style={{ marginTop: 12, gap: 4 }}>
      <Text style={[styles.qLabel, { color }]}>{title}</Text>
      {items.map((x) => (
        <View key={x} style={styles.li}>
          <View style={[styles.kdot, { backgroundColor: colors.dim }]} />
          <T variant="sub" style={{ flex: 1, color: colors.text }}>
            {x}
          </T>
        </View>
      ))}
    </View>
  );
}

const SLOT_ROWS: (SlotId | 'activity')[] = ['am', 'pm', 'health', 'activity'];
const ACTIVITY = colors.activity;

function Details({ keys, info, today }: { keys: string[]; info: InfoFn; today: string }) {
  const s = useStore()!;
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  if (!open)
    return (
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityState={{ expanded: false }}>
        <Card style={styles.detailsHead}>
          <T variant="h2" style={{ flex: 1 }}>
            Details: timeline, weekly rhythm, every step
          </T>
          <Icon name="chevron.down" size={14} color={colors.muted} />
        </Card>
      </Pressable>
    );

  const tl = timeline(s.days[today], s.steps);
  const wk = weekBlocks(today, info, s.config.startedAt, today);
  const rh = weeklyRhythm(keys, info);
  const sr = stepRows(keys, info, s.steps, s.days);
  const rows = all ? sr.rows : sr.rows.slice(0, 8);
  const longDays = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];

  return (
    <View style={{ gap: 14 }}>
      <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityState={{ expanded: true }}>
        <Card style={styles.detailsHead}>
          <T variant="h2" style={{ flex: 1 }}>
            Details
          </T>
          <Icon name="chevron.up" size={14} color={colors.muted} />
        </Card>
      </Pressable>

      <Card>
        <View style={styles.between}>
          <T variant="h2">Today’s timeline</T>
          <T variant="sub">when you did each step</T>
        </View>
        <View style={{ marginTop: 12, gap: 10 }}>
          {SLOT_ROWS.filter((r) => r !== 'activity' || tl.activity.length).map((r) => {
            const sl = SLOTS.find((x) => x.id === r);
            const col = sl?.color ?? ACTIVITY;
            return (
              <View key={r} style={styles.tlRow}>
                <View style={styles.tlName}>
                  <View style={[styles.kdot, { backgroundColor: col }]} />
                  <T variant="label">{sl?.name ?? 'Activity'}</T>
                </View>
                <View
                  style={styles.track}
                  accessible
                  accessibilityLabel={`${sl?.name ?? 'Activity'}: ${tl[r].length ? tl[r].map((m) => m.label).join(', ') : 'nothing yet'}`}>
                  {tl[r].map((m) => (
                    <View
                      key={`${m.label}${m.at}`}
                      style={[
                        styles.blk,
                        { left: `${m.x * 100}%`, backgroundColor: col, width: r === 'activity' ? 12 : 6 },
                      ]}
                    />
                  ))}
                </View>
              </View>
            );
          })}
          <View style={styles.tlRow}>
            <View style={styles.tlName} />
            <View style={styles.axis}>
              {['05', '10', '15', '20', '01'].map((h) => (
                <T key={h} variant="mono" style={{ fontSize: 10 }}>
                  {h}
                </T>
              ))}
            </View>
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.between}>
          <T variant="h2">This week</T>
          <Text style={styles.mid}>
            {pct(wk.avg)}
            <Text style={styles.unit}>% avg</Text>
          </Text>
        </View>
        <View style={styles.wk}>
          {wk.days.map((d) => {
            const on = d.p == null ? 0 : Math.round(d.p * 5);
            const isT = d.k === today;
            return (
              <Pressable
                key={d.k}
                disabled={d.k > today}
                onPress={() => openDay(s.setFocus, d.k)}
                accessibilityRole="button"
                accessibilityLabel={`${fmtDay(d.k, { weekday: 'long', day: 'numeric', month: 'short' })}: ${d.p == null ? 'not logged' : `${pct(d.p)}%`}. Open on Today`}
                style={styles.wkCol}>
                {[4, 3, 2, 1, 0].map((j) => (
                  <View
                    key={j}
                    style={[styles.wkCell, j < on && { backgroundColor: isT ? colors.sageLight : colors.sage }]}
                  />
                ))}
                <Text style={[styles.wkD, isT && { color: colors.text }]}>
                  {WD[parseKey(d.k).getDay()].slice(0, 1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <View style={styles.between}>
          <T variant="h2">Weekly rhythm</T>
          <T variant="sub">by weekday</T>
        </View>
        <View style={styles.wk}>
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d, i) => {
            const v = rh.avg[i];
            const on = v == null ? 0 : Math.round(v * 6);
            return (
              <View
                key={d}
                style={styles.wkCol}
                accessible
                accessibilityLabel={`${longDays[i]}: ${v == null ? 'no logs' : `${pct(v)}%`}`}>
                <Text style={[styles.wkV, i === rh.best && { color: colors.sage }]}>
                  {v == null ? '–' : `${pct(v)}%`}
                </Text>
                {[5, 4, 3, 2, 1, 0].map((j) => (
                  <View
                    key={j}
                    style={[
                      styles.wkCell,
                      { height: 8 },
                      j < on && { backgroundColor: i === rh.best ? colors.sageLight : colors.sage },
                    ]}
                  />
                ))}
                <Text style={styles.wkD}>{d}</Text>
              </View>
            );
          })}
        </View>
        <T variant="sub" style={{ marginTop: 12 }}>
          {rh.enough && rh.best != null && rh.worst != null ? (
            <>
              Strongest on <Text style={{ color: colors.text, ...font.semibold }}>{longDays[rh.best]}</Text>, weakest on{' '}
              <Text style={{ color: colors.text, ...font.semibold }}>{longDays[rh.worst]}</Text>.
            </>
          ) : (
            'Needs a week of history.'
          )}
        </T>
      </Card>

      <Card>
        <T variant="h2">Step by step</T>
        <T variant="sub">Last {sr.days} days · weakest first</T>
        <View style={styles.legend}>
          <View style={styles.li}>
            <View style={[styles.dot, { backgroundColor: colors.text }]} />
            <T variant="label">done</T>
          </View>
          <View style={styles.li}>
            <View style={[styles.dot, styles.dotMiss]} />
            <T variant="label">missed</T>
          </View>
          <T variant="label">gap = not scheduled or skipped</T>
        </View>
        {!rows.length ? (
          <T variant="sub" style={{ paddingVertical: 14 }}>
            No scheduled steps in this range yet.
          </T>
        ) : (
          rows.map((r) => {
            const sl = SLOTS.find((x) => x.id === r.step.slot) ?? SLOTS[0];
            return (
              <View key={r.step.id} style={styles.sRow}>
                <View style={styles.between}>
                  <Text style={[styles.sName, r.p < 0.6 && r.n >= 3 && { color: colors.gold }]} numberOfLines={1}>
                    {r.step.name}
                  </Text>
                  <Text style={styles.sPct}>{pct(r.p)}%</Text>
                </View>
                <View style={styles.li}>
                  <View style={[styles.kdot, { backgroundColor: sl.color }]} />
                  <T variant="label" style={{ fontSize: 11.5 }}>
                    {sl.name} · {r.missed} missed
                  </T>
                </View>
                <View style={styles.strip} accessibilityElementsHidden>
                  {r.cells.map((c, i) => (
                    <View
                      key={i}
                      style={[styles.cell, c === 'd' && { backgroundColor: sl.color }, c === 'm' && styles.dotMiss]}
                    />
                  ))}
                </View>
              </View>
            );
          })
        )}
        {sr.rows.length > 8 ? (
          <Pressable onPress={() => setAll((v) => !v)} accessibilityRole="button" style={styles.moreBtn}>
            <T variant="label" style={{ color: colors.text }}>
              {all ? 'Show weakest 8' : `Show all ${sr.rows.length} steps`}
            </T>
          </Pressable>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { ...font.medium, fontSize: 26, lineHeight: 32, color: colors.text, letterSpacing: -0.4 },
  q: { gap: 6 },
  qLabel: {
    ...font.semibold,
    fontSize: 11.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  answer: { ...font.semibold, fontSize: 22, lineHeight: 28, color: colors.text, letterSpacing: -0.3 },
  li: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kdot: { width: 7, height: 7, borderRadius: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  big: { ...font.light, fontSize: 54, lineHeight: 60, color: colors.text, letterSpacing: -1.5 },
  mid: { ...font.light, fontSize: 32, lineHeight: 38, color: colors.text, letterSpacing: -0.8 },
  unit: { ...font.medium, fontSize: 15, color: colors.muted, letterSpacing: 0 },
  shields: { flexDirection: 'row', gap: 8, paddingBottom: 10 },
  rvHead: { ...font.semibold, fontSize: 19, lineHeight: 25, color: colors.text, marginTop: 4 },
  focus: { marginTop: 14, padding: 14, borderRadius: radius.small, backgroundColor: colors.sageSoft, gap: 4 },
  focusText: { ...font.semibold, fontSize: 16, lineHeight: 22, color: colors.text },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: minTouch, marginTop: 4 },
  detailsHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  tlRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tlName: { width: 78, flexDirection: 'row', alignItems: 'center', gap: 6 },
  track: { flex: 1, height: 16, borderRadius: 8, backgroundColor: colors.fill, justifyContent: 'center' },
  blk: { position: 'absolute', height: 10, borderRadius: 3, marginLeft: -3 },
  axis: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  wk: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  wkCol: { alignItems: 'center', gap: 4, minWidth: minTouch * 0.8, paddingVertical: 2 },
  wkCell: { width: 26, height: 10, borderRadius: 3, backgroundColor: colors.line },
  wkD: { ...font.mono, fontSize: 10.5, color: colors.dim, marginTop: 4 },
  wkV: { ...font.mono, fontSize: 10, color: colors.muted, marginBottom: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 10, marginBottom: 4 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  dotMiss: { backgroundColor: 'transparent', borderWidth: 1.4, borderColor: colors.dim },
  sRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line, gap: 4 },
  sName: { ...font.semibold, fontSize: 14.5, color: colors.text, flex: 1 },
  sPct: { ...font.monoMedium, fontSize: 12, color: colors.muted },
  strip: { flexDirection: 'row', gap: 2, marginTop: 4 },
  cell: { flex: 1, maxWidth: 10, aspectRatio: 1, borderRadius: 5 },
});
