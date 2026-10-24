// Routine check (ported from web routineCheck): suggestions only, nothing changes unless you tap.
import type { Step } from '@/db/types';

import { groupOf, isActive } from './scoring';

export type Fix = { label: string; apply: (steps: Step[]) => Step[]; done: string };

export type Suggestion = { id: string; tone: 'warn' | 'info'; title: string; body: string; fix?: Fix };

/** Move one step to just before another. */
export const moveBefore = (steps: Step[], id: string, beforeId: string) => {
  const st = steps.find((x) => x.id === id);
  if (!st) return steps;
  const rest = steps.filter((x) => x.id !== id);
  const j = rest.findIndex((x) => x.id === beforeId);
  if (j < 0) return steps;
  return [...rest.slice(0, j), st, ...rest.slice(j)];
};

/** Teeth, shower, hair wash, body, face, then leave-in hair products. Ties keep their order. */
export function groupSlot(steps: Step[], slot: Step['slot']) {
  const rank: Record<string, number> = {
    Teeth: 0,
    Shower: 1,
    Hair: 2,
    Body: 3,
    Face: 4,
    HairAfter: 5.5,
    Finish: 5,
    '': 6,
  };
  const list = steps
    .filter((x) => x.slot === slot)
    .map((x, ix) => {
      let g = groupOf(x);
      if (g === 'Hair' && /oil|styl|serum|scalp|gum|gel|wax/i.test(x.name)) g = 'HairAfter';
      return { x, ix, g };
    })
    .sort((p, q) => rank[p.g] - rank[q.g] || p.ix - q.ix)
    .map((o) => o.x);
  let j = 0;
  return steps.map((x) => (x.slot === slot ? list[j++] : x));
}

export function routineCheck(steps: Step[]): Suggestion[] {
  const out: Suggestion[] = [];
  const am = steps.filter((s) => s.slot === 'am' && !s.paused);
  const pm = steps.filter((s) => s.slot === 'pm' && !s.paused);
  const txt = (s: Step) => `${s.name} ${s.product ?? ''}`;

  const ssI = am.findIndex((s) => /face/i.test(s.name) && /sunscreen|spf/i.test(txt(s)));
  const ss = am[ssI];
  if (ss) {
    am.slice(ssI + 1)
      .filter((s) => /serum|eye|moistur|cream|essence/i.test(txt(s)) && !/hair|body/i.test(s.name))
      .forEach((s) =>
        out.push({
          id: `order-${s.id}`,
          tone: 'warn',
          title: `${s.name} comes after sunscreen`,
          body: `Sunscreen goes last on the face so nothing dilutes or rubs it off. Moving ${s.name} before ${ss.name} keeps your SPF intact.`,
          fix: {
            label: `Move it before ${ss.name}`,
            apply: (list) => moveBefore(list, s.id, ss.id),
            done: `Moved “${s.name}”`,
          },
        }),
      );
  }

  const g = pm.map(groupOf).filter(Boolean);
  let changes = 0;
  for (let i = 1; i < g.length; i++) if (g[i] !== g[i - 1]) changes++;
  if (changes >= 6)
    out.push({
      id: 'group-pm',
      tone: 'info',
      title: 'Night order jumps around',
      body: `It switches between face, hair and body ${changes} times. Grouping it (teeth, shower, hair wash, body, face, then leave-in hair products) is quicker and nothing gets washed off.`,
      fix: { label: 'Group night steps', apply: (list) => groupSlot(list, 'pm'), done: 'Night steps grouped' },
    });

  const acts = pm.filter(isActive);
  if (acts.length >= 2)
    out.push({
      id: 'acids',
      tone: 'info',
      title: `${acts.length} acid steps on the same nights`,
      body: `${acts.map((a) => a.name).join(', ')} all run on ${acts.every((a) => a.on === 'shampoo') ? 'wash nights' : 'the same days'}. They hit different areas, which is fine. If skin stings, use “Skip actives” on Today for that night.`,
    });

  if (ss && !am.some((s) => /moistur|cream|lotion/i.test(txt(s))))
    out.push({
      id: 'no-am-moisturiser',
      tone: 'info',
      title: 'No morning moisturiser',
      body: 'Fine if your sunscreen feels comfortable. If your face feels tight by midday, especially after flights, add a light moisturiser before sunscreen.',
    });

  return out;
}
