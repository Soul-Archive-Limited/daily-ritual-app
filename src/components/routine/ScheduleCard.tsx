import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, T } from '@/components/ui';
import { useStore } from '@/data/store';
import type { Config } from '@/db/types';
import { WD } from '@/logic/dates';
import { colors, font, minTouch, radius } from '@/theme/tokens';

const ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Wash days, exfoliation (archived by default) and the check-in interval. */
export function ScheduleCard() {
  const s = useStore()!;
  const c = s.config;
  const adds = (on: string) =>
    s.steps
      .filter((x) => x.on === on)
      .map((x) => x.name)
      .join(', ') || 'nothing yet';

  const toggleDay = (field: 'shampooDays' | 'exfoliateDays', d: number) => {
    Haptics.selectionAsync();
    const arr = c[field] ?? [];
    s.updateConfig({ [field]: arr.includes(d) ? arr.filter((x) => x !== d) : [...arr, d] } as Partial<Config>);
  };

  const days = (field: 'shampooDays' | 'exfoliateDays', label: string) => (
    <View style={styles.days} accessibilityLabel={label}>
      {ORDER.map((d) => {
        const on = (c[field] ?? []).includes(d);
        return (
          <Pressable
            key={d}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${WD[d]}`}
            onPress={() => toggleDay(field, d)}
            style={[styles.day, on && { backgroundColor: colors.sage }]}>
            <Text style={[styles.dayText, on && { color: colors.sageInk }]}>{WD[d].slice(0, 2)}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Card style={{ gap: 18 }}>
      <T variant="h2">Schedule</T>

      <View style={{ gap: 8 }}>
        <T variant="label">Wash days · adds {adds('shampoo')}</T>
        {days('shampooDays', 'Wash days')}
      </View>

      {c.exfoliateMode ? (
        <View style={{ gap: 8 }}>
          <T variant="label">Exfoliation days · adds {adds('exfoliate')}</T>
          {days('exfoliateDays', 'Exfoliation days')}
          <Button
            label="Merge exfoliation back into wash days"
            kind="line"
            small
            style={{ alignSelf: 'flex-start' }}
            onPress={() => {
              s.updateConfig({ exfoliateMode: false });
              s.showToast('Exfoliation archived. It follows wash days.');
            }}
          />
        </View>
      ) : (
        <View style={styles.archived}>
          <View style={{ flex: 1 }}>
            <T style={{ ...font.semibold }}>Exfoliation days are archived.</T>
            <T variant="sub">Your exfoliants run on wash days, so a separate day type isn’t needed.</T>
          </View>
          <Button
            label="Bring back"
            kind="line"
            small
            onPress={() => {
              s.updateConfig({
                exfoliateMode: true,
                exfoliateDays: c.exfoliateDays?.length ? c.exfoliateDays : [...c.shampooDays],
              });
              s.showToast('Exfoliation days are back');
            }}
          />
        </View>
      )}

      <T variant="sub">Travelling and the days moved? Use “Type of day” on Today. It changes that one day only.</T>

      <View style={{ gap: 8 }}>
        <T variant="label">Skin photo check-in</T>
        <View style={styles.seg} accessibilityRole="radiogroup">
          {[3, 5, 7, 14].map((n) => {
            const on = (c.checkinEvery || 3) === n;
            return (
              <Pressable
                key={n}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => s.updateConfig({ checkinEvery: n })}
                style={[styles.segBtn, on && { backgroundColor: colors.text }]}>
                <Text style={[styles.segText, on && { color: colors.bg }]}>{n} days</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    height: minTouch,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  dayText: { ...font.semibold, fontSize: 13.5, color: colors.muted },
  archived: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.small,
    backgroundColor: colors.fill,
  },
  seg: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segBtn: { flex: 1, minHeight: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segText: { ...font.medium, fontSize: 13.5, color: colors.muted },
});
