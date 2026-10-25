import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/bits';
import { Lune } from '@/components/Lune';
import { Button } from '@/components/ui';
import { useDraft, type Draft } from '@/components/welcome/draft';
import { minutesFor, STARTERS, type StarterId } from '@/data/starters';
import type { Goal, SkinType } from '@/db/types';
import { WD } from '@/logic/dates';
import { colors, font, minTouch, radius } from '@/theme/tokens';

const ORDER = [1, 2, 3, 4, 5, 6, 0];

type Option<V> = { v: V; title: string; sub: string; sw: [string, string] };

const SKIN: Option<SkinType>[] = [
  { v: 'dry', title: 'Dry or tight', sub: 'Flaky patches, needs comfort', sw: ['#FDE2C9', '#FFC39B'] },
  { v: 'combination', title: 'Combination', sub: 'Shiny T-zone, normal cheeks', sw: ['#E4E0FF', '#B9ADFF'] },
  { v: 'oily', title: 'Oily', sub: 'Shine by midday, some breakouts', sw: ['#D8F3E6', '#96DCB9'] },
  { v: 'sensitive', title: 'Sensitive', sub: 'Redness, stings easily', sw: ['#FDE0EC', '#F7A9C9'] },
];

const GOALS: Option<Goal>[] = [
  { v: 'glow', title: 'Glow and even tone', sub: 'Brighter, less dull', sw: ['#FFE1C4', '#FFB27A'] },
  { v: 'clear', title: 'Clearer skin', sub: 'Fewer breakouts', sw: ['#D8F3E6', '#8BE3AE'] },
  { v: 'hydration', title: 'Hydration', sub: 'Comfortable, never tight', sw: ['#D6F1F8', '#6FCDE3'] },
  { v: 'hair', title: 'Healthy hair and scalp', sub: 'Wash days that work', sw: ['#E4E0FF', '#9B7BF2'] },
  { v: 'habit', title: 'Just be consistent', sub: 'Show up every day', sw: ['#FDE0EC', '#F06FA5'] },
];

const SIZE_SW: Record<StarterId, [string, string]> = {
  simple: ['#FDE2C9', '#FFC39B'],
  classic: ['#FDE0EC', '#F06FA5'],
  full: ['#E4E0FF', '#9B7BF2'],
};

const STEPS = ['name', 'skin', 'goals', 'size', 'wash'] as const;

function Choice<V>({ o, on, onPress, multi }: { o: Option<V>; on: boolean; onPress: () => void; multi?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${o.title}. ${o.sub}`}
      style={({ pressed }) => [styles.opt, on && styles.optOn, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <LinearGradient colors={o.sw} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sw} />
      <View style={{ flex: 1 }}>
        <Text style={styles.optTitle}>{o.title}</Text>
        <Text style={styles.optSub}>{o.sub}</Text>
      </View>
      <View style={[styles.tick, on && styles.tickOn]}>
        {on ? <Icon name="checkmark" size={13} color={colors.onInk} /> : null}
      </View>
    </Pressable>
  );
}

/** Five quick questions: name, skin, goals, routine size, wash days. */
export default function About() {
  const { draft, set } = useDraft();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const step = STEPS[i];

  const can: Record<(typeof STEPS)[number], boolean> = {
    name: !!draft.name.trim(),
    skin: !!draft.skin,
    goals: draft.goals.length > 0,
    size: true,
    wash: true,
  };
  const next = () => (i < STEPS.length - 1 ? setI(i + 1) : router.push('/welcome/ready'));
  const back = () => (i > 0 ? setI(i - 1) : router.back());
  const toggleGoal = (g: Goal) =>
    set({ goals: draft.goals.includes(g) ? draft.goals.filter((x) => x !== g) : [...draft.goals, g] });
  const toggleDay = (d: number) =>
    set({ washDays: draft.washDays.includes(d) ? draft.washDays.filter((x) => x !== d) : [...draft.washDays, d] });

  const title: Record<typeof step, [string, string, string]> = {
    name: ['What should', 'Lune call you?', 'Only used to greet you on Today.'],
    skin: [
      'How does your skin',
      'usually feel?',
      'We tune your starting ritual to it. You can change everything later.',
    ],
    goals: ['What do you', 'want most?', 'Pick as many as you like.'],
    size: ['How much', 'time do you have?', 'Start small if you’re new. Steps can be added any time.'],
    wash: ['Which nights do', 'you wash your hair?', 'Shampoo, conditioner and exfoliating show up on these nights.'],
  };
  const [thin, bold, sub] = title[step];

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.bar}>
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Back" style={styles.back} hitSlop={6}>
          <Icon name="chevron.left" size={16} color={colors.text} />
        </Pressable>
        <View style={styles.dashes} accessibilityLabel={`Question ${i + 1} of ${STEPS.length}`}>
          {STEPS.map((s, j) => (
            <View key={s} style={[styles.dash, j <= i && styles.dashOn]} />
          ))}
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <Animated.View
          key={step}
          entering={FadeInRight.duration(320)}
          exiting={FadeOutLeft.duration(160)}
          style={{ gap: 10 }}>
          <Text style={styles.thin} accessibilityRole="header">
            {thin} <Text style={styles.bold}>{bold}</Text>
          </Text>
          <Text style={styles.sub}>{sub}</Text>

          {step === 'name' ? (
            <View style={{ gap: 18, marginTop: 8 }}>
              <TextInput
                value={draft.name}
                onChangeText={(name) => set({ name })}
                placeholder="First name"
                placeholderTextColor={colors.dim}
                autoFocus
                autoCapitalize="words"
                textContentType="givenName"
                returnKeyType="next"
                onSubmitEditing={() => can.name && next()}
                style={styles.input}
                accessibilityLabel="First name"
              />
              <View style={styles.luneRow}>
                <Lune mood="happy" size={70} />
                <Text style={styles.luneText}>
                  {draft.name.trim() ? `Lovely to meet you, ${draft.name.trim()}.` : 'Hi! I’m Lune.'}
                </Text>
              </View>
            </View>
          ) : null}

          {step === 'skin'
            ? SKIN.map((o) => <Choice key={o.v} o={o} on={draft.skin === o.v} onPress={() => set({ skin: o.v })} />)
            : null}

          {step === 'goals'
            ? GOALS.map((o) => (
                <Choice key={o.v} o={o} multi on={draft.goals.includes(o.v)} onPress={() => toggleGoal(o.v)} />
              ))
            : null}

          {step === 'size'
            ? STARTERS.map((st) => (
                <Choice
                  key={st.id}
                  o={{
                    v: st.id,
                    title: `${st.name} · about ${minutesFor(st.steps.filter((x) => x.slot !== 'health').length / 2)} min`,
                    sub: `${st.blurb} ${['am', 'pm', 'health']
                      .map(
                        (id) =>
                          `${st.steps.filter((x) => x.slot === id).length} ${id === 'am' ? 'morning' : id === 'pm' ? 'night' : 'health'}`,
                      )
                      .join(' · ')}.`,
                    sw: SIZE_SW[st.id],
                  }}
                  on={draft.starter === st.id}
                  onPress={() => set({ starter: st.id } as Partial<Draft>)}
                />
              ))
            : null}

          {step === 'wash' ? (
            <View style={styles.days}>
              {ORDER.map((d) => {
                const on = draft.washDays.includes(d);
                return (
                  <Pressable
                    key={d}
                    onPress={() => {
                      Haptics.selectionAsync();
                      toggleDay(d);
                    }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={WD[d]}
                    style={[styles.day, on && styles.dayOn]}>
                    <Text style={[styles.dayText, on && { color: colors.onInk }]}>{WD[d].slice(0, 2)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button label={i === STEPS.length - 1 ? 'See my ritual' : 'Continue'} disabled={!can[step]} onPress={next} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 18px -8px rgba(0,0,0,0.18)',
  },
  dashes: { flex: 1, flexDirection: 'row', gap: 6 },
  dash: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line2 },
  dashOn: { backgroundColor: colors.ink },
  body: { padding: 20, paddingTop: 22, width: '100%', maxWidth: 600, alignSelf: 'center' },
  thin: { ...font.thin, fontSize: 38, lineHeight: 40, letterSpacing: -1.3, color: colors.text },
  bold: { ...font.bold },
  sub: { ...font.regular, fontSize: 15.5, lineHeight: 21, color: colors.muted, marginBottom: 6 },
  input: {
    minHeight: 60,
    paddingHorizontal: 20,
    borderRadius: 30,
    backgroundColor: colors.card,
    color: colors.text,
    ...font.medium,
    fontSize: 20,
    boxShadow: '0 14px 32px -24px rgba(20,20,40,0.4)',
  },
  luneRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  luneText: { ...font.medium, fontSize: 16, color: colors.muted, flex: 1 },
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 26,
    borderCurve: 'continuous',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: 'transparent',
    boxShadow: '0 14px 32px -24px rgba(20,20,40,0.4)',
  },
  optOn: { borderColor: colors.ink },
  sw: { width: 46, height: 46, borderRadius: 23 },
  optTitle: { ...font.semibold, fontSize: 16, color: colors.text },
  optSub: { ...font.regular, fontSize: 13, lineHeight: 17, color: colors.muted, marginTop: 1 },
  tick: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickOn: { backgroundColor: colors.ink, borderWidth: 0 },
  days: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 8 },
  day: {
    flex: 1,
    minHeight: minTouch + 8,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOn: { backgroundColor: colors.ink },
  dayText: { ...font.semibold, fontSize: 15, color: colors.text },
  foot: { paddingHorizontal: 20, paddingTop: 12, width: '100%', maxWidth: 600, alignSelf: 'center' },
});
