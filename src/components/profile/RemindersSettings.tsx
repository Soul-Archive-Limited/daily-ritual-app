import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, labelsHidden, tint } from '@expo/ui/swift-ui/modifiers';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Switch, View } from 'react-native';

import { Button, Card, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { parseTime } from '@/notifications/plan';
import { askForNotifications, notificationsAllowed } from '@/notifications/schedule';
import { colors } from '@/theme/tokens';

const pad = (n: number) => String(n).padStart(2, '0');

const toDate = (t: string) => {
  const { hour, minute } = parseTime(t);
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
};

/** On/off and the two reminder times. */
export function RemindersSettings() {
  const s = useStore()!;
  const on = !!s.config.notify?.on;
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [queued, setQueued] = useState<string[]>([]);

  useEffect(() => {
    notificationsAllowed().then(setAllowed);
    if (__DEV__)
      Notifications.getAllScheduledNotificationsAsync().then((l) => setQueued(l.map((n) => n.identifier).sort()));
  }, [on, s.config.reminders, s.days]);

  const toggle = async (next: boolean) => {
    if (!next) return s.updateConfig({ notify: { on: false } });
    const ok = await askForNotifications();
    setAllowed(ok);
    s.updateConfig({ notify: { on: ok } });
    if (!ok) s.showToast('Notifications are blocked. Allow them in iPhone Settings.');
  };

  const setTime = (slot: 'am' | 'pm', d: Date) =>
    s.updateConfig({ reminders: { ...s.config.reminders, [slot]: `${pad(d.getHours())}:${pad(d.getMinutes())}` } });

  return (
    <Card>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <T variant="h2">Reminders</T>
          <T variant="sub">Only sent if that routine isn’t finished. Local time wherever you are.</T>
        </View>
        <Switch
          value={on}
          onValueChange={toggle}
          trackColor={{ true: colors.sage, false: colors.card2 }}
          accessibilityLabel="Reminders"
        />
      </View>

      {on ? (
        <View style={styles.times}>
          {(['am', 'pm'] as const).map((slot) => (
            <View key={slot} style={styles.time}>
              <View style={[styles.dot, { backgroundColor: slot === 'am' ? colors.morning : colors.night }]} />
              <T style={{ flex: 1 }}>{slot === 'am' ? 'Morning' : 'Night'}</T>
              <Host matchContents>
                <DatePicker
                  title={slot === 'am' ? 'Morning reminder' : 'Night reminder'}
                  displayedComponents={['hourAndMinute']}
                  selection={toDate(s.config.reminders[slot])}
                  onDateChange={(d) => setTime(slot, d)}
                  modifiers={[datePickerStyle('compact'), labelsHidden(), tint(colors.sage)]}
                />
              </Host>
            </View>
          ))}
        </View>
      ) : null}

      {on ? (
        <View style={styles.time}>
          <View style={[styles.dot, { backgroundColor: colors.morning }]} />
          <View style={{ flex: 1 }}>
            <T>Reapply SPF nudge</T>
            <T variant="sub">During strong sun, 2 h after you tick sunscreen.</T>
          </View>
          <Switch
            value={!!s.config.spfNudge}
            onValueChange={(v) => s.updateConfig({ spfNudge: v })}
            trackColor={{ true: colors.sage, false: colors.card2 }}
            accessibilityLabel="Reapply SPF nudge"
          />
        </View>
      ) : null}

      {__DEV__ && on ? (
        <View style={styles.blocked}>
          <T variant="mono">
            {queued.length} queued · {queued.slice(0, 3).join(', ')}
          </T>
          <Button
            label="Test: night reminder in 5 s"
            kind="line"
            small
            onPress={() =>
              Notifications.scheduleNotificationAsync({
                content: {
                  title: 'Night routine',
                  body: 'Test reminder. Tap to open Night.',
                  data: { kind: 'routine', slot: 'pm', date: '' },
                },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
              })
            }
          />
        </View>
      ) : null}

      {on && allowed === false ? (
        <View style={styles.blocked}>
          <T variant="sub" style={{ color: colors.gold }}>
            Notifications are blocked for Daily Ritual, so nothing will arrive.
          </T>
          <Button label="Open iPhone Settings" kind="line" small onPress={() => Linking.openSettings()} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  times: { marginTop: 14, borderTopWidth: 1, borderTopColor: colors.line },
  time: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  blocked: { marginTop: 12, gap: 10, alignItems: 'flex-start' },
});
