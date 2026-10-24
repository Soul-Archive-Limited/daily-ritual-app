import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, T } from '@/components/ui';
import { parseKey } from '@/logic/dates';
import { ANGLES, METRICS, WORD, type Angle, type Checkin } from '@/skin/model';
import { checkinPhotoUri } from '@/skin/photos';
import { colors, font, radius, onPhoto } from '@/theme/tokens';

const fmt = (k: string) => parseKey(k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** Side-by-side photos of 2–3 check-ins at one angle, with a score-change table. */
export function Compare({ checkins }: { checkins: Checkin[] }) {
  const [pick, setPick] = useState<string[]>(() => [checkins[1].id, checkins[0].id]);
  const [angle, setAngle] = useState<Angle>('front');
  const sel = pick.filter((id) => checkins.some((c) => c.id === id));
  const chosen = checkins.filter((c) => sel.includes(c.id)).sort((a, b) => (a.date < b.date ? -1 : 1));
  const first = chosen[0];
  const last = chosen[chosen.length - 1];

  const toggle = (id: string) =>
    setPick((p) => {
      if (p.includes(id)) return p.length > 2 ? p.filter((x) => x !== id) : p;
      return p.length >= 3 ? [...p.slice(1), id] : [...p, id];
    });

  return (
    <Card style={{ gap: 12 }}>
      <View>
        <T variant="h2">Compare</T>
        <T variant="sub">Pick 2 or 3 check-ins</T>
      </View>
      <View style={styles.row}>
        <Button
          label="Latest vs previous"
          kind="line"
          small
          onPress={() => setPick([checkins[1].id, checkins[0].id])}
        />
        <Button
          label="First vs latest"
          kind="line"
          small
          onPress={() => setPick([checkins[checkins.length - 1].id, checkins[0].id])}
        />
      </View>
      <View style={styles.seg}>
        {ANGLES.map(([a, label]) => (
          <Pressable
            key={a}
            accessibilityRole="radio"
            accessibilityState={{ checked: angle === a }}
            onPress={() => setAngle(a)}
            style={[styles.segBtn, angle === a && { backgroundColor: colors.text }]}>
            <Text style={[styles.segText, angle === a && { color: colors.bg }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {checkins.map((c) => {
          const on = sel.includes(c.id);
          return (
            <Pressable
              key={c.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(c.id)}
              style={[styles.chip, on && { backgroundColor: colors.skin, borderColor: colors.skin }]}>
              <Text style={[styles.chipText, on && { color: colors.bg }]}>{fmt(c.date)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.grid}>
        {chosen.map((c, i) => {
          const uri = checkinPhotoUri(c.photos[angle]);
          return (
            <View key={c.id} style={styles.shot}>
              {uri ? (
                <Image
                  source={{ uri }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  accessibilityLabel={`${angle} photo, ${fmt(c.date)}`}
                />
              ) : (
                <Text style={styles.none}>no {angle} photo</Text>
              )}
              <View style={styles.dt}>
                <Text style={styles.dtText}>
                  {i === 0 ? 'Before · ' : ''}
                  {fmt(c.date)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <T variant="sub" style={{ fontSize: 12.5 }}>
        Light, angle and camera change how skin looks more than a few days of routine do. Trust the trend over many
        check-ins, not one pair.
      </T>

      <View style={styles.table}>
        <View style={styles.tr}>
          <Text style={[styles.th, { flex: 1.2 }]}>Score</Text>
          {chosen.map((c) => (
            <Text key={c.id} style={styles.th}>
              {fmt(c.date)}
            </Text>
          ))}
          <Text style={[styles.th, { flex: 1.2 }]}>Change</Text>
        </View>
        {METRICS.map(([m, label]) => {
          const a = first.scores[m];
          const b = last.scores[m];
          const d = a && b ? b - a : null;
          return (
            <View key={m} style={styles.tr}>
              <Text style={[styles.td, { flex: 1.2, color: colors.text }]}>{label}</Text>
              {chosen.map((c) => (
                <Text key={c.id} style={styles.td}>
                  {c.scores[m] ? `${c.scores[m]} · ${WORD[c.scores[m]]}` : '–'}
                </Text>
              ))}
              <Text
                style={[
                  styles.td,
                  { flex: 1.2 },
                  d != null && d > 0 && { color: colors.sage },
                  d != null && d < 0 && { color: colors.empty },
                ]}>
                {d == null ? '–' : d > 0 ? `+${d} better` : d < 0 ? `${d} worse` : 'same'}
              </Text>
            </View>
          );
        })}
      </View>
      {chosen.some((c) => c.note) ? (
        <View style={styles.grid}>
          {chosen.map((c) => (
            <T key={c.id} variant="sub" style={{ flex: 1, fontSize: 12.5 }}>
              {c.note}
            </T>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seg: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segBtn: { flex: 1, minHeight: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segText: { ...font.medium, fontSize: 13, color: colors.muted },
  chip: {
    minHeight: 34,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line2,
  },
  chipText: { ...font.semibold, fontSize: 12.5, color: colors.text },
  grid: { flexDirection: 'row', gap: 8 },
  shot: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  none: { ...font.regular, fontSize: 11.5, color: colors.dim },
  dt: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: onPhoto.scrim,
  },
  dtText: { ...font.semibold, fontSize: 10.5, color: colors.text },
  table: { borderTopWidth: 1, borderTopColor: colors.line },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 6 },
  th: { flex: 1, ...font.semibold, fontSize: 11.5, color: colors.dim },
  td: { flex: 1, ...font.regular, fontSize: 12.5, color: colors.muted },
});
