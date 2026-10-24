// What to remind about, worked out from the routine and log. Pure so it can be tested.
import type { Config, Day, Step } from '@/db/types';
import { addDays, diffDays, parseKey, todayKey } from '@/logic/dates';
import { dayInfo } from '@/logic/scoring';
import { products, shelfState, type ShelfRecord } from '@/logic/shelf';
import { sunAdvice, type SunDay } from '@/sun/sun';

export type Reminder = {
  /** Stable id so re-planning replaces instead of duplicating */
  id: string;
  kind: 'routine' | 'checkin' | 'spf' | 'restock';
  /** Day key and local time it fires at, in whatever time zone the phone is in */
  date: string;
  hour: number;
  minute: number;
  title: string;
  body: string;
  data: { kind: 'routine' | 'checkin' | 'spf' | 'restock'; slot?: 'am' | 'pm'; date: string; id?: string };
  /** Exact moment (epoch ms) for one-off nudges like SPF; otherwise date + hour:minute. */
  at?: number;
};

/** How many days ahead to keep reminders queued. iOS allows 64 pending; this uses at most ~30. */
export const DAYS_AHEAD = 14;

/** Check-in due reminder, at the morning reminder time on the day it's due. */
export const CHECKIN_REMINDERS_LIVE = true;

const NAMES = { am: 'Morning', pm: 'Night' } as const;

export const parseTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return { hour: Number.isFinite(h) ? h : 9, minute: Number.isFinite(m) ? m : 0 };
};

const plural = (n: number) => `${n} ${n === 1 ? 'step' : 'steps'}`;

export function buildPlan(
  config: Config,
  steps: Step[],
  days: Record<string, Day>,
  opts: {
    now?: Date;
    lastCheckin?: string | null;
    sun?: SunDay | null;
    /** Products that just ran low, with when to mention it (planned once per bottle). */
    restock?: RestockItem[];
  } = {},
): Reminder[] {
  const now = opts.now ?? new Date();
  const today = todayKey();
  const out: Reminder[] = [];

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const k = addDays(today, i);
    const info = dayInfo(k, config, steps, days[k], today);

    for (const slot of ['am', 'pm'] as const) {
      const { hour, minute } = parseTime(config.reminders[slot]);
      const at = parseKey(k);
      at.setHours(hour, minute, 0, 0);
      if (at <= now) continue;

      const z = info.slot[slot];
      if (!z.n) continue;
      if (z.d >= z.n) continue; // already finished: no nudge

      const left = z.n - z.d;
      const next = info.exp.find((s) => s.slot === slot && s.type !== 'water' && !info.done[s.id]);
      const body =
        i === 0 && z.d > 0
          ? `${plural(left)} left.${next ? ` Next: ${next.name}.` : ''}`
          : `${plural(z.n)} on your list.${next ? ` Start with ${next.name}.` : ''}`;

      out.push({
        id: `routine-${slot}-${k}`,
        kind: 'routine',
        date: k,
        hour,
        minute,
        title: `${NAMES[slot]} routine`,
        body: info.flags.travel ? `Travel day: ${body}` : body,
        data: { kind: 'routine', slot, date: k },
      });
    }
  }

  // One SPF reapply nudge during today's strong sun, only after sunscreen was ticked.
  const sun = opts.sun;
  if (config.spfNudge && sun && sun.date === today) {
    const ss = steps.find((s) => s.slot === 'am' && /sunscreen|spf/i.test(`${s.name} ${s.product}`));
    const spfAt = ss ? days[today]?.done?.[ss.id] : undefined;
    if (spfAt) {
      const { reapplyAt } = sunAdvice(sun, spfAt, days[today]?.spf ?? [], now.getTime());
      if (reapplyAt && reapplyAt > now.getTime())
        out.push({
          id: `spf-${today}-${reapplyAt}`,
          kind: 'spf',
          date: today,
          hour: new Date(reapplyAt).getHours(),
          minute: new Date(reapplyAt).getMinutes(),
          at: reapplyAt,
          title: 'Time to reapply SPF',
          body: `UV is ${Math.round(sun.peak)} today. If you’re outside, reapply face and body, then tap “Reapplied SPF”.`,
          data: { kind: 'spf', date: today },
        });
    }
  }

  for (const r of opts.restock ?? []) {
    if (r.at <= now.getTime()) continue;
    const d = new Date(r.at);
    out.push({
      id: `restock-${r.id}`,
      kind: 'restock',
      date: todayKey(),
      hour: d.getHours(),
      minute: d.getMinutes(),
      at: r.at,
      title: r.empty ? `${r.name} is probably finished` : `Restock soon: ${r.name}`,
      body: r.empty
        ? 'Tap to check how full it really is, or mark a new one opened.'
        : `About ${r.left} days left at your pace. Add it to your list.`,
      data: { kind: 'restock', date: todayKey(), id: r.id },
    });
  }

  if (CHECKIN_REMINDERS_LIVE) {
    const every = config.checkinEvery || 3;
    let due = opts.lastCheckin ? addDays(opts.lastCheckin, every) : today;
    if (due < today) due = today; // overdue: remind today
    const { hour, minute } = parseTime(config.reminders.am);
    const at = parseKey(due);
    at.setHours(hour, minute, 0, 0);
    if (at <= now) due = addDays(due, 1);
    if (diffDays(today, due) < DAYS_AHEAD) {
      out.push({
        id: `checkin-${due}`,
        kind: 'checkin',
        date: due,
        hour,
        minute,
        title: 'Skin check-in due',
        body: 'Three quick photos and five sliders. Same light as last time if you can.',
        data: { kind: 'checkin', date: due },
      });
    }
  }

  return out;
}

export type RestockItem = { id: string; name: string; at: number; left: number | null; empty: boolean };

/**
 * Products that are low get one reminder per bottle, at the next morning reminder time.
 * Returns what to schedule plus the marks to save on each product (so it's only planned once).
 */
export function restockPlan(
  config: Config,
  steps: Step[],
  days: Record<string, Day>,
  shelf: Record<string, ShelfRecord>,
  now = Date.now(),
) {
  const items: RestockItem[] = [];
  const marks: { id: string; patch: Partial<ShelfRecord> }[] = [];
  for (const p of products(steps, shelf)) {
    const x = shelfState(p, shelf[p.id], config, days);
    if (!x.opened || (x.status !== 'low' && x.status !== 'empty')) continue;
    let at = x.r.warnedFor === x.opened ? (x.r.warnAt ?? 0) : 0;
    if (x.r.warnedFor !== x.opened) {
      const { hour, minute } = parseTime(config.reminders.am);
      const next = new Date(now);
      next.setHours(hour, minute, 0, 0);
      if (next.getTime() <= now + 60e3) next.setDate(next.getDate() + 1);
      at = next.getTime();
      marks.push({ id: p.id, patch: { warnedFor: x.opened, warnAt: at } });
    }
    if (at > now) items.push({ id: p.id, name: p.name, at, left: x.left, empty: x.status === 'empty' });
  }
  return { items, marks };
}
