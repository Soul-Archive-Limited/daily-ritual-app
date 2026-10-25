import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuraBackdrop } from '@/components/glow/AuraBackdrop';
import { Medal } from '@/components/glow/Medal';
import { SlideToConfirm } from '@/components/glow/SlideToConfirm';
import { Lune } from '@/components/Lune';
import { useSetup } from '@/data/store';
import { pickBackup } from '@/db/backup';
import { font } from '@/theme/tokens';

const PAGES = [
  {
    words: ['Your', 'glow,', 'daily.'],
    text: 'A calm skin, hair and body ritual that fits your day, wherever you are.',
  },
  { words: ['Meet', 'Lune.'], text: 'A little bunny who cheers every step, keeps your streak safe and never nags.' },
  { words: ['Earn', 'your', 'glow.'], text: 'XP for every step, three daily quests, levels and 24 badges to collect.' },
];

/** Welcome: three swipeable slides over a living aura, then one slide to begin. */
export default function Welcome() {
  const { restore } = useSetup();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const pageW = Math.min(width, 620);

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
      <AuraBackdrop />
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.logo}>Daily Ritual</Text>
      </View>

      <View style={styles.art} pointerEvents="none">
        {page === 1 ? (
          <Animated.View key="lune" entering={FadeIn.duration(400)}>
            <Lune mood="happy" size={190} />
          </Animated.View>
        ) : page === 2 ? (
          <Animated.View key="medals" entering={FadeIn.duration(400)} style={styles.medals}>
            <Medal badge={{ icon: 'flame.fill', tone: 'aura', got: true }} size={74} />
            <Medal badge={{ icon: 'star.fill', tone: 'skin', got: true }} size={92} />
            <Medal badge={{ icon: 'drop.fill', tone: 'health', got: true }} size={74} />
          </Animated.View>
        ) : null}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ width: pageW, alignSelf: 'center' }}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / pageW))}>
          {PAGES.map((p, i) => (
            <View key={i} style={[styles.page, { width: pageW }]}>
              <Animated.View entering={FadeInDown.duration(500).delay(100)}>
                {p.words.map((w) => (
                  <Text key={w} style={styles.word} accessibilityRole={i === 0 ? 'header' : undefined}>
                    {w}
                  </Text>
                ))}
                <Text style={styles.text}>{p.text}</Text>
              </Animated.View>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.inner, { width: pageW }]}>
          <View style={styles.dots} accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`}>
            {PAGES.map((_, i) => (
              <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
            ))}
          </View>
          <SlideToConfirm
            label="Slide to begin"
            icon="arrow.right"
            glass
            onConfirm={() => router.push('/welcome/about')}
          />
          <Pressable onPress={restoreBackup} accessibilityRole="button" style={styles.restore} hitSlop={8}>
            <Text style={styles.restoreText}>Restore from a backup</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4C7E0' },
  top: { alignItems: 'center' },
  logo: { ...font.serifItalic, fontSize: 24, color: '#FFFFFF', letterSpacing: -0.3 },
  art: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  medals: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bottom: { gap: 18 },
  page: { paddingHorizontal: 26 },
  word: { ...font.serif, fontSize: 92, lineHeight: 82, letterSpacing: -2.5, color: '#FFFFFF', paddingTop: 6 },
  text: {
    ...font.regular,
    fontSize: 18,
    lineHeight: 25,
    color: 'rgba(255,255,255,0.94)',
    marginTop: 16,
    maxWidth: 420,
  },
  inner: { alignSelf: 'center', paddingHorizontal: 26, gap: 16 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotOn: { width: 22, backgroundColor: '#FFFFFF' },
  restore: { alignSelf: 'center', paddingVertical: 4 },
  restoreText: { ...font.semibold, fontSize: 14, color: 'rgba(255,255,255,0.9)' },
});
