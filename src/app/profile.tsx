import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AboutCard, BackupCard, BodyCard, TodayCardsCard } from '@/components/profile/sections';
import { AccountCard } from '@/components/profile/AccountCard';
import { RemindersSettings } from '@/components/profile/RemindersSettings';
import { SheetDone } from '@/components/SheetDone';
import { T } from '@/components/ui';
import { useStore } from '@/data/store';
import { colors, font } from '@/theme/tokens';

export default function Profile() {
  const s = useStore();
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
