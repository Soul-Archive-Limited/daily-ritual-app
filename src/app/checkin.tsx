import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/bits';
import { GuidedCamera } from '@/components/skin/GuidedCamera';
import { Button, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { parseKey, todayKey } from '@/logic/dates';
import {
  ANCHORS,
  ANGLES,
  DEFAULT_SCORES,
  METRIC_HINT,
  METRICS,
  WORD,
  type Angle,
  type Checkin,
  type Irritation,
  type Metric,
} from '@/skin/model';
import { checkinPhotoUri, keepCheckinPhoto } from '@/skin/photos';
import { colors, font, minTouch, radius, onPhoto } from '@/theme/tokens';

/** Current time; kept outside the component so it's clearly only called from handlers. */
const now = () => Date.now();

const IRRITATION: [Irritation, string][] = [
  ['none', 'None'],
  ['mild', 'Mild'],
  ['strong', 'Strong'],
];

/** Skin check-in: front/left/right photos with the live guide (optional), 5 scores, irritation, notes. */
export default function CheckinScreen() {
  const s = useStore();
  const k = todayKey();
  const existing = s?.checkins.find((c) => c.date === k);
  const prev = s?.checkins.find((c) => c.date < k);

  const [scores, setScores] = useState<Record<Metric, number>>({ ...DEFAULT_SCORES, ...existing?.scores });
  const [irritation, setIrritation] = useState<Irritation>(existing?.irritation ?? 'none');
  const [note, setNote] = useState(existing?.note ?? '');
  /** New photos this session (temporary files) */
  const [fresh, setFresh] = useState<Partial<Record<Angle, string>>>({});
  const [camera, setCamera] = useState<Angle | null>(null);
  const [saving, setSaving] = useState(false);
  if (!s) return null;

  const photoFor = (a: Angle) => fresh[a] ?? checkinPhotoUri(existing?.photos[a]);
  const ghostFor = (a: Angle) => checkinPhotoUri(prev?.photos[a]);

  const save = async () => {
    setSaving(true);
    try {
      const photos: Checkin['photos'] = { ...existing?.photos };
      for (const [a, uri] of Object.entries(fresh) as [Angle, string][]) photos[a] = keepCheckinPhoto(uri, k, a);
      const doc: Checkin = {
        id: `ck-${k}`,
        date: k,
        photos,
        scores,
        irritation,
        note: note.trim(),
        at: now(),
        ...(existing?.analysis && !Object.keys(fresh).length ? { analysis: existing.analysis } : {}),
      };
      await s.saveCheckin(doc);
      router.back();
      if (irritation === 'strong') {
        s.setFocus({ slot: 'pm', at: now() });
        s.showToast('Saved. Rest the actives tonight. If it doesn’t settle in a few days, see a dermatologist.');
      } else if (irritation === 'mild') s.showToast('Saved. Consider skipping actives tonight.');
      else s.showToast('Check-in saved');
    } catch {
      setSaving(false);
      s.showToast('Couldn’t save the check-in. Try again.');
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.top} collapsable={false}>
        <View>
          <T variant="label">
            {parseKey(k).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </T>
          <T variant="title" accessibilityRole="header">
            Skin check-in
          </T>
        </View>
        <Button label="Cancel" kind="line" small onPress={() => router.back()} />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        <T variant="sub">
          Same spot, same light, no filter. Daylight from a window works best. The camera shows a face guide
          {prev ? ' and last time’s photo' : ''}, so every check-in matches. Photos are optional and stay on this phone.
        </T>

        <View style={styles.tiles}>
          {ANGLES.map(([a, label]) => {
            const uri = photoFor(a);
            return (
              <Pressable
                key={a}
                onPress={() => setCamera(a)}
                accessibilityRole="button"
                accessibilityLabel={`${label} photo${uri ? ', taken. Retake' : ''}`}
                style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}>
                {uri ? (
                  <>
                    <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    <View style={styles.tileTag}>
                      <Text style={styles.tileTagText}>{label}</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.tileEmpty}>
                    <Icon name="camera" size={20} color={colors.skin} />
                    <Text style={styles.tileText}>{label}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {METRICS.map(([m, label]) => (
          <View key={m} style={{ gap: 8 }}>
            <View style={styles.rh}>
              <View style={{ flex: 1 }}>
                <Text style={styles.metric}>{label}</Text>
                <T variant="sub" style={{ fontSize: 12.5 }}>
                  {METRIC_HINT[m]}
                </T>
              </View>
              <Text style={styles.score}>
                {scores[m]}
                <Text style={styles.word}> {WORD[scores[m]]}</Text>
              </Text>
            </View>
            <View style={styles.ruler} accessibilityRole="adjustable" accessibilityLabel={`${label} score`}>
              {[1, 2, 3, 4, 5].map((v) => {
                const on = scores[m] === v;
                return (
                  <Pressable
                    key={v}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setScores((sc) => ({ ...sc, [m]: v }));
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${v}, ${WORD[v]}`}
                    style={[styles.stop, v <= scores[m] && { backgroundColor: colors.skinSoft }, on && styles.stopOn]}>
                    <Text style={[styles.stopText, on && { color: colors.bg }]}>{v}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.ends}>
              <T variant="mono">1 · {ANCHORS[m][0]}</T>
              <T variant="mono">5 · {ANCHORS[m][1]}</T>
            </View>
          </View>
        ))}

        <View style={{ gap: 8 }}>
          <T variant="label">Any irritation since last time?</T>
          <View style={styles.seg}>
            {IRRITATION.map(([v, label]) => {
              const on = irritation === v;
              return (
                <Pressable
                  key={v}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setIrritation(v)}
                  style={[styles.segBtn, on && { backgroundColor: colors.text }]}>
                  <Text style={[styles.segText, on && { color: colors.bg }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          {irritation === 'strong' ? (
            <T variant="sub" style={{ color: colors.gold }}>
              Rest the actives (acids, exfoliants) until it calms. If it doesn’t settle in a few days, see a
              dermatologist.
            </T>
          ) : null}
        </View>

        <View style={{ gap: 8 }}>
          <T variant="label">Notes</T>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="New breakout on chin, tried a new sunscreen, dry after the flight…"
            placeholderTextColor={colors.dim}
            multiline
            style={styles.input}
            accessibilityLabel="Notes"
          />
        </View>

        <Button label={saving ? 'Saving…' : 'Save check-in'} onPress={save} disabled={saving} />
      </ScrollView>

      <GuidedCamera
        visible={camera != null}
        angle={camera ?? 'front'}
        ghostUri={camera ? ghostFor(camera) : null}
        onClose={() => setCamera(null)}
        onDone={(uri) => {
          if (camera) setFresh((f) => ({ ...f, [camera]: uri }));
          setCamera(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg2 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  body: { padding: 20, paddingTop: 8, paddingBottom: 60, gap: 22 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: radius.small,
    overflow: 'hidden',
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.line2,
    borderStyle: 'dashed',
  },
  tileEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  tileText: { ...font.semibold, fontSize: 13, color: colors.muted },
  tileTag: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: onPhoto.scrim,
  },
  tileTagText: { ...font.semibold, fontSize: 11, color: colors.text },
  rh: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  metric: { ...font.semibold, fontSize: 15.5, color: colors.text },
  score: { ...font.light, fontSize: 30, lineHeight: 32, color: colors.text },
  word: { ...font.medium, fontSize: 13, color: colors.muted },
  ruler: { flexDirection: 'row', gap: 6 },
  stop: {
    flex: 1,
    height: minTouch,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
  },
  stopOn: { backgroundColor: colors.skin },
  stopText: { ...font.semibold, fontSize: 15, color: colors.muted },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
  seg: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segBtn: { flex: 1, minHeight: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segText: { ...font.medium, fontSize: 14, color: colors.muted },
  input: {
    minHeight: 84,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.small,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.line2,
    color: colors.text,
    ...font.regular,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.small,
    backgroundColor: colors.fill,
  },
});
