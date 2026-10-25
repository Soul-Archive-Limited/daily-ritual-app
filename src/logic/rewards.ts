// Rewards: XP, daily goal, levels, daily quests, a league against your own past weeks, and badges.
// Everything is worked out from the log itself (no extra stored state), so it syncs and matches on the website.
import type { Config, Day, Step } from '@/db/types';
import type { SlotId } from '@/theme/tokens';

import { addDays, parseKey } from './dates';
import { hourIn } from './progress';
import { dayInfo, isActive, type DayInfo } from './scoring';

export const XP = { step: 10, ritual: 20, perfect: 30, activity: 10, spf: 5, quest: 20, checkin: 25 } as const;

export type Quest = {
  id: string;
  title: string;
  /** 0..1 */
  p: number;
  done: boolean;
  xp: number;
  /** SF Symbol name */
  icon: string;
};

export type DayXP = {
  k: string;
  info: DayInfo;
  /** From ticked steps (water counts in part) */
  steps: number;
  /** Finished rituals, perfect day, activity, SPF, check-in, quests */
  bonus: number;
  total: number;
  /** XP for an 80% day: adapts to wash, no-wash and travel days */
  goal: number;
  quests: Quest[];
  /** Rituals (Morning / Night / Health) finished that day */
  rituals: SlotId[];
};

export type Level = { n: number; name: string; from: number; to: number; p: number };

export type LeagueRow = { week: string; label: string; xp: number; you: boolean; rank: number };

export type Badge = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  /** Theme colour name for the medal */
  tone: 'aura' | 'morning' | 'night' | 'health' | 'skin' | 'sage' | 'gold';
  have: number;
  need: number;
  got: boolean;
};

export type Rewards = {
  byDay: Record<string, DayXP>;
  today: DayXP;
  total: number;
  level: Level;
  league: LeagueRow[];
  badges: Badge[];
};

const SLOTS: SlotId[] = ['am', 'pm', 'health'];
const SPF_RE = /sunscreen|spf|uv doux/i;

/** Small stable hash so each day gets its own quests, the same on every device. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const round10 = (n: number) => Math.round(n / 10) * 10;

/** Today's three quests, picked from the ones that make sense for this day. */
export function questsFor(k: string, info: DayInfo, d: Day | undefined, steps: Step[]): Quest[] {
  const sl = info.slot;
  const water = info.exp.find((s) => s.type === 'water');
  const hasSpf = steps.some((s) => s.slot === 'am' && SPF_RE.test(`${s.name} ${s.product}`) && !s.paused);
  const amDoneBy10 = info.exp.filter(
    (s) => s.slot === 'am' && info.done[s.id] && hourIn(info.done[s.id], info.tz) < 10,
  ).length;
  const pool: (Omit<Quest, 'done' | 'xp'> | null)[] = [
    sl.am.n ? { id: 'am', title: 'Finish your morning ritual', p: sl.am.f / sl.am.n, icon: 'sun.max.fill' } : null,
    sl.pm.n ? { id: 'pm', title: 'Finish your night ritual', p: sl.pm.f / sl.pm.n, icon: 'moon.fill' } : null,
    water
      ? {
          id: 'water',
          title: `Drink ${((water.goal || 3000) / 1000).toFixed(1).replace(/\.0$/, '')} L of water`,
          p: Math.min(1, info.water / (water.goal || 3000)),
          icon: 'drop.fill',
        }
      : null,
    info.total ? { id: 'glow', title: 'Reach 80% today', p: Math.min(1, info.p / 0.8), icon: 'sparkles' } : null,
    info.total >= 4 ? { id: 'perfect', title: 'Do every step today', p: info.p, icon: 'star.fill' } : null,
    sl.am.n >= 2
      ? { id: 'early', title: 'Morning ritual done before 10:00', p: amDoneBy10 / sl.am.n, icon: 'sunrise.fill' }
      : null,
    { id: 'move', title: 'Log a run, workout or walk', p: d?.activity?.length ? 1 : 0, icon: 'figure.run' },
    hasSpf ? { id: 'spf', title: 'Reapply sunscreen once', p: d?.spf?.length ? 1 : 0, icon: 'sun.haze.fill' } : null,
    info.exp.some((s) => s.slot === 'pm' && isActive(s))
      ? {
          id: 'actives',
          title: 'Use your night actives',
          p: (() => {
            const a = info.exp.filter((s) => s.slot === 'pm' && isActive(s));
            return a.filter((s) => info.done[s.id]).length / a.length;
          })(),
          icon: 'flask.fill',
        }
      : null,
  ];
  return (pool.filter(Boolean) as Omit<Quest, 'done' | 'xp'>[])
    .sort((a, b) => hash(k + a.id) - hash(k + b.id))
    .slice(0, 3)
    .map((q) => ({ ...q, done: q.p >= 1, xp: XP.quest }));
}

/** XP earned on one day. */
export function dayXP(k: string, info: DayInfo, d: Day | undefined, steps: Step[], checkin: boolean): DayXP {
  let fromSteps = 0;
  for (const s of info.exp) {
    fromSteps += s.type === 'water' ? Math.min(1, info.water / (s.goal || 3000)) * XP.step : info.done[s.id] ? XP.step : 0;
  }
  fromSteps = Math.round(fromSteps);
  const rituals = SLOTS.filter((id) => info.slot[id].n > 0 && info.slot[id].d === info.slot[id].n);
  const quests = questsFor(k, info, d, steps);
  const bonus =
    rituals.length * XP.ritual +
    (info.total && info.p >= 1 ? XP.perfect : 0) +
    Math.min(2, d?.activity?.length ?? 0) * XP.activity +
    Math.min(2, d?.spf?.length ?? 0) * XP.spf +
    (checkin ? XP.checkin : 0) +
    quests.filter((q) => q.done).length * XP.quest;
  const goal = Math.max(50, round10(info.total * XP.step * 0.8 + XP.ritual));
  return { k, info, steps: fromSteps, bonus, total: fromSteps + bonus, goal, quests, rituals };
}

/** Level names: the glow grows. Each level needs 300 XP more than the last (Bloom in about two weeks, Celestial in about three months). */
export const LEVELS = [
  'Seed',
  'Sprout',
  'Dew',
  'Petal',
  'Bloom',
  'Glow',
  'Radiance',
  'Luster',
  'Aura',
  'Halo',
  'Luminous',
  'Celestial',
];

const levelStart = (n: number) => (300 * (n - 1) * n) / 2;

export function levelOf(xp: number): Level {
  let n = 1;
  while (levelStart(n + 1) <= xp) n++;
  const from = levelStart(n);
  const to = levelStart(n + 1);
  const name = n <= LEVELS.length ? LEVELS[n - 1] : `${LEVELS[LEVELS.length - 1]} ${n - LEVELS.length + 1}`;
  return { n, name, from, to, p: (xp - from) / (to - from) };
}

/** Monday of the week a day falls in. */
const mondayOf = (k: string) => addDays(k, -((parseKey(k).getDay() + 6) % 7));

const WEEK_LABELS = ['This week', 'Last week', '2 weeks ago', '3 weeks ago', '4 weeks ago'];

/** All rewards from the whole log. */
export function rewardsFor(
  config: Config,
  steps: Step[],
  days: Record<string, Day>,
  checkinDates: string[],
  today: string,
): Rewards {
  const checkins = new Set(checkinDates);
  const byDay: Record<string, DayXP> = {};
  let total = 0;

  // Streak walk (same rules as streakCalc) for streak badges, shields and comebacks.
  let run = 0;
  let best = 0;
  let shields = 0;
  let saved = 0;
  let hadLoss = false;
  let comeback = false;
  let perfect = 0;
  let waterDays = 0;
  let early = 0;
  let moon = 0;
  let travelGood = 0;
  let spf = 0;
  let moves = 0;
  const good = new Set<string>();

  for (let k = config.startedAt; k <= today; k = addDays(k, 1)) {
    const d = days[k];
    const info = dayInfo(k, config, steps, d, today);
    const x = dayXP(k, info, d, steps, checkins.has(k));
    byDay[k] = x;
    total += x.total;
    spf += d?.spf?.length ?? 0;
    moves += d?.activity?.length ?? 0;
    if (!info.total) continue;
    if (info.p >= 1) perfect++;
    const w = info.exp.find((s) => s.type === 'water');
    if (w && info.water >= (w.goal || 3000)) waterDays++;
    if (x.rituals.includes('pm')) moon++;
    if (x.rituals.includes('am')) {
      const last = Math.max(...info.exp.filter((s) => s.slot === 'am').map((s) => info.done[s.id] ?? 0));
      if (last && hourIn(last, info.tz) < 9) early++;
    }
    if (info.p >= 0.8) {
      good.add(k);
      if (info.flags.travel) travelGood++;
      run++;
      if (run % 7 === 0 && shields < 2) shields++;
      if (run > best) best = run;
      if (hadLoss && run >= 3) comeback = true;
    } else if (k < today) {
      if (run > 0 && shields > 0) {
        shields--;
        saved++;
      } else {
        if (run > 0) hadLoss = true;
        run = 0;
      }
    }
  }

  // A full Monday-to-Sunday week where every day counted.
  let fullWeek = false;
  for (const k of good) {
    if (parseKey(k).getDay() !== 1) continue;
    if (Array.from({ length: 7 }, (_, i) => addDays(k, i)).every((x) => good.has(x))) fullWeek = true;
  }

  const level = levelOf(total);
  const todayXP = byDay[today] ?? dayXP(today, dayInfo(today, config, steps, days[today], today), days[today], steps, false);

  // League: this week against your last four.
  const thisMon = mondayOf(today);
  const weeks = WEEK_LABELS.map((label, i) => {
    const mon = addDays(thisMon, -7 * i);
    let xp = 0;
    for (let j = 0; j < 7; j++) xp += byDay[addDays(mon, j)]?.total ?? 0;
    return { week: mon, label, xp, you: i === 0 };
  }).filter((w, i) => i === 0 || addDays(w.week, 6) >= config.startedAt);
  const league = [...weeks].sort((a, b) => b.xp - a.xp || (a.you ? -1 : 1)).map((w, i) => ({ ...w, rank: i + 1 }));

  const checkCount = checkinDates.length;
  const b = (
    id: string,
    name: string,
    desc: string,
    icon: string,
    tone: Badge['tone'],
    have: number,
    need: number,
  ): Badge => ({ id, name, desc, icon, tone, have: Math.min(have, need), need, got: have >= need });

  const badges: Badge[] = [
    b('s3', 'Spark', 'A 3-day streak', 'flame.fill', 'aura', best, 3),
    b('s7', 'One week', 'A 7-day streak', 'flame.fill', 'aura', best, 7),
    b('s14', 'Two weeks', 'A 14-day streak', 'flame.fill', 'aura', best, 14),
    b('s30', 'Month of glow', 'A 30-day streak', 'flame.fill', 'aura', best, 30),
    b('s60', 'Unstoppable', 'A 60-day streak', 'flame.fill', 'aura', best, 60),
    b('s100', 'Hundred', 'A 100-day streak', 'crown.fill', 'gold', best, 100),
    b('s365', 'Full orbit', 'A 365-day streak', 'globe.europe.africa.fill', 'gold', best, 365),
    b('p1', 'Flawless', 'Your first perfect day', 'star.fill', 'skin', perfect, 1),
    b('p10', 'Ten perfect', '10 perfect days', 'star.fill', 'skin', perfect, 10),
    b('p50', 'Perfectionist', '50 perfect days', 'star.circle.fill', 'gold', perfect, 50),
    b('w7', 'Hydrated', 'Water goal on 7 days', 'drop.fill', 'health', waterDays, 7),
    b('w30', 'Ocean', 'Water goal on 30 days', 'water.waves', 'health', waterDays, 30),
    b('early', 'Early bird', 'Morning ritual done before 9:00 on 5 days', 'sunrise.fill', 'morning', early, 5),
    b('moon', 'Moonlit', 'Night ritual finished 14 times', 'moon.stars.fill', 'night', moon, 14),
    b('c1', 'First look', 'Your first skin check-in', 'camera.fill', 'skin', checkCount, 1),
    b('c10', 'Skin story', '10 skin check-ins', 'photo.stack.fill', 'skin', checkCount, 10),
    b('shield', 'Saved', 'A shield kept your streak alive', 'shield.fill', 'night', saved, 1),
    b('comeback', 'Comeback', 'Started again and reached 3 days', 'arrow.uturn.up', 'sage', comeback ? 1 : 0, 1),
    b('week', 'Full week', 'Every day of a Monday-to-Sunday week counted', 'calendar', 'sage', fullWeek ? 1 : 0, 1),
    b('travel', 'Jet-set glow', 'A travel day that still counted', 'airplane', 'health', travelGood, 1),
    b('sun', 'Sun-safe', 'Reapplied sunscreen 10 times', 'sun.max.fill', 'morning', spf, 10),
    b('move', 'On the move', '10 runs, workouts or walks', 'figure.run', 'sage', moves, 10),
    b('bloom', 'In bloom', 'Reach level 5, Bloom', 'camera.macro', 'aura', level.n, 5),
    b('aura', 'Full aura', 'Reach level 9, Aura', 'sparkles', 'aura', level.n, 9),
  ];

  return { byDay, today: todayXP, total, level, league, badges };
}
