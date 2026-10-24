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

import { colors, font, minTouch, onPhoto, radius, space } from '@/theme/tokens';

type Variant = 'body' | 'label' | 'sub' | 'h2' | 'title' | 'display' | 'big' | 'mono';

/** Apple text styles: body 17, subheadline 15, footnote 13, headline 17 semibold, title2 22, large title 34. */
const variants: Record<Variant, TextStyle> = {
  body: { ...font.regular, fontSize: 17, lineHeight: 22, color: colors.text },
  label: { ...font.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  sub: { ...font.regular, fontSize: 15, lineHeight: 20, color: colors.muted },
  h2: { ...font.semibold, fontSize: 17, lineHeight: 22, color: colors.text },
  title: { ...font.bold, fontSize: 22, lineHeight: 28, color: colors.text },
  display: { ...font.bold, fontSize: 34, lineHeight: 41, color: colors.text },
  big: { ...font.bold, fontSize: 44, lineHeight: 50, color: colors.text, fontVariant: ['tabular-nums'] },
  mono: { ...font.mono, fontSize: 11, lineHeight: 13, color: colors.dim },
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
  tone?: 'plain' | 'on' | 'warn' | 'onPhoto';
  icon?: ReactNode;
}) {
  const bg =
    tone === 'on'
      ? colors.sageSoft
      : tone === 'warn'
        ? colors.goldSoft
        : tone === 'onPhoto'
          ? onPhoto.chip
          : colors.fill;
  const fg =
    tone === 'on' ? colors.sage : tone === 'warn' ? colors.gold : tone === 'onPhoto' ? onPhoto.text : colors.text;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
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
  const bg = kind === 'primary' ? colors.sage : kind === 'plain' ? colors.text : colors.fill;
  const fg = kind === 'primary' ? colors.sageInk : kind === 'plain' ? colors.card : colors.sage;
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
    padding: space.lg,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  pillText: { ...font.semibold, fontSize: 13 },
  btn: {
    minHeight: minTouch,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnSmall: { minHeight: 36, paddingHorizontal: 14 },
  btnText: { ...font.semibold, fontSize: 17 },
});
