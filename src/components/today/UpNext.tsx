import { StyleSheet, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { SlideToConfirm } from '@/components/glow/SlideToConfirm';
import { Card, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { nextUp, type DayInfo } from '@/logic/scoring';
import { colors, font, SLOTS } from '@/theme/tokens';

/** The next undone step for the time of day, big, with a slide to mark it done. */
export function UpNext({ k, info, isToday }: { k: string; info: DayInfo; isToday: boolean }) {
  const s = useStore()!;
  const nu = isToday ? nextUp(info) : null;
  const slot = nu ? SLOTS.find((z) => z.id === nu.slot)! : null;

  // Nothing left (or a past day): Lune's line above already says how the day went.
  if (!nu || !slot) return null;

  return (
    <Card>
      <Text style={styles.label}>
        Up next · <Text style={{ color: slot.color }}>{slot.name}</Text>
      </Text>
      <Animated.View key={nu.step.id} entering={FadeIn.duration(260)}>
        <Text style={styles.name}>{nu.step.name}</Text>
        {nu.step.product || nu.step.note ? (
          <T variant="sub" numberOfLines={2}>
            {[nu.step.product, nu.step.note].filter(Boolean).join(' · ')}
          </T>
        ) : null}
      </Animated.View>
      <SlideToConfirm label="Slide to mark done" onConfirm={() => s.tick(k, nu.step.id)} style={{ marginTop: 14 }} />
    </Card>
  );
}

const styles = StyleSheet.create({
  label: {
    ...font.semibold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  name: { ...font.semibold, fontSize: 24, lineHeight: 29, letterSpacing: -0.5, color: colors.text, marginTop: 4 },
});
