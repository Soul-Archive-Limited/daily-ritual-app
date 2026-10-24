import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { aiErrorText, climateTips, useOnDeviceAI } from '@/ai/coach';
import { Icon } from '@/components/bits';
import { useStore } from '@/data/store';
import { getKv, setKv } from '@/db/repo';
import { colors, font, minTouch } from '@/theme/tokens';

/** "Climate tips" under the sun card: written once per city and month on-device, then kept. */
export function ClimateTips() {
  const s = useStore()!;
  const db = useSQLiteContext();
  const ai = useOnDeviceAI();
  const place = s.config.place;
  const month = new Date().toLocaleDateString('en-GB', { month: 'long' });
  const key = `climate.${place?.name ?? ''}.${place?.country ?? ''}.${new Date().toISOString().slice(0, 7)}`;
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    getKv<string>(db, key).then((v) => live && setText(v));
    return () => {
      live = false;
    };
  }, [db, key]);

  if (!place?.name || (!ai && !text)) return null;

  const write = async () => {
    setBusy(true);
    try {
      const routine = s.steps.map((x) => x.name + (x.product ? ` (${x.product})` : '')).join('; ');
      const where = place.country ? `${place.name}, ${place.country}` : place.name;
      const t = (await climateTips(where, month, routine)).trim();
      setText(t);
      await setKv(db, key, t);
    } catch (e) {
      const msg = aiErrorText(e);
      if (msg) s.showToast(msg);
    } finally {
      setBusy(false);
    }
  };

  if (text) return <Text style={styles.text}>{text}</Text>;
  return (
    <Pressable onPress={write} disabled={busy} accessibilityRole="button" style={styles.btn}>
      {busy ? <ActivityIndicator color={colors.sage} /> : <Icon name="sparkles" size={14} color={colors.sage} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.btnText}>{busy ? 'Thinking…' : `Climate tips for ${place.name} in ${month}`}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: { ...font.regular, fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: minTouch, marginTop: 6 },
  btnText: { ...font.semibold, fontSize: 15, color: colors.sage },
});
