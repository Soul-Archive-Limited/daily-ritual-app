import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, T } from '@/components/ui';
import { Footer } from '@/components/welcome/Footer';
import { useDraft } from '@/components/welcome/draft';
import { WD } from '@/logic/dates';
import { colors, font, minTouch, radius } from '@/theme/tokens';

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function About() {
  const { draft, set } = useDraft();
  const toggle = (d: number) =>
    set({ washDays: draft.washDays.includes(d) ? draft.washDays.filter((x) => x !== d) : [...draft.washDays, d] });

  return (
    <View style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.body}>
        <Card style={{ gap: 8 }}>
          <T variant="h2">What should we call you?</T>
          <TextInput
            value={draft.name}
            onChangeText={(name) => set({ name })}
            placeholder="First name"
            placeholderTextColor={colors.dim}
            autoFocus
            autoCapitalize="words"
            textContentType="givenName"
            returnKeyType="done"
            style={styles.input}
            accessibilityLabel="First name"
          />
          <T variant="label">Only used for the greeting on Today.</T>
        </Card>

        <Card style={{ gap: 10 }}>
          <T variant="h2">Which days do you wash your hair?</T>
          <T variant="sub">Shampoo, conditioner and exfoliating show up on these nights. You can change it later.</T>
          <View style={styles.days}>
            {ORDER.map((d) => {
              const on = draft.washDays.includes(d);
              return (
                <Pressable
                  key={d}
                  onPress={() => toggle(d)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={WD[d]}
                  style={[styles.day, on && { backgroundColor: colors.sage }]}>
                  <Text style={[styles.dayText, on && { color: colors.sageInk }]}>{WD[d].slice(0, 2)}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      </ScrollView>
      <Footer>
        <Button label="Continue" disabled={!draft.name.trim()} onPress={() => router.push('/welcome/routine')} />
      </Footer>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
  input: {
    minHeight: minTouch + 4,
    paddingHorizontal: 14,
    borderRadius: radius.small,
    backgroundColor: colors.fill,
    color: colors.text,
    ...font.regular,
    fontSize: 17,
  },
  days: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  day: {
    flex: 1,
    minHeight: minTouch,
    borderRadius: radius.small,
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { ...font.semibold, fontSize: 15, color: colors.text },
});
