import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GoalBar } from '@/components/glow/GoalBar';
import { QuestRing } from '@/components/glow/QuestRing';
import { Card, T } from '@/components/ui';
import type { DayXP } from '@/logic/rewards';
import { colors, font } from '@/theme/tokens';

/** Today's XP towards the daily goal, and the three daily quests. */
export function QuestsCard({ day }: { day: DayXP }) {
  const done = day.quests.filter((q) => q.done).length;
  return (
    <Card>
      <Pressable
        onPress={() => router.navigate('/progress')}
        accessibilityRole="button"
        accessibilityLabel={`Daily goal: ${day.total} of ${day.goal} XP. See rewards`}>
        <View style={styles.top}>
          <T variant="h2">Daily quests</T>
          <Text style={styles.count}>{done}/3</Text>
        </View>
        <View style={styles.goal}>
          <Text style={styles.xp}>
            {day.total}
            <Text style={styles.xpOf}> / {day.goal} XP</Text>
          </Text>
          <GoalBar p={day.total / day.goal} />
        </View>
      </Pressable>
      {day.quests.map((q, i) => (
        <View
          key={q.id}
          style={[styles.quest, i > 0 && styles.sep]}
          accessible
          accessibilityLabel={`${q.title}, ${q.done ? 'done' : `${Math.round(q.p * 100)}%`}, ${q.xp} XP`}>
          <QuestRing p={q.p} />
          <Text style={[styles.qt, q.done && { color: colors.muted }]}>{q.title}</Text>
          <Text style={[styles.qx, q.done && { color: colors.sage }]}>+{q.xp} XP</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  count: { ...font.semibold, fontSize: 14, color: colors.muted },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, marginBottom: 6 },
  xp: { ...font.bold, fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] },
  xpOf: { ...font.medium, color: colors.muted },
  quest: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line2 },
  qt: { ...font.medium, fontSize: 15.5, color: colors.text, flex: 1 },
  qx: { ...font.semibold, fontSize: 12.5, color: colors.rose },
});
