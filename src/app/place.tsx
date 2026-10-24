import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { SheetDone } from '@/components/SheetDone';
import { Button, T } from '@/components/ui';
import { deviceTz, useStore } from '@/data/store';
import { useSunControls } from '@/sun/SunProvider';
import { colors, font, minTouch, radius } from '@/theme/tokens';

/** Set the city by hand. Normally location follows the phone by itself. */
export default function PlaceSheet() {
  const s = useStore();
  const ctl = useSunControls();
  const manual = s?.config.place?.manual;
  const [q, setQ] = useState(manual ? (s?.config.place?.name ?? '') : '');
  const [busy, setBusy] = useState(false);
  if (!s || !ctl) return null;

  const submit = async () => {
    if (!q.trim()) return;
    setBusy(true);
    const ok = await ctl.setManual(q);
    setBusy(false);
    if (!ok) return s.showToast('Couldn’t find that place. Check the spelling.');
    router.back();
    s.showToast(`Location set to ${s.config.place?.name ?? q.trim()}`);
  };

  return (
    <View style={styles.screen}>
      <SheetDone label="Cancel" />
      <T variant="sub">
        Normally this follows your phone’s location by itself (time zone now {deviceTz() || 'unknown'}), so it updates
        when you land somewhere new. Type a city only if it’s wrong. It switches back to automatic when your time zone
        changes.
      </T>
      <View style={styles.row}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="e.g. Chiang Mai"
          placeholderTextColor={colors.dim}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={submit}
          style={styles.input}
          accessibilityLabel="City"
        />
        <Button label={busy ? 'Finding…' : 'Set'} onPress={submit} disabled={busy} />
      </View>
      {manual ? (
        <Button
          label="Go back to automatic"
          kind="line"
          small
          style={{ alignSelf: 'flex-start' }}
          onPress={async () => {
            await ctl.backToAuto();
            router.back();
          }}
        />
      ) : null}
      {ctl.perm === 'denied' ? (
        <T variant="sub" style={{ color: colors.gold }}>
          Location is off for Daily Ritual, so the city won’t follow you. Turn it on in iPhone Settings → Daily Ritual →
          Location.
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: 8, gap: 14 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: minTouch + 4,
    paddingHorizontal: 14,
    borderRadius: radius.small,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.line2,
    color: colors.text,
    ...font.regular,
    fontSize: 16,
  },
});
