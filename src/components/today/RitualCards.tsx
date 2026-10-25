import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CountUp, Icon } from '@/components/bits';
import type { DayInfo } from '@/logic/scoring';
import { colors, DEW, font, NIGHT, radius, SLOTS, type SlotId } from '@/theme/tokens';

import { SLOT_ICONS } from './SlotSection';

/** Time the last step of a routine was ticked, in the zone it happened in. */
function finishedAt(info: DayInfo, id: SlotId) {
  const ts = info.exp.filter((s) => s.slot === id && info.done[s.id]).map((s) => info.done[s.id]);
  if (!ts.length) return '';
  return new Date(Math.max(...ts)).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    ...(info.tz ? { timeZone: info.tz } : {}),
  });
}

/**
 * Morning, Night and Health as big cards side by side. Tapping one opens or folds its checklist below.
 * Night is the violet card; a finished routine shows the glossy green Done pill.
 */
export function RitualCards({
  info,
  isOpen,
  onOpen,
}: {
  info: DayInfo;
  isOpen: (id: SlotId) => boolean;
  onOpen: (id: SlotId) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroller}>
      {SLOTS.map((sl) => {
        const z = info.slot[sl.id];
        const skipped = info.skipped.filter((x) => x.slot === sl.id).length;
        const night = sl.id === 'pm';
        const full = z.n > 0 && z.d === z.n;
        const left = z.n - z.d;
        const meta = !z.n
          ? 'Nothing today'
          : full
            ? `Finished at ${finishedAt(info, sl.id)}`
            : sl.id === 'pm' && info.flags.shampoo
              ? `Wash night · ${left} left`
              : `${left} still to do`;
        const metaFull = skipped ? `${meta} · ${skipped} skipped` : meta;
        const on = isOpen(sl.id);
        const fg = night ? '#FFFFFF' : colors.text;
        const sub = night ? 'rgba(255,255,255,0.75)' : colors.muted;
        return (
          <Pressable
            key={sl.id}
            onPress={() => {
              Haptics.selectionAsync();
              onOpen(sl.id);
            }}
            accessibilityRole="button"
            accessibilityState={{ expanded: on }}
            accessibilityLabel={`${sl.name}, ${z.d} of ${z.n} done, ${metaFull}`}
            style={({ pressed }) => [
              styles.card,
              !night && { backgroundColor: colors.card },
              on && styles.on,
              { transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}>
            {night ? (
              <LinearGradient colors={NIGHT} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={styles.fill} />
            ) : null}
            <View style={styles.head}>
              <View style={[styles.ic, { backgroundColor: night ? 'rgba(255,255,255,0.2)' : colors.fill }]}>
                <Icon name={SLOT_ICONS[sl.id]} size={18} color={night ? '#FFFFFF' : sl.color} />
              </View>
              <Text style={[styles.name, { color: fg }]}>{sl.name}</Text>
            </View>
            <Text style={[styles.meta, { color: sub }]} numberOfLines={1}>
              {metaFull}
            </Text>
            <View style={styles.bottom}>
              <View style={styles.numRow}>
                <CountUp value={z.d} style={[styles.num, { color: fg }]} />
                <Text style={[styles.of, { color: sub }]}>/{z.n}</Text>
              </View>
              {full ? (
                <View style={styles.done}>
                  <LinearGradient colors={DEW} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.fill} />
                  <Icon name="checkmark" size={12} color="#FFFFFF" />
                  <Text style={styles.doneText}>Done</Text>
                </View>
              ) : (
                <View style={[styles.ghost, night ? styles.ghostNight : { backgroundColor: colors.fill }]}>
                  <Text style={[styles.ghostText, { color: fg }]}>{on ? 'Open' : 'Show'}</Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: { marginHorizontal: -16 },
  row: { gap: 12, paddingHorizontal: 16, paddingVertical: 4 },
  card: {
    width: 216,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: 18,
    overflow: 'hidden',
    boxShadow: '0 18px 40px -26px rgba(20,20,40,0.35)',
  },
  on: { borderWidth: 2, borderColor: colors.ink, padding: 16 },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ic: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  name: { ...font.medium, fontSize: 16 },
  meta: { ...font.light, fontSize: 13, marginTop: 24 },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 2 },
  numRow: { flexDirection: 'row', alignItems: 'baseline' },
  num: { ...font.thin, fontSize: 48, lineHeight: 52, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  of: { ...font.regular, fontSize: 18 },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 6,
    boxShadow: '0 8px 18px -8px rgba(70,179,122,0.7)',
  },
  doneText: { ...font.semibold, fontSize: 13, color: '#FFFFFF' },
  ghost: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 999, marginBottom: 6 },
  ghostNight: { backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' },
  ghostText: { ...font.semibold, fontSize: 13 },
});
