import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bits';
import { Lune, type LuneMood, type LuneOutfit } from '@/components/Lune';
import type { Motive } from '@/logic/scoring';
import { colors, font, radius } from '@/theme/tokens';

/** Lune with today's line in a dark speech card. Tap Lune to play; tap the words to ask her something. */
export function LuneSays({
  mood,
  line,
  react,
  outfit,
  onAsk,
}: {
  mood: LuneMood;
  line: Motive;
  react?: number;
  outfit?: LuneOutfit;
  onAsk?: () => void;
}) {
  return (
    <View style={styles.card}>
      <Lune mood={mood} size={64} react={react} outfit={outfit} label="Lune. Tap to play" />
      <Pressable
        style={{ flex: 1 }}
        onPress={onAsk}
        disabled={!onAsk}
        accessibilityRole={onAsk ? 'button' : undefined}
        accessibilityHint={onAsk ? 'Ask Lune about your skin and routine' : undefined}>
        <Text style={styles.who}>Lune</Text>
        <Text style={styles.text}>
          {line.before}
          {line.em ? <Text style={styles.em}>{line.em}</Text> : null}
          {line.after ?? ''}
        </Text>
        {onAsk ? (
          <View style={styles.ask}>
            <Icon name="sparkles" size={12} color={colors.rose} />
            <Text style={styles.askText}>Ask me about your skin</Text>
          </View>
        ) : null}
      </Pressable>
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
  ask: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  askText: { ...font.semibold, fontSize: 13, color: colors.rose },
});
