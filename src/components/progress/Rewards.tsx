import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { Columns } from '@/components/Columns';
import { GoalBar } from '@/components/glow/GoalBar';
import { Medal } from '@/components/glow/Medal';
import { useLayout } from '@/components/layout';
import { Icon } from '@/components/bits';
import { ORB_THEMES } from '@/components/glow/AuraOrb';
import { Lune } from '@/components/Lune';
import { useStore } from '@/data/store';
import type { LuneOutfit, OrbTheme } from '@/db/types';
import { QuestsCard } from '@/components/today/QuestsCard';
import { Card, T } from '@/components/ui';
import { LEVELS, levelStart, UNLOCKS, type Rewards } from '@/logic/rewards';
import { AURA, colors, font, radius } from '@/theme/tokens';

const enter = (i: number) => FadeInDown.duration(360).delay(50 * Math.min(i, 8));

/** Level ring: the aura gradient filling towards the next level. */
function LevelRing({ p, n }: { p: number; n: number }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  return (
    <View style={styles.ring}>
      <Svg viewBox="0 0 74 74" width={74} height={74}>
        <Defs>
          <SvgGradient id="lv" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={AURA[0]} />
            <Stop offset="0.55" stopColor={AURA[1]} />
            <Stop offset="1" stopColor={AURA[2]} />
          </SvgGradient>
        </Defs>
        <Circle cx={37} cy={37} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={5} />
        <Circle
          cx={37}
          cy={37}
          r={r}
          fill="none"
          stroke="url(#lv)"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={`${(c * Math.max(0.02, p)).toFixed(1)} ${c.toFixed(1)}`}
          transform="rotate(-90 37 37)"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={styles.ringNum}>{n}</Text>
      </View>
    </View>
  );
}

const OUTFIT_NAMES: Record<LuneOutfit, string> = {
  none: 'Just Lune',
  bow: 'Pink bow',
  headband: 'Spa headband',
  flowers: 'Flower crown',
  sunnies: 'Sunglasses',
  scarf: 'Aura scarf',
  crown: 'Golden crown',
};
const ORB_NAMES: Record<OrbTheme, string> = {
  aura: 'Aura',
  dawn: 'Dawn',
  ocean: 'Ocean',
  night: 'Night',
  gold: 'Gold',
  pearl: 'Pearl',
};

/** Every level, what it takes and what it unlocks. The road keeps going after Celestial. */
function LevelRoad({ r }: { r: Rewards }) {
  return (
    <Card>
      <T variant="h2">Level road</T>
      <T variant="sub">Every step earns XP. Each level unlocks something for Lune or your orb.</T>
      <View style={{ marginTop: 10 }}>
        {LEVELS.map((name, i) => {
          const n = i + 1;
          const got = r.level.n >= n;
          const cur = r.level.n === n;
          const u = UNLOCKS.find((x) => x.level === n);
          return (
            <View key={name} style={[styles.road, cur && styles.roadCur]}>
              <View style={[styles.roadDot, got && styles.roadDotOn]}>
                {got ? (
                  <LinearGradient
                    colors={AURA}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
                <Text style={[styles.roadNum, got && { color: '#FFFFFF' }]}>{n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.roadName, !got && { color: colors.muted }]}>
                  {name}
                  {cur ? <Text style={styles.roadYou}> · you are here</Text> : null}
                </Text>
                <Text style={styles.roadSub}>
                  {levelStart(n).toLocaleString('en-GB')} XP
                  {u ? ` · unlocks ${u.name}` : n === 1 ? ' · where everyone starts' : ''}
                </Text>
              </View>
              {u ? (
                <Icon name={got ? 'lock.open.fill' : 'lock.fill'} size={13} color={got ? colors.sage : colors.dim} />
              ) : null}
            </View>
          );
        })}
        <Text style={styles.beyond}>
          After Celestial the road keeps going: Celestial 2, 3, 4… every 3,600 XP or so.
        </Text>
      </View>
    </Card>
  );
}

/** Pick what Lune wears and the orb's colours from what you've unlocked. */
function Wardrobe({ r }: { r: Rewards }) {
  const s = useStore()!;
  const look = s.config.look ?? {};
  const outfits: LuneOutfit[] = ['none', ...UNLOCKS.filter((u) => u.kind === 'outfit').map((u) => u.id as LuneOutfit)];
  const orbs: OrbTheme[] = ['aura', ...UNLOCKS.filter((u) => u.kind === 'orb').map((u) => u.id as OrbTheme)];
  const need = (id: string) => UNLOCKS.find((u) => u.id === id)?.level ?? 1;
  const set = (patch: { outfit?: LuneOutfit; orb?: OrbTheme }) => {
    Haptics.selectionAsync();
    s.updateConfig({ look: { ...look, ...patch } });
  };
  return (
    <Card>
      <T variant="h2">Lune’s wardrobe</T>
      <T variant="sub">Unlocked by levels. Tap one to wear it.</T>
      <View style={styles.wear}>
        {outfits.map((o) => {
          const ok = r.level.n >= need(o);
          const on = (look.outfit ?? 'none') === o;
          return (
            <Pressable
              key={o}
              disabled={!ok}
              onPress={() => set({ outfit: o })}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: !ok }}
              accessibilityLabel={ok ? OUTFIT_NAMES[o] : `${OUTFIT_NAMES[o]}, unlocks at level ${need(o)}`}
              style={[styles.wearItem, on && styles.wearOn]}>
              {ok ? <Lune size={56} still outfit={o} /> : <Icon name="lock.fill" size={18} color={colors.dim} />}
              <Text style={[styles.wearName, !ok && { color: colors.dim }]} numberOfLines={1}>
                {ok ? OUTFIT_NAMES[o] : `Level ${need(o)}`}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <T variant="h2" style={{ marginTop: 14 }}>
        Orb colours
      </T>
      <View style={styles.orbs}>
        {orbs.map((o) => {
          const ok = r.level.n >= need(o);
          const on = (look.orb ?? 'aura') === o;
          const c = ORB_THEMES[o];
          return (
            <Pressable
              key={o}
              disabled={!ok}
              onPress={() => set({ orb: o })}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: !ok }}
              accessibilityLabel={ok ? `${ORB_NAMES[o]} orb` : `${ORB_NAMES[o]} orb, unlocks at level ${need(o)}`}
              style={styles.orbItem}>
              <View style={[styles.orb, on && styles.orbOn]}>
                <LinearGradient
                  colors={[c[1], c[2], c[3]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {ok ? null : <Icon name="lock.fill" size={14} color="#FFFFFF" />}
              </View>
              <Text style={[styles.wearName, !ok && { color: colors.dim }]}>{ok ? ORB_NAMES[o] : `Lv ${need(o)}`}</Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

/** Personal bests: things that only go up. */
function Records({ r }: { r: Rewards }) {
  const rec = r.records;
  const items: [string, string][] = [
    [String(rec.bestStreak), 'best streak'],
    [String(rec.perfectDays), 'perfect days'],
    [rec.bestWeek.toLocaleString('en-GB'), 'best week XP'],
    [rec.steps.toLocaleString('en-GB'), 'steps done'],
    [`${rec.litres}`, 'litres of water'],
    [String(rec.daysLogged), 'days logged'],
  ];
  return (
    <Card>
      <T variant="h2">Your records</T>
      <View style={styles.recs}>
        {items.map(([v, l]) => (
          <View key={l} style={styles.rec}>
            <Text style={styles.recNum}>{v}</Text>
            <Text style={styles.recLabel}>{l}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Level, today's quests, the league against your own past weeks, and every badge. */
export function RewardsView({ r }: { r: Rewards }) {
  const { columns } = useLayout();
  const outfit = useStore()?.config.look?.outfit;
  const next = LEVELS[r.level.n] ?? `${r.level.name} ${r.level.n - LEVELS.length + 2}`;
  const toNext = r.level.to - r.total;
  const got = r.badges.filter((b) => b.got).length;
  const you = r.league.find((w) => w.you)!;
  const above = r.league.find((w) => w.rank === you.rank - 1);
  const perRow = columns >= 3 ? 6 : columns === 2 ? 4 : 3;

  return (
    <View style={{ gap: 14 }}>
      <Animated.View entering={enter(0)} style={styles.level}>
        <LevelRing p={r.level.p} n={r.level.n} />
        <View style={{ flex: 1 }}>
          <Text style={styles.levelName}>
            Level {r.level.n} · {r.level.name}
          </Text>
          <Text style={styles.levelSub}>
            {r.total.toLocaleString('en-GB')} XP · {toNext} to {next}
          </Text>
          <View style={styles.levelBar}>
            <GoalBar p={r.level.p} height={6} />
          </View>
        </View>
        <Lune mood="happy" size={62} still outfit={outfit} />
      </Animated.View>

      <Columns max={2}>
        <Animated.View entering={enter(1)}>
          <QuestsCard day={r.today} />
        </Animated.View>
        <Animated.View entering={enter(2)}>
          <Card>
            <T variant="h2">Glow league</T>
            <T variant="sub">
              {you.rank === 1
                ? 'This week is your best of the last five. Keep it there.'
                : above
                  ? `${above.xp - you.xp + 1} XP to pass ${above.label.toLowerCase()}.`
                  : 'You against your own past weeks.'}
            </T>
            <View style={styles.league}>
              {r.league.map((w) => (
                <View
                  key={w.week}
                  style={[styles.lrow, w.you && styles.lrowYou]}
                  accessible
                  accessibilityLabel={`${w.rank}. ${w.label}, ${w.xp} XP`}>
                  <View style={[styles.rank, w.you && styles.rankYou]}>
                    {w.you ? (
                      <LinearGradient
                        colors={AURA}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    ) : null}
                    <Text style={[styles.rankText, w.you && { color: '#FFFFFF' }]}>{w.rank}</Text>
                  </View>
                  <Text style={[styles.lname, w.you && { color: colors.onInk }]}>{w.label}</Text>
                  <Text style={[styles.lxp, w.you && { color: colors.onInk }]}>{w.xp} XP</Text>
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>
      </Columns>

      <Animated.View entering={enter(3)}>
        <Card>
          <View style={styles.bhead}>
            <T variant="h2">Badges</T>
            <T variant="label">
              {got} of {r.badges.length}
            </T>
          </View>
          <View style={styles.grid}>
            {r.badges.map((b) => (
              <View
                key={b.id}
                style={[styles.badge, { width: `${100 / perRow}%` }]}
                accessible
                accessibilityLabel={`${b.name}: ${b.desc}. ${b.got ? 'Earned' : `${b.have} of ${b.need}`}`}>
                <Medal badge={b} />
                <Text style={[styles.bname, !b.got && { color: colors.muted }]} numberOfLines={1}>
                  {b.name}
                </Text>
                <Text style={styles.bdesc} numberOfLines={2}>
                  {b.got ? b.desc : `${b.have}/${b.need}`}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </Animated.View>

      <Columns max={2}>
        <Animated.View entering={enter(4)}>
          <Wardrobe r={r} />
        </Animated.View>
        <Animated.View entering={enter(5)}>
          <Records r={r} />
        </Animated.View>
      </Columns>
      <Animated.View entering={enter(6)}>
        <LevelRoad r={r} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  road: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 18,
  },
  roadCur: { backgroundColor: colors.fill },
  roadDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
    overflow: 'hidden',
  },
  roadDotOn: {},
  roadNum: { ...font.bold, fontSize: 13, color: colors.muted },
  roadName: { ...font.semibold, fontSize: 15.5, color: colors.text },
  roadYou: { ...font.medium, fontSize: 12.5, color: colors.rose },
  roadSub: { ...font.regular, fontSize: 12.5, color: colors.dim, marginTop: 1 },
  beyond: { ...font.regular, fontSize: 12.5, color: colors.muted, marginTop: 8, paddingHorizontal: 8 },
  wear: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  wearItem: {
    width: 86,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.fill,
    gap: 2,
    minHeight: 92,
    justifyContent: 'center',
  },
  wearOn: { borderWidth: 2, borderColor: colors.ink },
  wearName: { ...font.medium, fontSize: 11, color: colors.text },
  orbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  orbItem: { alignItems: 'center', gap: 4 },
  orb: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  orbOn: { borderWidth: 2.5, borderColor: colors.ink },
  recs: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  rec: { width: '33.33%', paddingVertical: 10 },
  recNum: { ...font.thin, fontSize: 30, letterSpacing: -1, color: colors.text, fontVariant: ['tabular-nums'] },
  recLabel: { ...font.medium, fontSize: 12, color: colors.muted },
  center: { alignItems: 'center', justifyContent: 'center' },
  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: colors.ink,
  },
  ring: { width: 74, height: 74 },
  ringNum: { ...font.light, fontSize: 28, color: colors.onInk },
  levelName: { ...font.semibold, fontSize: 18, color: colors.onInk },
  levelSub: { ...font.regular, fontSize: 13, color: colors.dim, marginTop: 2 },
  levelBar: { flexDirection: 'row', marginTop: 10 },
  league: { marginTop: 10, gap: 2 },
  lrow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 22 },
  lrowYou: { backgroundColor: colors.ink },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
    overflow: 'hidden',
  },
  rankYou: { backgroundColor: 'transparent' },
  rankText: { ...font.bold, fontSize: 13, color: colors.text },
  lname: { ...font.medium, fontSize: 15, color: colors.text, flex: 1 },
  lxp: { ...font.mono, fontSize: 14, color: colors.muted },
  bhead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginHorizontal: -4 },
  badge: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, gap: 6 },
  bname: { ...font.semibold, fontSize: 12.5, color: colors.text, textAlign: 'center' },
  bdesc: { ...font.regular, fontSize: 11, lineHeight: 14, color: colors.dim, textAlign: 'center', marginTop: -3 },
});
