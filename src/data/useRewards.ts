import { useMemo } from 'react';

import { todayKey } from '@/logic/dates';
import { rewardsFor, type Rewards } from '@/logic/rewards';

import { useStore } from './store';

/** XP, level, quests, league and badges, worked out from the whole log. */
export function useRewards(): Rewards | null {
  const s = useStore();
  const t = todayKey();
  return useMemo(
    () => (s ? rewardsFor(s.config, s.steps, s.days, s.checkins.map((c) => c.date), t) : null),
    [s?.config, s?.steps, s?.days, s?.checkins, t], // eslint-disable-line react-hooks/exhaustive-deps
  );
}
