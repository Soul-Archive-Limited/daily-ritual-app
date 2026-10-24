import {
  type ColorValue,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import type { SFSymbol } from 'expo-symbols';

import { CountUp, Icon } from '@/components/bits';
import { useLayout } from '@/components/layout';
import { openDay } from '@/components/progress/Overview';
import { fmtDay, Tip, tipStyles } from '@/components/progress/charts';
import { Card, T } from '@/components/ui';
import { SLOT_ICONS } from '@/components/today/SlotSection';
import { useStore } from '@/data/store';
import { parseKey, WD } from '@/logic/dates';
import { inRange, monthOf, monthStats, pct, shiftMonth, type InfoFn } from '@/logic/progress';
import { checkinPhotoUri } from '@/skin/photos';
import { colors, font, minTouch, SLOTS, onPhoto, usePalette } from '@/theme/tokens';

const enter = (i: number) => FadeInDown.duration(360).delay(40 * Math.min(i, 8));
const ACTIVITY = colors.activity;
const L = (ml: number) => `${+(ml / 1000).toFixed(1)} L`;
const hm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export function MonthView({ info, today }: { info: InfoFn; today: string }) {
  const s = useStore()!;
  const { startedAt } = s.config;
  const [mk, setMk] = useState(monthOf(today));
  const { regular } = useLayout();
  const M = useMemo(() => monthStats(mk, info, s.days, startedAt, today), [mk, info, s.days, startedAt, today]);
  const P = useMemo(
    () => monthStats(shiftMonth(mk, -1), info, s.days, startedAt, today),
    [mk, info, s.days, startedAt, today],
  );
  const delta = M.avg != null && P.avg != null ? pct(M.avg) - pct(P.avg) : null;
  const first = parseKey(`${mk}-01`);
  const cks = s.checkins.filter((c) => monthOf(c.date) === mk).reverse();
  const skinD = cks.length >= 2 ? cks[cks.length - 1].scores.overall - cks[0].scores.overall : null;
  const canBack = mk > monthOf(startedAt);
  const canNext = mk < monthOf(today);

  return (
    <View style={{ gap: 14 }}>
      <Animated.View entering={enter(0)}>
        <View style={styles.monthRow}>
          <Arrow
            icon="chevron.left"
            label="Previous month"
            disabled={!canBack}
            onPress={() => setMk(shiftMonth(mk, -1))}
          />
          <Text style={styles.month} accessibilityRole="header">
            {first.toLocaleDateString('en-GB', { month: 'long' })}{' '}
            <Text style={{ color: colors.muted }}>{first.getFullYear()}</Text>
          </Text>
          <Arrow icon="chevron.right" label="Next month" disabled={!canNext} onPress={() => setMk(shiftMonth(mk, 1))} />
        </View>
        <T variant="sub" style={{ textAlign: 'center' }}>
          {M.cnt} {M.cnt === 1 ? 'day' : 'days'} logged
        </T>
      </Animated.View>

      <View style={regular ? styles.split : { gap: 14 }}>
        <Animated.View entering={enter(1)} style={regular ? { flex: 1 } : undefined}>
          <Card>
            <View style={styles.between}>
              <T variant="h2">Month ring</T>
              <T variant="sub">one spoke per day</T>
            </View>
            <MonthRing ks={M.ks} avg={M.avg} info={info} today={today} startedAt={startedAt} mk={mk} />
            <View style={styles.legend}>
              <View style={styles.li}>
                <View style={[styles.sq, { backgroundColor: colors.sage }]} />
                <T variant="label">longer = more done</T>
              </View>
              <View style={styles.li}>
                <View style={[styles.sq, { backgroundColor: colors.sageLight }]} />
                <T variant="label">perfect day</T>
              </View>
            </View>
          </Card>
        </Animated.View>

        <View style={[styles.tiles, regular && { flex: 1, alignContent: 'flex-start' }]}>
          <Tile i={2} label="Average day">
            <Text style={styles.big}>
              <CountUp value={M.avg == null ? 0 : pct(M.avg)} />
              <Text style={styles.unit}>%</Text>
            </Text>
            <T variant="sub">
              on {M.cnt} logged {M.cnt === 1 ? 'day' : 'days'}
              {' · '}
              {delta == null ? (
                'no earlier month'
              ) : delta === 0 ? (
                'same as last month'
              ) : (
                <>
                  <Text style={{ color: delta > 0 ? colors.sage : colors.gold }}>
                    {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}%
                  </Text>{' '}
                  vs last month
                </>
              )}
            </T>
          </Tile>
          <Tile i={3} label="Perfect days">
            <Text style={styles.big}>
              <CountUp value={M.perfect} />
            </Text>
            <T variant="sub">every step done</T>
          </Tile>
          <Tile i={4} label="Longest run">
            <Text style={styles.big}>
              <CountUp value={M.bestRun} />
              <Text style={styles.unit}> {M.bestRun === 1 ? 'day' : 'days'}</Text>
            </Text>
            <T variant="sub">in a row at 80%+</T>
          </Tile>
          <Tile i={5} label="Water" dot={colors.health}>
            <Text style={styles.big}>
              {M.water == null ? '–' : (M.water / 1000).toFixed(1)}
              <Text style={styles.unit}> L</Text>
            </Text>
            <T variant="sub">a day on average</T>
          </Tile>
          <Tile i={6} label="Most reliable">
            <Text style={styles.name} numberOfLines={2}>
              {M.best?.step.name ?? '–'}
            </Text>
            <T variant="sub">{M.best ? `${pct(M.best.p)}% of its days` : 'needs a few days of logs'}</T>
          </Tile>
          <Tile i={7} label="Needs attention">
            <Text style={[styles.name, M.worst && M.worst.p < 0.7 && { color: colors.gold }]} numberOfLines={2}>
              {M.worst?.step.name ?? '–'}
            </Text>
            <T variant="sub">{M.worst ? `${pct(M.worst.p)}% of its days` : 'all good so far'}</T>
          </Tile>
        </View>
      </View>

      <Animated.View entering={enter(8)}>
        <RoutineGrid ks={M.ks} info={info} today={today} startedAt={startedAt} />
      </Animated.View>

      {cks.length ? (
        <Animated.View entering={enter(9)}>
          <Card>
            <T variant="h2">Skin this month</T>
            <T variant="sub">
              {cks.length} check-in{cks.length === 1 ? '' : 's'}
              {skinD != null ? (
                <>
                  {' · overall '}
                  <Text style={{ color: skinD > 0 ? colors.sage : skinD < 0 ? colors.gold : colors.muted }}>
                    {skinD > 0 ? `+${skinD}` : skinD < 0 ? `−${Math.abs(skinD)}` : '±0'}
                  </Text>{' '}
                  from first to last
                </>
              ) : null}
            </T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shots}>
              {cks.map((c) => {
                const uri = checkinPhotoUri(c.photos.front);
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => router.navigate('/skin')}
                    accessibilityRole="button"
                    accessibilityLabel={`Check-in ${fmtDay(c.date)}, overall ${c.scores.overall}. Open Skin`}>
                    <View style={styles.shot}>
                      {uri ? (
                        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      ) : (
                        <Icon name="camera" size={18} color={colors.dim} />
                      )}
                      <View style={styles.shotDate}>
                        <Text style={styles.shotDateText}>{fmtDay(c.date)}</Text>
                      </View>
                    </View>
                    <T variant="sub" style={{ marginTop: 6 }}>
                      Overall {c.scores.overall}
                    </T>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Card>
        </Animated.View>
      ) : null}
    </View>
  );
}

function Arrow({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: SFSymbol;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles.arrow, disabled && { opacity: 0.3 }]}>
      <Icon name={icon} size={15} color={colors.text} />
    </Pressable>
  );
}

function Tile({ i, label, dot, children }: { i: number; label: string; dot?: ColorValue; children: ReactNode }) {
  return (
    <Animated.View entering={enter(i)} style={styles.tile}>
      <Card style={{ flex: 1, gap: 4, padding: 16 }}>
        <View style={styles.li}>
          {dot ? <View style={[styles.kdot, { backgroundColor: dot }]} /> : null}
          <T variant="label">{label}</T>
        </View>
        {children}
      </Card>
    </Animated.View>
  );
}

/** One spoke per day around a ring: longer = more done, bright = perfect. Touch to read, lift to open that day. */
function MonthRing({
  ks,
  avg,
  info,
  today,
  startedAt,
  mk,
}: {
  ks: string[];
  avg: number | null;
  info: InfoFn;
  today: string;
  startedAt: string;
  mk: string;
}) {
  const s = useStore()!;
  const pal = usePalette();
  const [box, setBox] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const W = Math.min(340, Math.max(250, box));
  const C = W / 2;
  const r0 = W * 0.24;
  const r1 = W * 0.44;
  const n = ks.length;
  const off = (box - W) / 2;
  const sw = Math.max(3, Math.min(8, ((2 * Math.PI * r0) / n) * 0.55));

  const spokes = ks.map((k, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const ok = inRange(k, startedAt, today);
    const x = ok ? info(k) : null;
    const v = x?.total ? x.p : 0;
    const len = (r1 - r0) * Math.max(v, 0.04);
    const cx = Math.cos(a);
    const cy = Math.sin(a);
    const perfect = !!x?.total && x.n === x.total;
    return { k, i, a, ok, x, cx, cy, len, perfect };
  });

  const pick = (e: GestureResponderEvent) => {
    const dx = e.nativeEvent.locationX - off - C;
    const dy = e.nativeEvent.locationY - C;
    if (Math.hypot(dx, dy) < r0 * 0.6) return setSel(null);
    let a = Math.atan2(dy, dx) + Math.PI / 2;
    if (a < 0) a += 2 * Math.PI;
    setSel(Math.round((a / (2 * Math.PI)) * n) % n);
  };
  const release = () => {
    const sp = sel != null ? spokes[sel] : null;
    setSel(null);
    if (sp?.ok) openDay(s.setFocus, sp.k);
  };
  const month = parseKey(`${mk}-01`).toLocaleDateString('en-GB', { month: 'long' });
  const sp = sel != null ? spokes[sel] : null;

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setBox(e.nativeEvent.layout.width)}
      style={{ height: W, marginTop: 8 }}
      onStartShouldSetResponder={() => true}
      onResponderGrant={pick}
      onResponderMove={pick}
      onResponderRelease={release}
      onResponderTerminate={() => setSel(null)}
      accessibilityLabel={`Month ring. ${month} average ${avg == null ? 'not logged' : `${pct(avg)}%`}. Use the routine grid below to open a day.`}>
      {box ? (
        <Svg width={W} height={W} style={{ marginLeft: off }}>
          <Defs>
            <RadialGradient id="rg">
              <Stop offset="0" stopColor={pal.sage} stopOpacity={0.16} />
              <Stop offset="1" stopColor={pal.sage} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={C} cy={C} r={r1} fill="url(#rg)" />
          <Circle cx={C} cy={C} r={r0 - 6} fill="none" stroke={colors.grid} />
          <Circle cx={C} cy={C} r={r1} fill="none" stroke={colors.grid} strokeDasharray="2 5" />
          {spokes.map((p) => (
            <Line
              key={p.k}
              x1={C + p.cx * r0}
              y1={C + p.cy * r0}
              x2={C + p.cx * (r0 + p.len)}
              y2={C + p.cy * (r0 + p.len)}
              stroke={!p.ok ? colors.grid : p.perfect ? colors.sageLight : colors.sage}
              strokeWidth={p.i === sel ? sw + 2 : sw}
              strokeLinecap="round"
            />
          ))}
          {spokes.map((p) =>
            p.k === today ? (
              <Circle key="now" cx={C + p.cx * (r1 + 10)} cy={C + p.cy * (r1 + 10)} r={3.5} fill={colors.text} />
            ) : null,
          )}
          {spokes
            .filter((p) => [0, 7, 14, 21].includes(p.i))
            .map((p) => (
              <SvgText
                key={`n${p.i}`}
                x={C + p.cx * (r0 - 18)}
                y={C + p.cy * (r0 - 18) + 4}
                textAnchor="middle"
                fontSize={10}
                fill={colors.dim}>
                {p.i + 1}
              </SvgText>
            ))}
        </Svg>
      ) : null}
      {box ? (
        <View pointerEvents="none" style={[styles.ringMid, { top: C - 40 }]}>
          <Text style={[styles.ringNum, { fontSize: W * 0.15, lineHeight: W * 0.17 }]}>
            {avg == null ? '–' : <CountUp value={pct(avg)} />}
            {avg == null ? null : <Text style={styles.unit}>%</Text>}
          </Text>
          <T variant="sub">{month.slice(0, 3)} average</T>
        </View>
      ) : null}
      {sp ? (
        <Tip x={off + C + sp.cx * (r0 + sp.len)} y={C + sp.cy * (r0 + sp.len)} w={box}>
          <Text style={tipStyles.title}>{fmtDay(sp.k, { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
          <Text style={tipStyles.text}>
            {sp.x?.total ? `${pct(sp.x.p)}% · ${sp.x.n} of ${sp.x.total} steps` : 'not logged'}
          </Text>
        </Tip>
      ) : null}
    </View>
  );
}

const CELL = 24;
type Cell = { kind: 'full' | 'part' | 'miss' | 'off' | 'na' | 'water' | 'dot' | 'none'; label?: string; v?: number };

/** One row per routine, one square per day. Tap a square to open that day. */
function RoutineGrid({ ks, info, today, startedAt }: { ks: string[]; info: InfoFn; today: string; startedAt: string }) {
  const s = useStore()!;
  const ckDays = new Set(s.checkins.map((c) => c.date));
  const water = s.steps.find((x) => x.type === 'water');
  const ok = (k: string) => inRange(k, startedAt, today);
  const long = (k: string) => fmtDay(k, { weekday: 'short', day: 'numeric', month: 'short' });

  type Row = { name: string; icon: SFSymbol; color: ColorValue; cells: Cell[]; total: string; sub: string };
  const rows: Row[] = SLOTS.map((sl) => {
    let fin = 0;
    let sched = 0;
    const cells = ks.map((k): Cell => {
      if (!ok(k)) return { kind: 'na' };
      const z = info(k).slot[sl.id];
      if (!z.n) return { kind: 'off', label: `${long(k)} · ${sl.name}: nothing scheduled` };
      sched++;
      if (z.d === z.n) {
        fin++;
        return { kind: 'full', label: `${long(k)} · ${sl.name}: finished (${z.d} of ${z.n})` };
      }
      return z.f > 0
        ? { kind: 'part', label: `${long(k)} · ${sl.name}: started, ${z.d} of ${z.n} done` }
        : { kind: 'miss', label: `${long(k)} · ${sl.name}: missed (0 of ${z.n})` };
    });
    return {
      name: sl.name,
      icon: SLOT_ICONS[sl.id],
      color: sl.color,
      cells,
      total: `${fin}/${sched}`,
      sub: 'finished',
    };
  });
  if (water) {
    const goal = water.goal || 3000;
    let hit = 0;
    let n = 0;
    const cells = ks.map((k): Cell => {
      if (!ok(k)) return { kind: 'na' };
      const ml = info(k).water;
      n++;
      if (ml >= goal) hit++;
      return { kind: 'water', v: Math.min(1, ml / goal), label: `${long(k)} · water: ${L(ml)} of ${L(goal)}` };
    });
    rows.push({ name: 'Water', icon: 'drop', color: colors.health, cells, total: `${hit}/${n}`, sub: `at ${L(goal)}` });
  }
  {
    let n = 0;
    const cells = ks.map((k): Cell => {
      const a = s.days[k]?.activity ?? [];
      if (!a.length) return { kind: 'none' };
      n++;
      return { kind: 'dot', label: `${long(k)} · ${a.map((x) => `${x.type} ${hm(x.at)}`).join(', ')}` };
    });
    rows.push({
      name: 'Activity',
      icon: 'figure.run',
      color: ACTIVITY,
      cells,
      total: String(n),
      sub: n === 1 ? 'active day' : 'active days',
    });
  }
  {
    let n = 0;
    const cells = ks.map((k): Cell => {
      if (!ckDays.has(k)) return { kind: 'none' };
      n++;
      return { kind: 'dot', label: `${long(k)} · skin check-in` };
    });
    rows.push({
      name: 'Skin check-in',
      icon: 'camera',
      color: colors.skin,
      cells,
      total: String(n),
      sub: n === 1 ? 'check-in' : 'check-ins',
    });
  }
  {
    let n = 0;
    const cells = ks.map((k): Cell => {
      if (!info(k).flags.shampoo) return { kind: 'none' };
      if (ok(k)) n++;
      return { kind: 'dot', label: `${long(k)} · wash day` };
    });
    rows.push({
      name: 'Wash day',
      icon: 'drop.halffull',
      color: colors.muted,
      cells,
      total: String(n),
      sub: n === 1 ? 'wash day' : 'wash days',
    });
  }

  // Start scrolled to today in the current month.
  const tIdx = ks.indexOf(today);
  const [gridW, setGridW] = useState(0);
  const contentW = ks.length * CELL;
  const startX = tIdx >= 0 ? Math.max(0, Math.min(contentW - gridW, (tIdx + 1) * CELL - gridW + CELL * 2)) : 0;

  return (
    <Card>
      <T variant="h2">Routine grid</T>
      <T variant="sub">
        Each square is one day. Read across to see how each routine went. Tap a square to open that day.
      </T>
      <View style={styles.grid}>
        <View style={styles.labels}>
          <View style={styles.headCell} />
          {rows.map((r) => (
            <View key={r.name} style={styles.labelCell}>
              <Icon name={r.icon} size={13} color={r.color} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {r.name}
                </Text>
                <Text style={styles.rowTot} numberOfLines={1}>
                  {r.total} {r.sub}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={(e) => setGridW(e.nativeEvent.layout.width)}
          contentOffset={{ x: gridW ? startX : 0, y: 0 }}
          key={`${ks[0]}-${gridW ? 1 : 0}`}>
          <View>
            <View style={{ flexDirection: 'row' }}>
              {ks.map((k) => {
                const d = parseKey(k);
                const we = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <View key={k} style={styles.headCell}>
                    <Text style={[styles.dh, k === today && { color: colors.text, ...font.monoMedium }]}>
                      {d.getDate()}
                    </Text>
                    <Text style={[styles.dw, we && { color: colors.muted }]}>{WD[d.getDay()].slice(0, 1)}</Text>
                  </View>
                );
              })}
            </View>
            {rows.map((r) => (
              <View key={r.name} style={{ flexDirection: 'row' }}>
                {r.cells.map((c, i) => (
                  <GridCell
                    key={ks[i]}
                    c={c}
                    color={r.color}
                    onPress={c.label && ok(ks[i]) ? () => openDay(s.setFocus, ks[i]) : undefined}
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
      <View style={[styles.legend, { justifyContent: 'flex-start', marginTop: 14 }]}>
        <Key c={{ kind: 'full' }} text="Finished every step" />
        <Key c={{ kind: 'part' }} text="Started, some left" />
        <Key c={{ kind: 'miss' }} text="Missed" />
        <Key c={{ kind: 'off' }} text="Nothing scheduled" />
        <Key c={{ kind: 'water', v: 0.5 }} color={colors.health} text="Water, filled to how much you drank" />
      </View>
    </Card>
  );
}

function Key({ c, text, color = colors.sage }: { c: Cell; text: string; color?: ColorValue }) {
  return (
    <View style={styles.li}>
      <Mark c={c} color={color} />
      <T variant="label">{text}</T>
    </View>
  );
}

function GridCell({ c, color, onPress }: { c: Cell; color: ColorValue; onPress?: () => void }) {
  if (!onPress)
    return (
      <View style={styles.cell} accessible={!!c.label} accessibilityLabel={c.label}>
        <Mark c={c} color={color} />
      </View>
    );
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${c.label}. Open on Today`}
      style={({ pressed }) => [styles.cell, pressed && { opacity: 0.6 }]}>
      <Mark c={c} color={color} />
    </Pressable>
  );
}

function Mark({ c, color }: { c: Cell; color: ColorValue }) {
  switch (c.kind) {
    case 'full':
      return <View style={[styles.mark, { backgroundColor: color }]} />;
    case 'part':
      return (
        <View style={[styles.mark, { borderWidth: 1.4, borderColor: color, overflow: 'hidden' }]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: 0.35 }]} />
        </View>
      );
    case 'miss':
      return <View style={[styles.mark, { borderWidth: 1.4, borderColor: colors.line2 }]} />;
    case 'off':
      return <View style={styles.dash} />;
    case 'na':
      return <View style={[styles.mark, { backgroundColor: colors.fill }]} />;
    case 'water':
      return (
        <View
          style={[
            styles.mark,
            { borderWidth: 1.2, borderColor: color, overflow: 'hidden', justifyContent: 'flex-end' },
          ]}>
          <View style={{ height: 15 * (c.v ?? 0), backgroundColor: color }} />
        </View>
      );
    case 'dot':
      return <View style={[styles.dot, { backgroundColor: color }]} />;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  ringMid: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  ringNum: { ...font.light, color: colors.text, letterSpacing: -1.5 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  month: { ...font.light, fontSize: 34, lineHeight: 42, color: colors.text, letterSpacing: -0.8 },
  arrow: {
    width: minTouch,
    height: minTouch,
    borderRadius: minTouch / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 6 },
  li: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sq: { width: 10, height: 10, borderRadius: 3 },
  kdot: { width: 7, height: 7, borderRadius: 4 },
  split: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '48%', flexGrow: 1 },
  big: { ...font.light, fontSize: 40, lineHeight: 46, color: colors.text, letterSpacing: -1, marginTop: 4 },
  unit: { ...font.medium, fontSize: 15, color: colors.muted, letterSpacing: 0 },
  name: { ...font.semibold, fontSize: 17, lineHeight: 22, color: colors.text, marginTop: 8 },
  grid: { flexDirection: 'row', marginTop: 14 },
  labels: { width: 112, paddingRight: 6 },
  headCell: { width: CELL, height: 34, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
  labelCell: { height: 38, flexDirection: 'row', alignItems: 'center', gap: 7 },
  rowName: { ...font.semibold, fontSize: 12.5, color: colors.text },
  rowTot: { ...font.mono, fontSize: 9.5, color: colors.dim },
  dh: { ...font.mono, fontSize: 10, color: colors.muted },
  dw: { ...font.mono, fontSize: 9, color: colors.dim },
  cell: { width: CELL, height: 38, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 17, height: 17, borderRadius: 9 },
  dash: { width: 8, height: 2, borderRadius: 1, backgroundColor: colors.line2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  shots: { gap: 10, paddingTop: 12 },
  shot: {
    width: 120,
    aspectRatio: 3 / 4,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shotDate: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: onPhoto.scrim,
  },
  shotDateText: { ...font.semibold, fontSize: 11.5, color: colors.text },
});
