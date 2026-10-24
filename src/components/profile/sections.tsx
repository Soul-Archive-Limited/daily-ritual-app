import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useState, type ReactNode } from 'react';
import { Alert, Keyboard, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/bits';
import { Button, Card, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { importExport, type ExportFile } from '@/db/import';
import { pickBackup } from '@/db/backup';
import { exportAll } from '@/db/repo';
import type { Config } from '@/db/types';
import { todayKey } from '@/logic/dates';
import { bmiOf } from '@/logic/progress';
import { colors, font, minTouch, radius } from '@/theme/tokens';

/** Name, height and a quick weigh-in. */
export function BodyCard() {
  const s = useStore()!;
  const c = s.config;
  const [kg, setKg] = useState('');
  const last = s.weighins[s.weighins.length - 1];
  const bmi = last ? bmiOf(last.kg, c.heightCm) : null;

  const log = () => {
    const v = Number(kg.replace(',', '.'));
    if (!(v >= 30 && v <= 250)) return s.showToast('Enter your weight in kg, between 30 and 250.');
    s.logWeight(v);
    setKg('');
    Keyboard.dismiss();
  };

  return (
    <Card style={{ gap: 14 }}>
      <T variant="h2">You</T>
      <View style={styles.two}>
        <Labeled label="Name">
          <TextInput
            defaultValue={c.name}
            onEndEditing={(e) => {
              const v = e.nativeEvent.text.trim();
              if (v && v !== c.name) s.updateConfig({ name: v });
            }}
            style={styles.input}
            returnKeyType="done"
            accessibilityLabel="Name"
          />
        </Labeled>
        <Labeled label="Height (cm)">
          <TextInput
            defaultValue={c.heightCm ? String(c.heightCm) : ''}
            keyboardType="number-pad"
            onEndEditing={(e) => {
              const v = Number(e.nativeEvent.text);
              if (v >= 120 && v <= 230) s.updateConfig({ heightCm: v });
              else if (e.nativeEvent.text) s.showToast('Height in cm, between 120 and 230.');
            }}
            style={styles.input}
            placeholder="cm"
            placeholderTextColor={colors.dim}
            returnKeyType="done"
            accessibilityLabel="Height in centimetres"
          />
        </Labeled>
      </View>

      <View style={styles.weightRow}>
        <View style={{ flex: 1 }}>
          {last ? (
            <>
              <Text style={styles.big}>
                {last.kg}
                <Text style={styles.unit}> kg</Text>
              </Text>
              <T variant="sub">
                {new Date(last.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                {bmi ? ` · BMI ${bmi.toFixed(1)}` : c.heightCm ? '' : ' · add height for BMI'}
              </T>
            </>
          ) : (
            <T variant="sub">No weigh-ins yet</T>
          )}
        </View>
        <TextInput
          value={kg}
          onChangeText={setKg}
          keyboardType="decimal-pad"
          placeholder="kg"
          placeholderTextColor={colors.dim}
          style={[styles.input, { width: 84 }]}
          accessibilityLabel="Weight in kilograms"
          onSubmitEditing={log}
        />
        <Button label="Log" small onPress={log} />
      </View>
      <T variant="sub">BMI is a rough screen. It doesn’t see muscle. Chart and history are on Progress › Body.</T>
    </Card>
  );
}

const CARDS: [keyof NonNullable<Config['cards']>, string][] = [
  ['ask', 'Ask about your routine (Apple Intelligence)'],
  ['next', 'Up next'],
  ['sun', 'Sun today'],
  ['restock', 'Restock alerts'],
  ['activity', 'Activity'],
];

/** Which cards Today shows. More appear as their features land (Sun, Restock, Ask). */
export function TodayCardsCard() {
  const s = useStore()!;
  const cards = s.config.cards ?? {};
  return (
    <Card>
      <T variant="h2">Today screen</T>
      <T variant="sub" style={{ marginBottom: 6 }}>
        Today keeps only what you act on. Your week, streak and trends live on Progress.
      </T>
      {CARDS.map(([k, label]) => (
        <View key={k} style={styles.switchRow}>
          <T style={{ flex: 1 }}>{label}</T>
          <Switch
            value={cards[k] !== false}
            onValueChange={(v) => s.updateConfig({ cards: { ...cards, [k]: v } })}
            trackColor={{ true: colors.sage, false: colors.card2 }}
            accessibilityLabel={`Show ${label} on Today`}
          />
        </View>
      ))}
    </Card>
  );
}

/** Folding explainer row. */
function Explainer({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.exp}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.expHead}>
        <T style={{ flex: 1, ...font.semibold }}>{title}</T>
        <View style={open ? { transform: [{ rotate: '180deg' }] } : undefined}>
          <Icon name="chevron.down" size={13} color={colors.muted} />
        </View>
      </Pressable>
      {open ? (
        <T variant="sub" style={{ paddingBottom: 12 }}>
          {children}
        </T>
      ) : null}
    </View>
  );
}

export function AboutCard() {
  const s = useStore()!;
  const essentials = s.steps.filter((x) => x.essential && !x.paused).length;
  return (
    <Card style={{ paddingVertical: 8 }}>
      <Explainer title="Travel days">
        For long-haul days only (a 12+ hour flight or train). Pick “Travel day” under Type of day on Today and only your
        essentials count ({essentials} steps). Moving cities doesn’t need it: time zone and reminders follow your phone
        by themselves. Pick essentials in each step on the Routine tab.
      </Explainer>
      <Explainer title="How streaks work">
        A day counts at 80% of its steps. Every 7 days in a row earns a shield (hold 2). Miss a day with a shield and
        the streak carries on; without one it restarts, but your best is kept. Travel days only count essentials.
        Skipped steps leave the day’s total, so resting irritated skin never costs you.
      </Explainer>
      <Explainer title="Privacy and your photos">
        Your log, routine, weigh-ins and photos are stored only on this device. The AI features run on Apple
        Intelligence on the device itself, so nothing you ask is sent anywhere. Skin photos never leave your device,
        even if you sign in to sync.
      </Explainer>
    </Card>
  );
}

/** Export everything as JSON (same format as the web export) and restore from a file. */
export function BackupCard() {
  const db = useSQLiteContext();
  const s = useStore()!;
  const [busy, setBusy] = useState(false);

  const backup = async () => {
    setBusy(true);
    try {
      const data = await exportAll(db);
      const file = new File(Paths.cache, `daily-ritual-backup-${todayKey()}.json`);
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(data, null, 2));
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        UTI: 'public.json',
        dialogTitle: 'Save backup',
      });
    } catch {
      s.showToast('Couldn’t make the backup. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    let data: ExportFile | null;
    try {
      data = await pickBackup();
    } catch {
      return s.showToast('That file isn’t a Daily Ritual backup.');
    }
    if (!data) return;
    const file = data;
    const n = Object.keys(data.days ?? {}).length;
    Alert.alert(
      'Replace everything with this backup?',
      `It has ${data.app.config.steps.length} steps and ${n} logged ${n === 1 ? 'day' : 'days'}${data.exportedAt ? ` from ${data.exportedAt}` : ''}. What’s on this phone now will be replaced.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: async () => {
            await importExport(db, file);
            await s.reloadAll();
            s.showToast('Backup restored');
          },
        },
      ],
    );
  };

  return (
    <Card style={{ gap: 10 }}>
      <T variant="h2">Backup</T>
      <T variant="sub">
        Everything in one file: routine, log, weigh-ins and settings. Save it to Files or iCloud Drive now and then.
      </T>
      <View style={styles.two}>
        <Button
          label={busy ? 'Preparing…' : 'Export backup'}
          icon="square.and.arrow.up"
          onPress={backup}
          style={{ flex: 1 }}
        />
        <Button label="Restore" kind="line" onPress={restore} />
      </View>
    </Card>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <T variant="label">{label}</T>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  two: { flexDirection: 'row', gap: 10 },
  input: {
    minHeight: minTouch,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.line2,
    color: colors.text,
    ...font.regular,
    fontSize: 16,
  },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  big: { ...font.light, fontSize: 32, lineHeight: 36, color: colors.text },
  unit: { ...font.medium, fontSize: 15, color: colors.muted },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  exp: { borderBottomWidth: 1, borderBottomColor: colors.line },
  expHead: { flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: 10, borderRadius: radius.small },
});
