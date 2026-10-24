// What the on-device model is told about the person: their routine, recent days, skin and body.
import type { Weighin } from '@/db/repo';
import type { Config, Day, Step } from '@/db/types';
import { addDays, todayKey, WD } from '@/logic/dates';
import { bmiOf, pct } from '@/logic/progress';
import { dayInfo, frac, streakCalc } from '@/logic/scoring';
import { lowItems, type ShelfItem } from '@/data/useShelf';
import { METRICS, type Checkin } from '@/skin/model';
import type { SunDay } from '@/sun/sun';

const RULE: Record<Step['on'], string> = {
  every: 'every day',
  shampoo: 'wash days',
  noshampoo: 'no-wash days',
  exfoliate: 'exfoliation days',
  noexfoliate: 'non-exfoliation days',
  optional: 'only if needed',
};

export type ContextInput = {
  config: Config;
  steps: Step[];
  days: Record<string, Day>;
  checkins: Checkin[];
  weighins: Weighin[];
  shelf: ShelfItem[];
  sun: SunDay | null;
};

/** Plain-text summary of the person's data, kept short enough for the on-device model. */
export function buildContext({ config: c, steps, days, checkins, weighins, shelf, sun }: ContextInput, maxDays = 14) {
  const t = todayKey();
  const lines: string[] = [];
  lines.push('Routine in order (step | routine | when | product | how):');
  for (const s of steps.filter((x) => !x.paused))
    lines.push(
      `- ${s.name} | ${s.slot === 'am' ? 'morning' : s.slot === 'pm' ? 'night' : 'health'} | ${RULE[s.on]}` +
        `${s.type === 'water' ? ` | goal ${s.goal || 3000} ml` : ''}${s.product ? ` | ${s.product}` : ''}${s.note ? ` | ${s.note}` : ''}`,
    );
  lines.push(`Wash days: ${c.shampooDays.map((d) => WD[d]).join(', ') || 'none'}. Exfoliants follow wash days.`);

  const x = dayInfo(t, c, steps, days[t]);
  const open = x.exp.filter((s) => frac(s, days[t]) < 1).map((s) => s.name);
  lines.push(
    `Today (${t}): ${x.n}/${x.total} steps, ${pct(x.p)}%. Water ${x.water} ml. Still open: ${open.join(', ') || 'nothing'}.`,
  );

  lines.push(`Last ${maxDays} days (date: % done; missed):`);
  for (let i = maxDays; i >= 1; i--) {
    const k = addDays(t, -i);
    if (k < c.startedAt) continue;
    const d = dayInfo(k, c, steps, days[k]);
    if (!d.total) continue;
    const missed = d.exp.filter((s) => frac(s, days[k]) < 1).map((s) => s.name);
    lines.push(`${k}: ${pct(d.p)}%; missed ${missed.join(', ') || 'none'}`);
  }
  const sk = streakCalc(c, steps, days, t);
  lines.push(`Streak ${sk.cur} days (best ${sk.best}).`);

  for (const ck of checkins.slice(0, 3))
    lines.push(
      `Skin check-in ${ck.date}: ${METRICS.map(([m, l]) => `${l.toLowerCase()} ${ck.scores[m] ?? '?'}/5`).join(', ')}` +
        `${ck.irritation !== 'none' ? `; ${ck.irritation} irritation` : ''}${ck.note ? `; note: ${ck.note}` : ''}`,
    );
  for (const w of weighins.slice(-3)) {
    const b = bmiOf(w.kg, c.heightCm);
    lines.push(`Weigh-in ${w.date}: ${w.kg} kg${b ? `, BMI ${b.toFixed(1)}` : ''}`);
  }
  if (c.place?.name) lines.push(`Location: ${c.place.name}${c.place.country ? `, ${c.place.country}` : ''}.`);
  if (sun) lines.push(`UV peak today ${Math.round(sun.peak)}.`);
  const low = lowItems(shelf);
  if (low.length) lines.push(`Running low: ${low.map((i) => i.p.name).join(', ')}.`);
  return lines.join('\n').slice(0, 7000);
}
