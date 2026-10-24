import { StyleSheet, View } from 'react-native';

import { Icon, IconTile } from '@/components/bits';
import { Button, Card, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { routineCheck } from '@/logic/routineCheck';
import { colors, font } from '@/theme/tokens';

/** Suggestions only. Nothing changes unless you tap a fix (each with Undo). */
export function RoutineCheckCard() {
  const s = useStore()!;
  const list = routineCheck(s.steps);
  if (!list.length) return null;
  return (
    <Card>
      <View style={styles.head}>
        <IconTile name="sparkles" color={colors.gold} />
        <View style={{ flex: 1 }}>
          <T variant="h2">Routine check</T>
          <T variant="sub">Suggestions only. Nothing changes unless you tap.</T>
        </View>
      </View>
      {list.map((o) => (
        <View key={o.id} style={styles.item}>
          <View style={{ paddingTop: 2 }}>
            <Icon
              name={o.tone === 'warn' ? 'exclamationmark.circle' : 'checkmark.circle'}
              size={17}
              color={o.tone === 'warn' ? colors.gold : colors.muted}
            />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <T style={{ ...font.semibold }}>{o.title}</T>
            <T variant="sub">{o.body}</T>
            {o.fix ? (
              <Button
                label={o.fix.label}
                kind={o.tone === 'warn' ? 'primary' : 'line'}
                small
                style={{ alignSelf: 'flex-start', marginTop: 6 }}
                onPress={() => s.replaceSteps(o.fix!.apply(s.steps), o.fix!.done)}
              />
            ) : null}
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  item: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 14,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
