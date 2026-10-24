import { router } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Icon } from '@/components/bits';
import { Hero } from '@/components/Hero';
import { Button, T } from '@/components/ui';
import { Footer } from '@/components/welcome/Footer';
import { useSetup } from '@/data/store';
import { pickBackup } from '@/db/backup';
import { colors, font, onPhoto } from '@/theme/tokens';

const FEATURES: [SFSymbol, string, string, keyof typeof colors][] = [
  ['checklist', 'Morning, night and health', 'Tick each step and see how far you are, at a glance.', 'sage'],
  ['sun.max', 'Sun where you are', 'Today’s UV, sunrise and when to reapply sunscreen.', 'morning'],
  ['camera', 'Skin over time', 'A quick check-in every few days. Photos stay on your phone.', 'skin'],
  ['shippingbox', 'Know what’s running out', 'Each bottle empties a little every time you use it.', 'health'],
];

export default function Welcome() {
  const { restore } = useSetup();

  const restoreBackup = async () => {
    try {
      const data = await pickBackup();
      if (data) await restore(data);
    } catch (e) {
      Alert.alert('Couldn’t restore', e instanceof Error ? e.message : 'Try another file.');
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.body}>
        <Animated.View entering={FadeInDown.duration(380)}>
          <Hero source={require('@/assets/images/hero/hero.webp')} height={240}>
            <Text style={styles.kicker}>Welcome to</Text>
            <Text style={styles.title} accessibilityRole="header">
              Daily Ritual
            </Text>
            <Text style={styles.lead}>Your skin, hair and health routine, one calm step at a time.</Text>
          </Hero>
        </Animated.View>
        <View style={styles.list}>
          {FEATURES.map(([icon, title, text, c], i) => (
            <Animated.View key={title} entering={FadeInDown.duration(380).delay(80 + i * 60)} style={styles.row}>
              <Icon name={icon} size={26} color={colors[c]} />
              <View style={{ flex: 1 }}>
                <T variant="h2">{title}</T>
                <T variant="sub">{text}</T>
              </View>
            </Animated.View>
          ))}
        </View>
        <T variant="label" style={styles.note}>
          Free and private. Everything works without an account.
        </T>
      </ScrollView>
      <Footer>
        <Button label="Get started" onPress={() => router.push('/welcome/about')} />
        <Button label="Restore from a backup" kind="line" onPress={restoreBackup} />
      </Footer>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 20, gap: 24, width: '100%', maxWidth: 560, alignSelf: 'center' },
  kicker: { ...font.semibold, fontSize: 15, color: onPhoto.muted },
  title: { ...font.bold, fontSize: 34, lineHeight: 40, color: onPhoto.text },
  lead: { ...font.regular, fontSize: 16, lineHeight: 22, color: onPhoto.text },
  list: { gap: 20, paddingHorizontal: 4 },
  row: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  note: { textAlign: 'center' },
});
