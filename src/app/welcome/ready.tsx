import * as Location from 'expo-location';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { IconTile } from '@/components/bits';
import { Button, Card, T } from '@/components/ui';
import { Footer } from '@/components/welcome/Footer';
import { useDraft } from '@/components/welcome/draft';
import { starterSteps } from '@/data/starters';
import { deviceTz, useSetup } from '@/data/store';
import type { Config } from '@/db/types';
import { todayKey } from '@/logic/dates';
import { askForNotifications } from '@/notifications/schedule';
import { colors, type ColorName } from '@/theme/tokens';

const REMINDERS = { am: '08:30', pm: '22:30' };

function Ask({
  icon,
  color,
  title,
  text,
  done,
  doneText,
  label,
  onPress,
}: {
  icon: SFSymbol;
  color: ColorName;
  title: string;
  text: string;
  done: boolean | null;
  doneText: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Card style={{ gap: 12 }}>
      <View style={styles.head}>
        <IconTile name={icon} color={colors[color]} />
        <View style={{ flex: 1 }}>
          <T variant="h2">{title}</T>
          <T variant="sub">{text}</T>
        </View>
      </View>
      {done == null ? (
        <Button label={label} kind="line" small onPress={onPress} style={{ alignSelf: 'flex-start' }} />
      ) : (
        <T variant="label" style={{ color: done ? colors.sage : colors.muted }}>
          {done ? doneText : 'Not now. You can turn this on later in Profile.'}
        </T>
      )}
    </Card>
  );
}

/** Last page: optional permissions with a plain reason each, then the app opens. */
export default function Ready() {
  const { draft } = useDraft();
  const { finishSetup } = useSetup();
  const [notify, setNotify] = useState<boolean | null>(null);
  const [where, setWhere] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    const config: Config = {
      name: draft.name.trim(),
      startedAt: todayKey(),
      shampooDays: [...draft.washDays].sort(),
      exfoliateDays: [...draft.washDays].sort(),
      exfoliateMode: false,
      checkinEvery: 7,
      reminders: REMINDERS,
      lastTz: deviceTz(),
      ...(notify != null ? { notify: { on: notify } } : {}),
    };
    await finishSetup(config, starterSteps(draft.starter));
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.body}>
        <Ask
          icon="bell"
          color="sage"
          title="Reminders"
          text={`A nudge at ${REMINDERS.am} and ${REMINDERS.pm} in whatever time zone you’re in, only if that routine isn’t done yet.`}
          done={notify}
          doneText="Reminders are on."
          label="Turn on reminders"
          onPress={async () => setNotify(await askForNotifications())}
        />
        <Ask
          icon="location"
          color="morning"
          title="Location"
          text="For sunrise, sunset and today’s UV where you are. Without it, the city is guessed from your internet connection."
          done={where}
          doneText="Location is on."
          label="Allow location"
          onPress={async () => setWhere((await Location.requestForegroundPermissionsAsync()).granted)}
        />
        <T variant="label" style={{ marginHorizontal: 4 }}>
          Everything stays on this device. You can sign in later to back up and sync between your iPhone and iPad.
        </T>
      </ScrollView>
      <Footer>
        <Button label={busy ? 'Setting up…' : 'Start my routine'} disabled={busy} onPress={start} />
      </Footer>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
  head: { flexDirection: 'row', gap: 12, alignItems: 'center' },
});
