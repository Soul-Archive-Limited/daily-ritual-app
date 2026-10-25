import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BodyView } from '@/components/progress/Body';
import { MonthView } from '@/components/progress/Month';
import { OverviewView } from '@/components/progress/Overview';
import { RewardsView } from '@/components/progress/Rewards';
import { Screen } from '@/components/Screen';
import { Seg, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { useRewards } from '@/data/useRewards';
import { todayKey } from '@/logic/dates';
import { infoCache } from '@/logic/progress';
import { streakCalc } from '@/logic/scoring';
import { colors } from '@/theme/tokens';

type View_ = 'rewards' | 'overview' | 'month' | 'body';
const VIEWS: [View_, string][] = [
  ['rewards', 'Rewards'],
  ['overview', 'Overview'],
  ['month', 'Month'],
  ['body', 'Body'],
];

export default function Progress() {
  const s = useStore();
  const [view, setView] = useState<View_>('rewards');
  const rewards = useRewards();
  const t = todayKey();
  const info = useMemo(() => (s ? infoCache(s.config, s.steps, s.days, t) : null), [s, t]);
  const streak = useMemo(() => (s ? streakCalc(s.config, s.steps, s.days, t) : null), [s, t]);
  if (!s || !info || !streak || !rewards) return <View style={styles.screen} />;

  return (
    <Screen wide>
      <Animated.View entering={FadeInDown.duration(360)}>
        <Seg options={VIEWS} value={view} onChange={setView} label="Progress views" />
      </Animated.View>

      {!s.steps.length && view !== 'body' ? (
        <T variant="sub">Your routine is empty. Add steps on Routine and your progress fills in here.</T>
      ) : view === 'rewards' ? (
        <RewardsView r={rewards} />
      ) : view === 'overview' ? (
        <OverviewView info={info} today={t} streak={streak} />
      ) : view === 'month' ? (
        <MonthView info={info} today={t} />
      ) : (
        <BodyView today={t} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
});
