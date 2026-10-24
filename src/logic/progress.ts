// Progress maths — ported from the web app (vProgress, monthStats, stepRows, timeline, weekBlocks, bodyCard).
import type { Config, Day, Step } from '@/db/types';
import type { SlotId } from '@/theme/tokens';

import { addDays, keyOf, parseKey } from './dates';
import { dayInfo, frac, type DayInfo, type DayStep } from './scoring';

export type InfoFn = (k: string) => DayInfo;

/** dayInfo with a per-render cache: every Progress card asks for the same days. */
export function infoCache(config: Config, steps: Step[], days: Record<string, Day>, today: string): InfoFn {
  const m = new Map<string, DayInfo>();
  return (k) => {
    let x = m.get(k);
    if (!x) {
      x = dayInfo(k, config, steps, days[k], today);
      m.set(k, x);
    }
    return x;
  };
}

export const inRange = (k: string, startedAt: string, today: string) => k >= startedAt && k <= today;

export const pct = (p: number) => Math.round(p * 100);

export type Range = 7 | 30 | 90 | 'all';
export const RANGES: [Range, string][] = [
  [7, 'Week'],
  [30, 'Month'],
  [90, '3 months'],
  ['all', 'All'],
];

export function rangeKeys(range: Range, startedAt: string, today: string) {
  let from = range === 'all' ? startedAt : addDays(today, -(range - 1));
  if (from < startedAt) from = startedAt;
  const out: string[] = [];
  for (let k = from; k <= today; k = addDays(k, 1)) out.push(k);
  return out;
}

/** Average over a window, ignoring days with nothing scheduled. */
export function rolling(vals: (number | null)[], w: number) {
  return vals.map((_, i) => {
    const s = vals.slice(Math.max(0, i - w + 1), i + 1).filter((z): z is number => z != null);
    return s.length ? s.reduce((a, b) => a + b, 0) / s.length : null;
  });
}

export const WEEKDAYS_PLURAL = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

export type Miss = { step: DayStep; n: number; of: number; mostly: number | null };

export type SlotSummary = { id: SlotId; p: number; missedMost: [string, number] | null; spark: (number | null)[] };

export type Overview = {
  keys: string[];
  /** days in range with something scheduled */
  logged: number;
  avg: number;
  prevAvg: number | null;
  /** percentage points vs the previous period of the same length */
  delta: number | null;
  perfect: number;
  top: Miss[];
  slots: SlotSummary[];
  /** each day's %, null when nothing was scheduled */
  vals: (number | null)[];
  avg7: (number | null)[];
};

export function overview(keys: string[], info: InfoFn, days: Record<string, Day>, startedAt: string): Overview {
  const today = keys[keys.length - 1];
  const infos = keys.map((k) => [k, info(k)] as const).filter(([, x]) => x.total);
  const avg = infos.length ? infos.reduce((a, [, x]) => a + x.p, 0) / infos.length : 0;
  const perfect = infos.filter(([, x]) => x.n === x.total).length;

  const len = keys.length;
  const prev: DayInfo[] = [];
  for (let i = len; i >= 1; i--) {
    const k = addDays(keys[0], -i);
    if (inRange(k, startedAt, today)) {
      const x = info(k);
      if (x.total) prev.push(x);
    }
  }
  const prevAvg = prev.length ? prev.reduce((a, b) => a + b.p, 0) / prev.length : null;
  const delta = prevAvg == null ? null : pct(avg) - pct(prevAvg);

  const miss: Record<string, Miss & { wd: number[] }> = {};
  for (const [k, x] of infos) {
    const w = parseKey(k).getDay();
    for (const st of x.exp) {
      const m = (miss[st.id] ??= { step: st, n: 0, of: 0, mostly: null, wd: [0, 0, 0, 0, 0, 0, 0] });
      m.of++;
      if (frac(st, days[k]) < 1) {
        m.n++;
        m.wd[w]++;
      }
    }
  }
  const top = Object.values(miss)
    .filter((m) => m.n > 0 && m.of >= 3)
    .sort((a, b) => b.n / b.of - a.n / a.of)
    .slice(0, 3)
    .map(({ wd, ...m }) => {
      const best = wd.indexOf(Math.max(...wd));
      return { ...m, mostly: wd[best] >= 2 && m.n >= 3 ? best : null };
    });

  const slots: SlotSummary[] = (['am', 'pm', 'health'] as const).map((id) => {
    let n = 0;
    let f = 0;
    const ms: Record<string, number> = {};
    for (const [k, x] of infos) {
      n += x.slot[id].n;
      f += x.slot[id].f;
      x.exp.filter((s) => s.slot === id && frac(s, days[k]) < 1).forEach((s) => (ms[s.name] = (ms[s.name] ?? 0) + 1));
    }
    const tp = Object.entries(ms).sort((a, b) => b[1] - a[1])[0] ?? null;
    const daily = keys.map((k) => {
      const z = info(k).slot[id];
      return z.n ? z.f / z.n : null;
    });
    return { id, p: n ? f / n : 0, missedMost: tp, spark: rolling(daily, 7) };
  });

  const vals = keys.map((k) => {
    const x = info(k);
    return x.total ? x.p : null;
  });
  return { keys, logged: infos.length, avg, prevAvg, delta, perfect, top, slots, vals, avg7: rolling(vals, 7) };
}

/** Average by weekday, Monday first. */
export function weeklyRhythm(keys: string[], info: InfoFn) {
  const sum = [0, 0, 0, 0, 0, 0, 0];
  const cnt = [0, 0, 0, 0, 0, 0, 0];
  let logged = 0;
  for (const k of keys) {
    const x = info(k);
    if (!x.total) continue;
    const w = (parseKey(k).getDay() + 6) % 7;
    sum[w] += x.p;
    cnt[w]++;
    logged++;
  }
  const avg = sum.map((v, i) => (cnt[i] ? v / cnt[i] : null));
  const has = avg.map((v, i) => [v, i] as const).filter(([v]) => v != null) as [number, number][];
  const best = has.length ? has.reduce((a, b) => (b[0] > a[0] ? b : a))[1] : null;
  const worst = has.length ? has.reduce((a, b) => (b[0] < a[0] ? b : a))[1] : null;
  return { avg, best, worst, enough: logged > 6 };
}

/** The 7 days up to `k`. */
export function weekBlocks(k: string, info: InfoFn, startedAt: string, today: string) {
  let sum = 0;
  let cnt = 0;
  const out: { k: string; p: number | null }[] = [];
  for (let i = -6; i <= 0; i++) {
    const kk = addDays(k, i);
    const x = inRange(kk, startedAt, today) ? info(kk) : null;
    if (x?.total) {
      sum += x.p;
      cnt++;
    }
    out.push({ k: kk, p: x?.total ? x.p : null });
  }
  return { days: out, avg: cnt ? sum / cnt : 0 };
}

export type StepRow = { step: Step; n: number; p: number; missed: number; cells: ('d' | 'm' | '')[] };

/** Every counted step over the last 30 days of the range, weakest first. */
export function stepRows(keys: string[], info: InfoFn, steps: Step[], days: Record<string, Day>) {
  const ks = keys.slice(-30);
  const m = new Map<string, { step: Step; n: number; f: number; cells: StepRow['cells'] }>();
  steps.filter((s) => s.on !== 'optional').forEach((s) => m.set(s.id, { step: s, n: 0, f: 0, cells: [] }));
  for (const k of ks) {
    const ids = new Set(info(k).exp.map((s) => s.id));
    for (const a of m.values()) {
      if (ids.has(a.step.id)) {
        const v = frac(a.step, days[k]);
        a.n++;
        a.f += v;
        a.cells.push(v >= 1 ? 'd' : 'm');
      } else a.cells.push('');
    }
  }
  return {
    days: ks.length,
    rows: [...m.values()]
      .filter((a) => a.n)
      .map((a) => ({ step: a.step, n: a.n, p: a.f / a.n, missed: a.n - Math.round(a.f), cells: a.cells }))
      .sort((a, b) => a.p - b.p),
  };
}

/** Local hour (with minutes as a fraction) in a time zone; falls back to the phone's zone. */
export function hourIn(ms: number, tz?: string | null) {
  try {
    const s = new Date(ms).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      ...(tz ? { timeZone: tz } : {}),
    });
    const [h, m] = s.split(':').map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) return h + m / 60;
  } catch {}
  const d = new Date(ms);
  return d.getHours() + d.getMinutes() / 60;
}

/** Position on a 05:00 → 01:00 axis, 0..1. */
export const dayX = (h: number) => Math.max(0, Math.min(1, ((h < 5 ? h + 24 : h) - 5) / 20));

export type Mark = { x: number; at: number; label: string };

/** When each step (and activity) was done that day, in the time zone it happened in. */
export function timeline(d: Day | undefined, steps: Step[]) {
  const by = new Map(steps.map((s) => [s.id, s]));
  const rows: Record<SlotId | 'activity', Mark[]> = { am: [], pm: [], health: [], activity: [] };
  for (const [id, at] of Object.entries(d?.done ?? {})) {
    if (typeof at !== 'number') continue;
    const live = by.get(id);
    const def = d?.defs?.[id];
    const slot = live?.slot ?? def?.s;
    if (!slot) continue;
    rows[slot].push({ x: dayX(hourIn(at, d?.tz)), at, label: live?.name ?? def?.n ?? 'Step' });
  }
  for (const a of d?.activity ?? []) rows.activity.push({ x: dayX(hourIn(a.at, d?.tz)), at: a.at, label: a.type });
  return rows;
}

export const monthKeys = (mk: string) => {
  const [y, m] = mk.split('-').map(Number);
  const dim = new Date(y, m, 0).getDate();
  return Array.from({ length: dim }, (_, i) => keyOf(new Date(y, m - 1, i + 1)));
};

export const monthOf = (k: string) => k.slice(0, 7);

export const shiftMonth = (mk: string, n: number) => {
  const [y, m] = mk.split('-').map(Number);
  return keyOf(new Date(y, m - 1 + n, 1)).slice(0, 7);
};

export type MonthStats = {
  ks: string[];
  avg: number | null;
  cnt: number;
  perfect: number;
  bestRun: number;
  /** ml per day on days water was expected */
  water: number | null;
  best: { step: DayStep; p: number } | null;
  worst: { step: DayStep; p: number } | null;
};

export function monthStats(
  mk: string,
  info: InfoFn,
  days: Record<string, Day>,
  startedAt: string,
  today: string,
): MonthStats {
  const ks = monthKeys(mk);
  let sum = 0;
  let cnt = 0;
  let perfect = 0;
  let run = 0;
  let bestRun = 0;
  let wat = 0;
  let watN = 0;
  const st: Record<string, { step: DayStep; n: number; f: number }> = {};
  for (const k of ks) {
    if (!inRange(k, startedAt, today)) {
      run = 0;
      continue;
    }
    const x = info(k);
    if (!x.total) continue;
    sum += x.p;
    cnt++;
    if (x.n === x.total) perfect++;
    if (x.p >= 0.8) bestRun = Math.max(bestRun, ++run);
    else run = 0;
    if (x.exp.some((s) => s.type === 'water')) {
      wat += x.water;
      watN++;
    }
    for (const s of x.exp) {
      const a = (st[s.id] ??= { step: s, n: 0, f: 0 });
      a.n++;
      a.f += frac(s, days[k]);
    }
  }
  const arr = Object.values(st)
    .filter((a) => a.n >= 3)
    .map((a) => ({ step: a.step, p: a.f / a.n }))
    .sort((a, b) => b.p - a.p);
  return {
    ks,
    avg: cnt ? sum / cnt : null,
    cnt,
    perfect,
    bestRun,
    water: watN ? wat / watN : null,
    best: arr[0] ?? null,
    worst: arr.length > 1 ? arr[arr.length - 1] : null,
  };
}

/** Monday of the week containing `k` (weekly reviews are keyed by it). */
export const weekStart = (k: string) => addDays(k, -((parseKey(k).getDay() + 6) % 7));

export const bmiOf = (kg: number, cm?: number) => (cm ? kg / Math.pow(cm / 100, 2) : null);

export const bmiCat = (b: number): [string, 'on' | 'warn'] =>
  b < 18.5
    ? ['Below the healthy range', 'warn']
    : b < 25
      ? ['Healthy range', 'on']
      : b < 30
        ? ['Above the healthy range', 'warn']
        : ['Well above the healthy range', 'warn'];

/** +0.4 / −0.4 / ±0 */
export const signed = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '±0');
