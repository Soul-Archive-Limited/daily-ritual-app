import type { Config, Day, DayFlags, Step, StepRule } from '@/db/types';

import { parseKey } from './dates';

/** Wash / exfoliate / travel flags for a day (ported from web flagsFor). */
export function flagsFor(k: string, config: Config, day?: Day): Required<DayFlags> {
  const wd = parseKey(k).getDay();
  const f = {
    shampoo: config.shampooDays.includes(wd),
    exfoliate: config.exfoliateDays.includes(wd),
    travel: false,
  };
  if (day?.flags) Object.assign(f, day.flags);
  if (!config.exfoliateMode) f.exfoliate = f.shampoo;
  f.travel = !!day?.flags?.travel;
  return f;
}

export function ruleOk(on: StepRule, f: DayFlags) {
  switch (on) {
    case 'shampoo':
      return !!f.shampoo;
    case 'noshampoo':
      return !f.shampoo;
    case 'exfoliate':
      return !!f.exfoliate;
    case 'noexfoliate':
      return !f.exfoliate;
    case 'optional':
      return false;
    default:
      return true;
  }
}

/** Steps that count today with the current routine (web liveExpected). */
export function liveExpected(k: string, config: Config, steps: Step[], day?: Day) {
  const f = flagsFor(k, config, day);
  return steps.filter((s) => !s.paused && ruleOk(s.on, f) && (!f.travel || s.essential));
}
