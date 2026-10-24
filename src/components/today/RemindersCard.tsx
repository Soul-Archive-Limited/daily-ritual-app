import { StyleSheet, View } from 'react-native';

import { IconTile } from '@/components/bits';
import { Button, Card, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { askForNotifications } from '@/notifications/schedule';
import { colors } from '@/theme/tokens';

/** One-time offer to turn reminders on. Hidden once a choice is made (changeable in Profile). */
export function RemindersCard() {
  const s = useStore()!;
  const { am, pm } = s.config.reminders;

  const turnOn = async () => {
    const ok = await askForNotifications();
    s.updateConfig({ notify: { on: ok } });
    s.showToast(
      ok
        ? `Reminders on: ${am} and ${pm}.`
        : 'Notifications are blocked. Allow them in iPhone Settings → Daily Ritual.',
    );
  };

  return (
    <Card>
      <View style={styles.head}>
        <IconTile name="bell" color={colors.sage} />
        <View style={{ flex: 1 }}>
          <T variant="h2">Reminders</T>
          <T variant="sub">
            A nudge at {am} and {pm}, only if that routine isn’t done yet. Follows your time zone wherever you are.
          </T>
        </View>
      </View>
      <View style={styles.btns}>
        <Button label="Turn on reminders" onPress={turnOn} style={{ flex: 1 }} />
        <Button label="Not now" kind="line" onPress={() => s.updateConfig({ notify: { on: false } })} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  btns: { flexDirection: 'row', gap: 8, marginTop: 14 },
});
