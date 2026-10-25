import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bits';
import { Lune } from '@/components/Lune';
import { Card, Seg, T } from '@/components/ui';
import { useAppearance, type AppearanceMode } from '@/data/appearance';

import { AboutCard, BackupCard, BodyCard, TodayCardsCard } from '@/components/profile/sections';
import { AccountCard } from '@/components/profile/AccountCard';
import { RemindersSettings } from '@/components/profile/RemindersSettings';
import { SheetDone } from '@/components/SheetDone';

import { useStore } from '@/data/store';
import { colors, font } from '@/theme/tokens';

export default function Profile() {
  const s = useStore();
  const [mode, setMode] = useAppearance();
  if (!s) return null;
  const c = s.config;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 60, gap: 14 }}
      keyboardShouldPersistTaps="handled">
      <SheetDone />
      <View style={styles.head}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{c.name.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <T variant="title">{c.name}</T>
          <T variant="sub">
            {c.place?.name ? `${c.place.name}${c.place.country ? `, ${c.place.country}` : ''} · ` : ''}
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </T>
        </View>
      </View>
      <Pressable onPress={() => router.push('/ask')} accessibilityRole="button" style={styles.ask}>
        <Lune size={56} still outfit={c.look?.outfit} />
        <View style={{ flex: 1 }}>
          <Text style={styles.askTitle}>Ask Lune</Text>
          <Text style={styles.askSub}>Questions about your skin, hair, sun and routine. Free and on your iPhone.</Text>
        </View>
        <Icon name="chevron.right" size={14} color={colors.dim} />
      </Pressable>
      <Card style={{ gap: 10 }}>
        <T variant="h2">Appearance</T>
        <Seg<AppearanceMode>
          options={[
            ['system', 'Match iPhone'],
            ['light', 'Light'],
            ['dark', 'Dark'],
          ]}
          value={mode}
          onChange={setMode}
          label="Appearance"
        />
      </Card>
      <AccountCard />
      <BodyCard />
      <RemindersSettings />
      <TodayCardsCard />
      <AboutCard />
      <BackupCard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 30,
    backgroundColor: colors.card,
  },
  askTitle: { ...font.semibold, fontSize: 17, color: colors.text },
  askSub: { ...font.regular, fontSize: 13.5, lineHeight: 18, color: colors.muted, marginTop: 2 },
  screen: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sageSoft,
  },
  avatarText: { ...font.semibold, fontSize: 22, color: colors.sage },
});
