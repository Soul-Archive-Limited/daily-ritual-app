import { Host, Picker, Text as SwiftText } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, font, onPhoto, radius, space } from '@/theme/tokens';

type Variant = 'body' | 'label' | 'sub' | 'h2' | 'title' | 'display' | 'thin' | 'big' | 'mono' | 'eyebrow';

/** Urbanist type scale: thin and bold headlines, big thin numbers, quiet labels. */
const variants: Record<Variant, TextStyle> = {
  body: { ...font.regular, fontSize: 17, lineHeight: 23, color: colors.text },
  label: { ...font.medium, fontSize: 13, lineHeight: 18, color: colors.muted },
  sub: { ...font.regular, fontSize: 15, lineHeight: 20, color: colors.muted },
  h2: { ...font.semibold, fontSize: 18, lineHeight: 23, color: colors.text, letterSpacing: -0.2 },
  title: { ...font.bold, fontSize: 24, lineHeight: 29, color: colors.text, letterSpacing: -0.4 },
  display: { ...font.bold, fontSize: 40, lineHeight: 42, color: colors.text, letterSpacing: -1.4 },
  thin: { ...font.thin, fontSize: 40, lineHeight: 42, color: colors.text, letterSpacing: -1.4 },
  big: { ...font.thin, fontSize: 52, lineHeight: 56, color: colors.text, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  mono: { ...font.mono, fontSize: 11, lineHeight: 13, color: colors.dim },
  eyebrow: { ...font.semibold, fontSize: 12, lineHeight: 16, color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase' },
};

export function T({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  return <Text {...rest} style={[variants[variant], style]} />;
}

/** Inset grouped section, as in Settings and Health. */
export function Card({
  children,
  style,
  small,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const r = small ? radius.small : radius.card;
  return <View style={[styles.card, { borderRadius: r, borderCurve: 'continuous' }, style]}>{children}</View>;
}

export function Pill({
  children,
  tone = 'plain',
  icon,
}: {
  children: ReactNode;
  /** onPhoto: a dark glassy chip readable over a photo in both modes */
  /** chip: a white chip on the page background; ink: the dark chip */
  tone?: 'plain' | 'on' | 'warn' | 'onPhoto' | 'ink' | 'chip';
  icon?: ReactNode;
}) {
  const bg =
    tone === 'on'
      ? colors.sageSoft
      : tone === 'ink'
        ? colors.ink
      : tone === 'warn'
        ? colors.goldSoft
        : tone === 'onPhoto'
          ? onPhoto.chip
          : tone === 'chip'
            ? colors.card
            : colors.fill;
  const fg =
    tone === 'ink' ? colors.onInk : tone === 'on' ? colors.sage : tone === 'warn' ? colors.gold : tone === 'onPhoto' ? onPhoto.text : colors.text;
  const lifted = tone === 'chip' || tone === 'ink';
  return (
    <View style={[styles.pill, { backgroundColor: bg }, lifted && styles.lifted]}>
      {icon}
      <Text style={[styles.pillText, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  icon,
  small,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  kind?: 'primary' | 'plain' | 'line';
  icon?: SFSymbol;
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = kind === 'primary' ? colors.ink : kind === 'plain' ? colors.card : colors.fill;
  const fg = kind === 'primary' ? colors.onInk : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={small ? 4 : undefined}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        {
          backgroundColor: bg,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}>
      {icon ? (
        <SymbolView
          name={icon}
          size={small ? 13 : 15}
          tintColor={fg}
          weight="semibold"
          style={{ width: small ? 13 : 15, height: small ? 13 : 15 }}
        />
      ) : null}
      <Text style={[styles.btnText, small && { fontSize: 13.5 }, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/** Native iOS segmented control (Shelf's list/bag, Progress views and ranges). */
export function Seg<V extends string | number>({
  options,
  value,
  onChange,
  label,
  style,
}: {
  options: readonly (readonly [V, string])[];
  value: V;
  onChange: (v: V) => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Host matchContents={{ vertical: true }} style={[styles.seg, style]}>
      <Picker<V> label={label} selection={value} onSelectionChange={onChange} modifiers={[pickerStyle('segmented')]}>
        {options.map(([v, text]) => (
          <SwiftText key={String(v)} modifiers={[tag(v)]}>
            {text}
          </SwiftText>
        ))}
      </Picker>
    </Host>
  );
}

const styles = StyleSheet.create({
  seg: { alignSelf: 'stretch', width: '100%', maxWidth: 560, minHeight: 32 },
  card: {
    padding: space.lg + 2,
    backgroundColor: colors.card,
    overflow: 'hidden',
    boxShadow: '0 18px 40px -26px rgba(20,20,40,0.35)',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  lifted: { boxShadow: '0 4px 14px -8px rgba(0,0,0,0.18)' },
  pillText: { ...font.semibold, fontSize: 13 },
  btn: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnSmall: { minHeight: 36, paddingHorizontal: 14 },
  btnText: { ...font.semibold, fontSize: 16.5 },
});
