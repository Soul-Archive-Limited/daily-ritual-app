// Sample data for "Try the demo": a Classic starter routine with three weeks of made-up ticks.
// It lives only in this browser tab; nothing is sent anywhere.
import { starterSteps } from '@/data/starters';
import type { Config, Day } from '@/db/types';
import { addDays, todayKey } from '@/logic/dates';
import { liveExpected } from '@/logic/schedule';

import type { Data } from './data';

/** Small seeded random so the demo looks the same on every visit. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

export function demoData(): Data {
  const today = todayKey();
  const startedAt = addDays(today, -20);
  const config: Config = {
    name: 'Alex',
    startedAt,
    shampooDays: [1, 3, 5],
    exfoliateDays: [1, 3, 5],
    exfoliateMode: false,
    checkinEvery: 7,
    reminders: { am: '08:30', pm: '22:30' },
    heightCm: 175,
  };
  const steps = starterSteps('classic', 'combination').map((s, i) => ({ ...s, id: `d${i}` }));
  const rand = rng(7);
  const days: Record<string, Day> = {};
  for (let k = startedAt; k < today; k = addDays(k, 1)) {
    const done: Record<string, number> = {};
    const base = new Date(`${k}T00:00:00`).getTime();
    const good = rand() > 0.12;
    for (const s of liveExpected(k, config, steps)) {
      if (s.type === 'water') continue;
      if (rand() < (good ? 0.93 : 0.45)) done[s.id] = base + (s.slot === 'am' ? 8.5 : s.slot === 'pm' ? 22 : 13) * 36e5;
    }
    days[k] = {
      date: k,
      done,
      water: Math.round((good ? 2000 + rand() * 900 : 900 + rand() * 900) / 100) * 100,
      ...(rand() > 0.6 ? { activity: [{ type: 'run', at: base + 18 * 36e5 }] } : {}),
    };
  }
  // Today: the morning is done, the rest is waiting.
  const done: Record<string, number> = {};
  for (const s of liveExpected(today, config, steps)) if (s.slot === 'am') done[s.id] = Date.now() - 4 * 36e5;
  days[today] = { date: today, done, water: 1200 };
  return {
    config,
    steps,
    days,
    shelf: {},
    checkins: [{ id: 'c1', date: addDays(today, -6), scores: { overall: 4 } }],
    weighins: [
      { id: 'w1', date: addDays(today, -14), kg: 71.4, at: 0 },
      { id: 'w2', date: addDays(today, -7), kg: 70.9, at: 0 },
    ],
    reviews: [],
  };
}
