import type { ColorValue } from 'react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bits';
import type { Step } from '@/db/types';
import { colors, font, minTouch, radius } from '@/theme/tokens';

import { litres } from '../today/Water';

export const RULE_TAG: Record<string, string> = {
  every: 'Every day',
  shampoo: 'Wash days',
  noshampoo: 'No-wash days',
  exfoliate: 'Exfoliation days',
  noexfoliate: 'Non-exfoliation days',
  optional: 'If needed',
};

/** One step in the Routine list: number (drag handle) on a rail, then a card that opens the editor. */
export function StepCard({
  step,
  n,
  accent,
  last,
  handle,
}: {
  step: Step;
  n: number;
  accent: ColorValue;
  last: boolean;
  handle: (child: ReactNode) => ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.railCol}>
        {handle(
          <View
            style={[styles.dot, { borderColor: accent }]}
            accessibilityRole="adjustable"
            accessibilityLabel={`Hold and drag to reorder ${step.name}`}>
            <Text style={styles.num}>{n}</Text>
          </View>,
        )}
        {!last ? <View style={styles.rail} /> : null}
      </View>
      <Pressable
        onPress={() => router.push({ pathname: '/step/[id]', params: { id: step.id } })}
        accessibilityRole="button"
        accessibilityHint="Opens the step editor"
        style={({ pressed }) => [
          styles.card,
          step.paused && { opacity: 0.55 },
          pressed && { backgroundColor: colors.card2 },
        ]}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.name}>{step.name}</Text>
          <View style={styles.meta}>
            {step.type === 'water' ? (
              <Tag>{litres(step.goal || 3000)} L a day</Tag>
            ) : step.product ? (
              <Text style={styles.product}>{step.product}</Text>
            ) : (
              <Text style={[styles.product, { color: colors.gold }]}>+ Add product</Text>
            )}
            {step.on !== 'every' ? <Tag hot={step.on !== 'optional'}>{RULE_TAG[step.on] ?? step.on}</Tag> : null}
            {step.essential ? <Tag icon="airplane">essential</Tag> : null}
            {step.paused ? <Tag>paused</Tag> : null}
          </View>
        </View>
        <Icon name="chevron.right" size={13} color={colors.dim} />
      </Pressable>
    </View>
  );
}

function Tag({ children, hot, icon }: { children: ReactNode; hot?: boolean; icon?: 'airplane' }) {
  return (
    <View style={[styles.tag, hot && { backgroundColor: colors.sageSoft }]}>
      {icon ? <Icon name={icon} size={10} color={colors.muted} /> : null}
      <Text style={[styles.tagText, hot && { color: colors.sage }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  railCol: { width: 30, alignItems: 'center' },
  dot: {
    width: 30,
    height: 30,
    marginTop: 12,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  num: { ...font.monoMedium, fontSize: 12, color: colors.text },
  rail: { position: 'absolute', top: 46, bottom: -14, width: 1.5, backgroundColor: colors.line2 },
  card: {
    flex: 1,
    minHeight: minTouch + 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: radius.small,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  name: { ...font.semibold, fontSize: 15, lineHeight: 20, color: colors.text },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  product: { ...font.regular, fontSize: 12.5, color: colors.dim },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.fill,
  },
  tagText: { ...font.semibold, fontSize: 11, color: colors.muted },
});
