import type { SFSymbol } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/bits';
import type { Badge } from '@/logic/rewards';
import { AURA, colors, DEW, NIGHT } from '@/theme/tokens';

export const MEDAL: Record<Badge['tone'], readonly [string, string, ...string[]]> = {
  aura: AURA,
  morning: ['#FFC69A', '#FF9F6B'],
  night: NIGHT,
  health: ['#8FDDF0', '#3FB8D6'],
  skin: ['#F9B4D1', '#F06FA5'],
  sage: DEW,
  gold: ['#FFE08A', '#E5B23F'],
};

/** A round glossy medal for a badge; grey and quiet until it's earned. */
export function Medal({ badge, size = 54 }: { badge: Pick<Badge, 'icon' | 'tone' | 'got'>; size?: number }) {
  return (
    <View
      style={[
        styles.medal,
        { width: size, height: size, borderRadius: size / 2 },
        badge.got ? styles.lit : { backgroundColor: colors.fill },
      ]}>
      {badge.got ? (
        <LinearGradient colors={MEDAL[badge.tone]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      ) : null}
      {badge.got ? <View style={[styles.shine, { borderRadius: size / 2 }]} /> : null}
      <Icon name={badge.icon as SFSymbol} size={size * 0.4} color={badge.got ? '#FFFFFF' : colors.dim} />
    </View>
  );
}

const styles = StyleSheet.create({
  medal: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  lit: { boxShadow: '0 10px 22px -12px rgba(160,80,160,0.7)' },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
  },
});
