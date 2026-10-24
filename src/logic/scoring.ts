// Day scoring, snapshots and streak — ported from the web app (info, writeDay, streakCalc).
import type { Config, Day, Step, StepDef } from '@/db/types';
import type { SlotId } from '@/theme/tokens';

import { addDays, todayKey } from './dates';
import { flagsFor, liveExpected } from './schedule';

export const ACTIVE_RE = /\b(aha|bha|glycolic|lactic|lacsoft|salicylic|retin\w*|exfoli\w*|peel|acid)\b/i;
export const isActive = (s: Pick<Step, 'name' | 'product' | 'note'>) =>
  ACTIVE_RE.test(`${s.name} ${s.product ?? ''} ${s.note ?? ''}`);

export const MILES = [3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 365];

/** A step as it appears on a given day (from the live routine or the day's snapshot). */
export type DayStep = Step;

export type SlotScore = { n: number; d: number; f: number };

export type DayInfo = {
  exp: DayStep[];
  skipped: DayStep[];
  done: Record<string, number>;
  skip: Record<string, number>;
  tz: string | null;
  water: number;
  /** fully done steps */
  n: number;
  total: number;
  /** 0..1, water counts fractionally */
  p: number;
  slot: Record<SlotId, SlotScore>;
  flags: ReturnType<typeof flagsFor>;
};

const fromDef = (id: string, x?: StepDef): DayStep | null =>
  x ? { id, name: x.n, slot: x.s, product: x.p ?? '', note: '', on: 'every', type: x.t, goal: x.g } : null;

export function frac(s: DayStep, d?: Day) {
  if (s.type === 'water') return Math.min(1, (d?.water ?? 0) / (s.goal || 3000));
  return d?.done?.[s.id] ? 1 : 0;
}

export function dayInfo(k: string, config: Config, steps: Step[], d?: Day, today = todayKey()): DayInfo {
  const skip = d?.skip ?? {};
  const defs = d?.defs ?? {};
  const by: Record<string, Step> = {};
  steps.forEach((s) => (by[s.id] = s));
  const get = (id: string): DayStep | null => {
    const live = by[id];
    if (live) return live.type === 'water' && defs[id]?.g ? { ...live, goal: defs[id].g } : live;
    return fromDef(id, defs[id]);
  };

  // Past days use their own snapshot so routine edits never rewrite history.
  let exp: DayStep[] =
    d && Array.isArray(d.exp) && k < today
      ? (d.exp.map(get).filter(Boolean) as DayStep[])
      : liveExpected(k, config, steps, d);
  exp = exp.filter((s) => !skip[s.id]);
  const skipped = Object.keys(skip).map(get).filter(Boolean) as DayStep[];

  const done = d?.done ?? {};
  const slot: Record<SlotId, SlotScore> = {
    am: { n: 0, d: 0, f: 0 },
    pm: { n: 0, d: 0, f: 0 },
    health: { n: 0, d: 0, f: 0 },
  };
  let n = 0;
  let f = 0;
  for (const s of exp) {
    const sl = slot[s.slot] ?? slot.am;
    const x = frac(s, d);
    sl.n++;
    sl.f += x;
    f += x;
    if (x >= 1) {
      sl.d++;
      n++;
    }
  }
  return {
    exp,
    skipped,
    done,
    skip,
    tz: d?.tz ?? null,
    water: d?.water ?? 0,
    n,
    total: exp.length,
    p: exp.length ? f / exp.length : 0,
    slot,
    flags: flagsFor(k, config, d),
  };
}

export const slotPct = (z: SlotScore) => (z.n ? z.f / z.n : 0);

/**
 * Prepare a day for saving: snapshot expected ids + step definitions, score it.
 * Today (or a day whose type just changed) snapshots the live routine.
 * Other past days keep their existing snapshot, so editing the routine later never rewrites them.
 */
export function snapshotDay(
  doc: Day,
  config: Config,
  steps: Step[],
  opts: { tz?: string; place?: string; resnapshot?: boolean } = {},
): Day {
  const k = doc.date;
  const today = todayKey();
  const out: Day = { ...doc, done: { ...doc.done } };
  const skip = out.skip ?? {};

  if (k === today) {
    if (opts.tz) out.tz = opts.tz;
    if (opts.place) {
      const places = Array.isArray(out.places) ? [...out.places] : [];
      if (!places.includes(opts.place)) places.push(opts.place);
      out.places = places;
    }
  }

  const keepOld = k < today && !opts.resnapshot && Array.isArray(doc.exp) && doc.defs;
  let allIds: string[];
  if (keepOld) {
    // defs holds every step expected that day, including skipped ones.
    allIds = [...doc.exp!, ...Object.keys(doc.defs!).filter((id) => !doc.exp!.includes(id))];
  } else {
    const live = liveExpected(k, config, steps, out);
    allIds = live.map((s) => s.id);
    const defs: Record<string, StepDef> = {};
    for (const s of live) {
      defs[s.id] = {
        n: s.name,
        s: s.slot,
        ...(s.product ? { p: s.product } : {}),
        ...(s.type ? { t: s.type } : {}),
        ...(s.type === 'water' ? { g: s.goal || 3000 } : {}),
      };
    }
    out.defs = defs;
  }
  out.exp = allIds.filter((id) => !skip[id]);

  const info = dayInfo(k, config, steps, out, addDays(k, 1)); // score from the snapshot just made
  let f = 0;
  info.exp.forEach((s) => (f += frac(s, out)));
  out.pct = info.exp.length ? Math.round((f / info.exp.length) * 100) : 0;
  out.at = Date.now();
  return out;
}

export type Streak = {
  cur: number;
  best: number;
  shields: number;
  saved: string[];
  lost: { k: string; len: number } | null;
  todayGood: boolean;
};

/** A day counts at 80%. Every 7 in a row earns a shield (max 2); a shield covers one missed day. */
export function streakCalc(config: Config, steps: Step[], days: Record<string, Day>, today = todayKey()): Streak {
  let run = 0;
  let best = 0;
  let shields = 0;
  const saved: string[] = [];
  let lost: Streak['lost'] = null;
  for (let k = config.startedAt; k <= today; k = addDays(k, 1)) {
    const x = dayInfo(k, config, steps, days[k], today);
    if (!x.total) continue;
    if (x.p >= 0.8) {
      run++;
      if (run % 7 === 0 && shields < 2) shields++;
      if (run > best) best = run;
    } else if (k < today) {
      if (run > 0 && shields > 0) {
        shields--;
        saved.push(k);
      } else {
        if (run > 0) lost = { k, len: run };
        run = 0;
      }
    }
  }
  const tx = dayInfo(today, config, steps, days[today], today);
  return { cur: run, best, shields, saved, lost, todayGood: tx.total > 0 && tx.p >= 0.8 };
}

/** Next undone step for the time of day (web nextUp). */
export function nextUp(info: DayInfo, now = new Date()) {
  const order: SlotId[] = now.getHours() < 15 ? ['am', 'health', 'pm'] : ['pm', 'health', 'am'];
  for (const sl of order) {
    const s = info.exp.find((x) => x.slot === sl && x.type !== 'water' && !info.done[x.id]);
    if (s) return { step: s, slot: sl };
  }
  return null;
}

/** Which routine is open by default on Today. */
export const currentSlot = (now = new Date()): SlotId => {
  const h = now.getHours();
  return h >= 4 && h < 15 ? 'am' : 'pm';
};

/** Motivational line under the greeting: plain text with one highlighted part. */
export type Motive = { before: string; em?: string; after?: string };

export function motive(isToday: boolean, weekday: string, info: DayInfo, sk: Streak): Motive {
  const left = info.total - info.n;
  if (!info.total) return { before: 'Nothing scheduled for this day.' };
  if (left === 0)
    return isToday
      ? { before: 'Every step done. ', em: 'That’s a perfect day.' }
      : { before: 'Every step was done on this day.' };
  if (!isToday)
    return { before: `${info.n} of ${info.total} steps were logged on ${weekday}. Tap any step below to fix it.` };
  const need = Math.max(0, Math.ceil(info.total * 0.8 - info.p * info.total - 1e-9));
  const steps = (n: number) => `${n} ${n === 1 ? 'step' : 'steps'}`;
  if (info.p === 0) return { before: `${info.total} steps on today’s list. `, em: 'Start with the first one.' };
  if (sk.todayGood) return { before: 'Today already counts. ', em: `${steps(left)} left for a perfect day.` };
  if (sk.cur > 0)
    return {
      before: '',
      em: `${need} more ${need === 1 ? 'step' : 'steps'}`,
      after: ` keeps your ${sk.cur}-day streak alive.`,
    };
  return { before: '', em: `${need} more ${need === 1 ? 'step' : 'steps'}`, after: ' and today starts a streak.' };
}

const GROUPS: [string, RegExp][] = [
  ['Teeth', /teeth|brush|floss|mouth|tongue/i],
  ['Body', /\bbody\b|underarm|armpit|deodor/i],
  ['Hair', /hair|shampoo|condition|scalp|styl|gel\b|wax/i],
  ['Face', /face|eye|lip|serum|sunscreen|spf|cream|moistur|exfoli|toner|cleans/i],
  ['Shower', /shower|soap|body wash/i],
  ['Finish', /fragrance|parfum|perfume|cologne/i],
];

export const groupOf = (s: DayStep) => {
  if (s.type === 'water') return '';
  for (const [g, r] of GROUPS) if (r.test(s.name)) return g;
  return '';
};

/** Show group labels only for long lists whose order isn't too jumbled. */
export function groupLabels(order: DayStep[]): (string | null)[] {
  const groups = order.map(groupOf);
  let changes = 0;
  for (let j = 1; j < groups.length; j++) if (groups[j] && groups[j] !== groups[j - 1]) changes++;
  const show = order.length >= 6 && changes <= 4;
  return groups.map((g, j) => (show && g && g !== groups[j - 1] ? g : null));
}
