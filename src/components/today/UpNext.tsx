import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';

import { Bar, MiniRing } from '@/components/bits';
import { Button, Card, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { nextUp, slotPct, type DayInfo } from '@/logic/scoring';
import { colors, font, SLOTS } from '@/theme/tokens';

export function UpNext({ k, info, isToday }: { k: string; info: DayInfo; isToday: boolean }) {
  const s = useStore()!;
  const nu = isToday ? nextUp(info) : null;
  const slot = nu ? SLOTS.find((z) => z.id === nu.slot)! : null;
  const sub = `${info.n} of ${info.total} done${info.skipped.length ? ` · ${info.skipped.length} skipped` : ''}`;

  return (
    <Card>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <T variant="h2">{isToday ? 'Up next' : 'This day'}</T>
          <T variant="sub">{sub}</T>
        </View>
        <MiniRing p={info.p} />
      </View>

      {nu && slot ? (
        <>
          <View style={styles.next}>
            <View style={[styles.dot, { backgroundColor: slot.color }]} />
            <View style={{ flex: 1 }}>
              <T variant="label">{slot.name}</T>
              <Text style={styles.name}>{nu.step.name}</Text>
              {nu.step.product ? <T variant="sub">{nu.step.product}</T> : null}
            </View>
          </View>
          <Button
            label="Mark done"
            icon="checkmark"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              s.tick(k, nu.step.id);
            }}
          />
        </>
      ) : (
        <View style={styles.next}>
          <Text style={styles.name}>
            {info.total && info.n === info.total
              ? 'All done'
              : isToday
                ? 'Only water left'
                : `${info.total - info.n} not ticked`}
          </Text>
        </View>
      )}

      <View style={styles.minis}>
        {SLOTS.map((sl) => {
          const z = info.slot[sl.id];
          return (
            <View key={sl.id} style={styles.mini}>
              <T variant="label">{sl.name}</T>
              <Text style={styles.miniNum}>
                {z.d}/{z.n}
              </Text>
              <Bar p={slotPct(z)} color={sl.color} />
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  next: { flexDirection: 'row', gap: 12, marginTop: 10, marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  name: { ...font.semibold, fontSize: 20, lineHeight: 25, color: colors.text, letterSpacing: -0.2 },
  minis: { flexDirection: 'row', gap: 10, marginTop: 14 },
  mini: { flex: 1, gap: 3 },
  miniNum: { ...font.semibold, fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
});
