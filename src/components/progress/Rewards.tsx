import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { Columns } from '@/components/Columns';
import { GoalBar } from '@/components/glow/GoalBar';
import { Medal } from '@/components/glow/Medal';
import { useLayout } from '@/components/layout';
import { Lune } from '@/components/Lune';
import { QuestsCard } from '@/components/today/QuestsCard';
import { Card, T } from '@/components/ui';
import { LEVELS, type Rewards } from '@/logic/rewards';
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

/** Level, today's quests, the league against your own past weeks, and every badge. */
export function RewardsView({ r }: { r: Rewards }) {
  const { columns } = useLayout();
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
        <Lune mood="happy" size={62} still />
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
                      <LinearGradient colors={AURA} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
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
    </View>
  );
}

const styles = StyleSheet.create({
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
