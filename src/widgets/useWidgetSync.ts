import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useStore } from '@/data/store';
import { todayKey } from '@/logic/dates';
import { dayInfo, nextUp, slotPct } from '@/logic/scoring';

/** Push today's summary to the home-screen widget whenever the log or routine changes. */
export function useWidgetSync() {
  const s = useStore();
  useEffect(() => {
    if (!s || Platform.OS !== 'ios') return;
    const t = setTimeout(async () => {
      try {
        const { default: TodayWidget } = await import('./TodayWidget');
        const k = todayKey();
        const x = dayInfo(k, s.config, s.steps, s.days[k]);
        const up = nextUp(x);
        const water = s.steps.find((z) => z.type === 'water');
        TodayWidget.updateSnapshot({
          p: x.p,
          next: up ? up.step.name : 'Every step done',
          nextSlot: up ? { am: 'Morning', pm: 'Night', health: 'Health' }[up.slot] : 'Health',
          am: slotPct(x.slot.am),
          pm: slotPct(x.slot.pm),
          health: slotPct(x.slot.health),
          waterMl: x.water,
          waterGoal: water?.goal || 3000,
          done: x.total > 0 && x.n === x.total,
        });
      } catch {
        // An older build without the widget extension: nothing to update.
      }
    }, 800);
    return () => clearTimeout(t);
  }, [s]);
}
