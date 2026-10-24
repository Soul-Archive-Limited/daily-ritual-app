import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, IconTile } from '@/components/bits';
import { Button, Card, T } from '@/components/ui';
import { ACTIVITIES, useStore } from '@/data/store';
import { colors, font, radius } from '@/theme/tokens';

const TIP_AM =
  'After a morning run: rinse your body with plain water, wash your shorts with a drop of soap, then do the sink routine.';
const TIP_PM = 'Evening run? Do it before the shower so the night routine cleans everything up.';

const hm = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** Log Run / Workout / Walk with time. Not counted in the day's %. */
export function ActivityCard({ k, future }: { k: string; future: boolean }) {
  const s = useStore()!;
  const list = s.days[k]?.activity ?? [];
  const last = list[list.length - 1];
  const name = (type: string) => ACTIVITIES.find((a) => a[0] === type)?.[1] ?? type;

  return (
    <Card>
      <View style={styles.head}>
        <IconTile name="figure.run" color={colors.health} />
        <View style={{ flex: 1 }}>
          <T variant="h2">Activity</T>
          <T variant="sub">Optional · not counted in your %</T>
        </View>
      </View>
      <View style={styles.btns}>
        {ACTIVITIES.map(([v, label]) => (
          <Button
            key={v}
            label={label}
            icon="plus"
            kind="line"
            small
            disabled={future}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              s.logActivity(k, v);
            }}
          />
        ))}
      </View>
      {list.length ? (
        <>
          <View style={styles.chips}>
            {list.map((a, j) => (
              <View key={`${a.at}-${j}`} style={styles.chip}>
                <Text style={styles.chipText}>
                  {name(a.type)} · {hm(a.at)}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${name(a.type)} at ${hm(a.at)}`}
                  hitSlop={11}
                  onPress={() => s.removeActivity(k, j)}
                  style={styles.x}>
                  <Icon name="xmark" size={10} color={colors.healthLight} />
                </Pressable>
              </View>
            ))}
          </View>
          {last && last.type !== 'walk' ? (
            <T variant="sub" style={styles.tip}>
              {new Date(last.at).getHours() < 15 ? TIP_AM : TIP_PM}
            </T>
          ) : null}
        </>
      ) : (
        <T variant="sub" style={styles.tip}>
          Log a run when you finish it. The time is saved, so mornings and evenings show on your timeline.
        </T>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.healthSoft,
  },
  chipText: { ...font.semibold, fontSize: 13, color: colors.healthLight },
  x: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tip: { marginTop: 10, fontSize: 13 },
});
