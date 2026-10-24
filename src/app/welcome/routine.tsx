import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/bits';
import { Button, T } from '@/components/ui';
import { Footer } from '@/components/welcome/Footer';
import { useDraft } from '@/components/welcome/draft';
import { STARTERS } from '@/data/starters';
import { colors, radius, SLOTS } from '@/theme/tokens';

export default function PickRoutine() {
  const { draft, set } = useDraft();
  return (
    <View style={styles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.body}>
        <T variant="sub" style={{ marginHorizontal: 4 }}>
          Pick a starting point. Every step can be renamed, moved, paused or removed later, and you add your own
          products on the Routine tab.
        </T>
        {STARTERS.map((st) => {
          const on = draft.starter === st.id;
          return (
            <Pressable
              key={st.id}
              onPress={() => set({ starter: st.id })}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={[styles.option, on && styles.optionOn]}>
              <View style={styles.head}>
                <T variant="h2" style={{ flex: 1 }}>
                  {st.name}
                </T>
                <Icon
                  name={on ? 'checkmark.circle.fill' : 'circle'}
                  size={22}
                  color={on ? colors.sage : colors.line2}
                />
              </View>
              <T variant="sub">{st.blurb}</T>
              <View style={styles.counts}>
                {SLOTS.map((sl) => (
                  <View key={sl.id} style={styles.count}>
                    <View style={[styles.dot, { backgroundColor: sl.color }]} />
                    <T variant="label">
                      {st.steps.filter((x) => x.slot === sl.id).length} {sl.name.toLowerCase()}
                    </T>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <Footer>
        <Button label="Continue" onPress={() => router.push('/welcome/ready')} />
      </Footer>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  option: {
    padding: 16,
    gap: 6,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionOn: { borderColor: colors.sage },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  counts: { flexDirection: 'row', gap: 14, marginTop: 4 },
  count: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
