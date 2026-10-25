import { StyleSheet, Text, View } from 'react-native';

import { Lune, type LuneMood } from '@/components/Lune';
import type { Motive } from '@/logic/scoring';
import { colors, font, radius } from '@/theme/tokens';

/** Lune with today's line in a dark speech card. */
export function LuneSays({ mood, line }: { mood: LuneMood; line: Motive }) {
  return (
    <View style={styles.card}>
      <Lune mood={mood} size={58} still />
      <View style={{ flex: 1 }}>
        <Text style={styles.who}>Lune</Text>
        <Text style={styles.text}>
          {line.before}
          {line.em ? <Text style={styles.em}>{line.em}</Text> : null}
          {line.after ?? ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.ink,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  who: { ...font.semibold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.rose },
  text: { ...font.regular, fontSize: 15.5, lineHeight: 21, color: colors.onInk, marginTop: 2 },
  em: { ...font.bold },
});
