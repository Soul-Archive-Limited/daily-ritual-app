import * as Haptics from 'expo-haptics';
import type { SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { CountUp, Icon, IconTile } from '@/components/bits';
import { Button, Card, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { useShelf } from '@/data/useShelf';
import type { Step } from '@/db/types';
import { groupLabels, isActive, type DayInfo, type DayStep } from '@/logic/scoring';
import { slug } from '@/logic/shelf';
import { colors, font, minTouch, SLOTS, type SlotId } from '@/theme/tokens';

import { StepRow } from './StepRow';
import { litres } from './Water';

export const SLOT_ICONS: Record<SlotId, SFSymbol> = { am: 'sun.max', pm: 'moon', health: 'waveform.path.ecg' };

type Props = {
  k: string;
  slotId: SlotId;
  info: DayInfo;
  future: boolean;
  folded: boolean;
  onToggle: () => void;
  /** Without its own header: Today shows the routine's card above it instead */
  bare?: boolean;
  children?: React.ReactNode;
};

/** One routine (Morning / Night / Health) as a checklist card that folds to its header. */
export function SlotSection({ k, slotId, info, future, folded, onToggle, bare }: Props) {
  const s = useStore()!;
  const shelf = useShelf();
  const lowPct = (st: DayStep) => {
    if (!st.product) return undefined;
    const f = shelf.find((x) => x.p.id === slug(st.product))?.st.frac;
    return f != null && f <= 0.2 ? Math.round(f * 100) : undefined;
  };
  const sl = SLOTS.find((z) => z.id === slotId)!;
  const steps = s.steps;

  const ids = new Set(info.exp.filter((x) => x.slot === slotId).map((x) => x.id));
  const skIds = new Set(info.skipped.filter((x) => x.slot === slotId).map((x) => x.id));
  // Routine order first, then snapshot-only steps (removed from the routine since that day).
  const order: DayStep[] = [
    ...steps.filter((x) => ids.has(x.id) || skIds.has(x.id)),
    ...info.exp.filter((x) => x.slot === slotId && !steps.some((y) => y.id === x.id)),
    ...info.skipped.filter((x) => x.slot === slotId && !steps.some((y) => y.id === x.id)),
  ];
  const z = info.slot[slotId];
  const off = steps.filter(
    (x) => x.slot === slotId && x.on !== 'optional' && !x.paused && !ids.has(x.id) && !skIds.has(x.id),
  );
  const opt = steps.filter((x) => x.slot === slotId && x.on === 'optional' && !x.paused);
  const left = z.n - z.d;
  const labels = groupLabels(order);

  const actives =
    slotId === 'pm' && !future ? order.filter((x) => isActive(x) && !info.done[x.id] && !skIds.has(x.id)) : [];

  const subtitle = `${z.n ? (z.d === z.n ? 'All done' : `${left} still to do`) : 'Nothing today'}${skIds.size ? ` · ${skIds.size} skipped` : ''}`;

  return (
    <View>
      <Card>
        {bare ? null : (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onToggle();
            }}
            accessibilityRole="button"
            accessibilityState={{ expanded: !folded }}
            accessibilityLabel={`${sl.name}, ${subtitle}, ${z.d} of ${z.n} done`}
            style={styles.head}>
            <IconTile name={SLOT_ICONS[slotId]} color={sl.color} />
            <View style={{ flex: 1 }}>
              <T variant="h2">{sl.name}</T>
              <T variant="sub">{subtitle}</T>
            </View>
            <View style={styles.cnt}>
              <CountUp value={z.d} style={styles.cntBig} />
              <Text style={styles.cntOf}> / {z.n}</Text>
            </View>
            <View style={[styles.fold, !folded && { transform: [{ rotate: '180deg' }] }]}>
              <Icon name="chevron.down" size={13} color={colors.muted} />
            </View>
          </Pressable>
        )}

        {!folded ? (
          <Animated.View entering={FadeIn.duration(200)}>
            {bare ? null : (
              <View style={styles.seg} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {Array.from({ length: z.n }).map((_, i) => (
                  <View key={i} style={[styles.segI, i < z.d && { backgroundColor: sl.color }]} />
                ))}
              </View>
            )}

            {order.map((step, j) => (
              <View key={step.id}>
                {labels[j] ? <Text style={styles.grp}>{labels[j]}</Text> : null}
                {step.type === 'water' ? (
                  // The water body has its own card on Today; here just the progress.
                  <View
                    style={styles.waterRow}
                    accessible
                    accessibilityLabel={`${step.name}: ${litres(info.water)} of ${litres(step.goal || 3000)} litres`}>
                    <Icon name="drop.fill" size={14} color={colors.health} />
                    <Text style={styles.waterName}>{step.name}</Text>
                    <View style={styles.waterBar}>
                      <View
                        style={[
                          styles.waterFill,
                          { width: `${Math.min(100, (info.water / (step.goal || 3000)) * 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.waterNum}>
                      {litres(info.water)}/{litres(step.goal || 3000)} L
                    </Text>
                  </View>
                ) : (
                  <StepRow
                    k={k}
                    step={step}
                    doneAt={info.done[step.id]}
                    tz={info.tz}
                    skipped={skIds.has(step.id)}
                    future={future}
                    accent={sl.color}
                    lowPct={lowPct(step)}
                  />
                )}
              </View>
            ))}

            {actives.length ? (
              <View style={styles.skipAct}>
                <Text style={styles.skipActText}>
                  Skin stinging or red? Rest the actives tonight ({actives.map((a) => a.name).join(', ')}). Skipped
                  steps don’t count against you.
                </Text>
                <Button
                  label="Skip actives"
                  kind="line"
                  small
                  onPress={() => s.skipActives(k)}
                  style={{ alignSelf: 'flex-start' }}
                />
              </View>
            ) : null}

            {opt.length ? (
              <>
                <View style={styles.subhead}>
                  <Text style={styles.subheadText}>Only if needed</Text>
                  <Text style={styles.subheadText}>not counted</Text>
                </View>
                {opt.map((step: Step) => (
                  <StepRow
                    key={step.id}
                    k={k}
                    step={step}
                    doneAt={info.done[step.id]}
                    tz={info.tz}
                    optional
                    future={future}
                    accent={sl.color}
                  />
                ))}
              </>
            ) : null}

            {off.length ? (
              <View style={styles.subhead}>
                <Text style={styles.subheadText}>
                  {info.flags.travel ? 'Skipped on travel days' : 'Not today'}: {off.map((x) => x.name).join(', ')}
                </Text>
              </View>
            ) : null}
          </Animated.View>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  waterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 8 },
  waterName: { ...font.semibold, fontSize: 16, color: colors.text },
  waterBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.fill, overflow: 'hidden' },
  waterFill: { height: '100%', borderRadius: 3, backgroundColor: colors.health },
  waterNum: { ...font.mono, fontSize: 12, color: colors.muted },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: minTouch },
  cnt: { flexDirection: 'row', alignItems: 'baseline' },
  cntBig: { ...font.light, fontSize: 30, color: colors.text, fontVariant: ['tabular-nums'] },
  cntOf: { ...font.medium, fontSize: 13, color: colors.muted },
  fold: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
  },
  seg: { flexDirection: 'row', gap: 3, marginTop: 14, marginBottom: 6 },
  segI: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.line2 },
  grp: {
    ...font.bold,
    fontSize: 11.5,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.dim,
    paddingTop: 10,
    paddingHorizontal: 8,
    paddingBottom: 2,
  },
  skipAct: { marginTop: 10, gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.fill },
  skipActText: { ...font.regular, fontSize: 12.5, lineHeight: 17, color: colors.muted },
  subhead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 8,
    paddingBottom: 4,
    gap: 8,
  },
  subheadText: { ...font.regular, fontSize: 12, lineHeight: 16, color: colors.dim, flexShrink: 1 },
});
