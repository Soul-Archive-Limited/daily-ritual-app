import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { SheetDone } from '@/components/SheetDone';
import { Button, T } from '@/components/ui';
import { useStore } from '@/data/store';
import type { StepRule } from '@/db/types';
import { colors, font, minTouch, radius, SLOTS } from '@/theme/tokens';

const RULES: [StepRule, string][] = [
  ['every', 'Every day'],
  ['shampoo', 'Wash days'],
  ['noshampoo', 'No-wash days'],
  ['exfoliate', 'Exfoliation days'],
  ['noexfoliate', 'Non-exfoliation days'],
  ['optional', 'Only if needed'],
];

/** Edit one step. Every change saves straight away; old days keep what they were. */
export default function StepEditor() {
  const { id, isNew } = useLocalSearchParams<{ id: string; isNew?: string }>();
  const s = useStore();
  const step = s?.steps.find((x) => x.id === id);
  const [name, setName] = useState(step?.name ?? '');

  if (!s || !step) return <View style={styles.screen} />;
  const c = s.config;
  const slotSteps = s.steps.filter((x) => x.slot === step.slot);
  const pos = slotSteps.findIndex((x) => x.id === step.id);
  const rules = RULES.filter(([r]) => c.exfoliateMode || !/exfoliate/.test(r) || step.on === r);

  const close = () => router.back();

  return (
    <View style={styles.screen}>
      <Stack.Title>{`${SLOTS.find((z) => z.id === step.slot)?.name} · step ${pos + 1}`}</Stack.Title>
      <SheetDone onPress={close} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        <Field label="Step">
          <TextInput
            value={name}
            autoFocus={isNew === '1'}
            selectTextOnFocus={isNew === '1'}
            onChangeText={(v) => {
              setName(v);
              if (v.trim()) s.updateStep(step.id, { name: v.trim() });
            }}
            onEndEditing={() => {
              if (!name.trim()) {
                setName(step.name);
              }
            }}
            style={styles.input}
            placeholder="What you do"
            placeholderTextColor={colors.dim}
            returnKeyType="done"
            accessibilityLabel="Step name"
          />
        </Field>

        {step.type === 'water' ? (
          <Field label="Daily goal">
            <View style={styles.chips}>
              {[2000, 2500, 3000, 3500, 4000].map((g) => (
                <Chip
                  key={g}
                  label={`${g / 1000} L`}
                  on={(step.goal || 3000) === g}
                  onPress={() => s.updateStep(step.id, { goal: g })}
                />
              ))}
            </View>
          </Field>
        ) : (
          <>
            <Field label="Product">
              <TextInput
                defaultValue={step.product}
                onChangeText={(v) => s.updateStep(step.id, { product: v.trim() })}
                style={styles.input}
                placeholder="Brand and name"
                placeholderTextColor={colors.dim}
                returnKeyType="done"
                accessibilityLabel="Product"
              />
            </Field>
            <Field label="How / where / how much">
              <TextInput
                defaultValue={step.note}
                onChangeText={(v) => s.updateStep(step.id, { note: v })}
                style={[styles.input, styles.multi]}
                placeholder="Pea-sized, face and neck."
                placeholderTextColor={colors.dim}
                multiline
                accessibilityLabel="How to do it"
              />
            </Field>
          </>
        )}

        <Field label="When">
          <View style={styles.chips}>
            {rules.map(([r, label]) => (
              <Chip key={r} label={label} on={step.on === r} onPress={() => s.updateStep(step.id, { on: r })} />
            ))}
          </View>
          {step.on === 'optional' ? (
            <T variant="sub" style={{ marginTop: 6 }}>
              Listed under “Only if needed” on Today. Never counted.
            </T>
          ) : null}
        </Field>

        <Field label="Routine">
          <View style={styles.seg}>
            {SLOTS.map((z) => {
              const on = step.slot === z.id;
              return (
                <Pressable
                  key={z.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => s.updateStep(step.id, { slot: z.id })}
                  style={[styles.segBtn, on && { backgroundColor: colors.text }]}>
                  <Text style={[styles.segText, on && { color: colors.bg }]}>{z.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <T>Keep on travel days</T>
            <T variant="sub">Essential. On a travel day only these count.</T>
          </View>
          <Switch
            value={!!step.essential}
            onValueChange={(v) => s.updateStep(step.id, { essential: v || undefined })}
            trackColor={{ true: colors.sage, false: colors.card2 }}
            accessibilityLabel="Keep on travel days"
          />
        </View>

        <View style={styles.actions}>
          <Button
            label="Up"
            icon="arrow.up"
            kind="line"
            small
            disabled={pos <= 0}
            onPress={() => {
              Haptics.selectionAsync();
              s.moveStep(step.id, -1);
            }}
          />
          <Button
            label="Down"
            icon="arrow.down"
            kind="line"
            small
            disabled={pos >= slotSteps.length - 1}
            onPress={() => {
              Haptics.selectionAsync();
              s.moveStep(step.id, 1);
            }}
          />
          <Button
            label="Duplicate"
            kind="line"
            small
            onPress={() => {
              const nid = s.duplicateStep(step.id);
              if (nid) router.setParams({ id: nid, isNew: undefined });
            }}
          />
          <Button label={step.paused ? 'Resume' : 'Pause'} kind="line" small onPress={() => s.togglePause(step.id)} />
        </View>

        {step.type !== 'water' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              close();
              s.removeStep(step.id);
            }}
            style={({ pressed }) => [styles.remove, pressed && { opacity: 0.7 }]}>
            <Text style={styles.removeText}>Remove step</Text>
          </Pressable>
        ) : null}

        <T variant="sub" style={{ textAlign: 'center', marginTop: 4 }}>
          Changes apply from today. Days already logged keep their own list.
        </T>
      </ScrollView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <T variant="label">{label}</T>
      {children}
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.chip, on && { backgroundColor: colors.sage, borderColor: colors.sage }]}>
      <Text style={[styles.chipText, on && { color: colors.sageInk }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 20, paddingTop: 8, paddingBottom: 60, gap: 20 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 10,
  },
  input: {
    minHeight: minTouch + 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.small,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.line2,
    color: colors.text,
    ...font.regular,
    fontSize: 16,
  },
  multi: { minHeight: 76, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 38,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: colors.fill,
  },
  chipText: { ...font.semibold, fontSize: 13.5, color: colors.text },
  seg: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segBtn: { flex: 1, minHeight: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segText: { ...font.medium, fontSize: 14, color: colors.muted },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.small,
    backgroundColor: colors.fill,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  remove: {
    minHeight: minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.emptySoft,
  },
  removeText: { ...font.semibold, fontSize: 15, color: colors.empty },
});
