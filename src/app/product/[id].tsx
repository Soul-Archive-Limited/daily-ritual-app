import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, labelsHidden, tint } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActionSheetIOS, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { SheetDone } from '@/components/SheetDone';
import { Battery, ProductPic } from '@/components/shelf/bits';
import { Button, Pill, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { useShelf } from '@/data/useShelf';
import { addDays, keyOf, parseKey, todayKey } from '@/logic/dates';
import { SHAPES, STATUS_LABEL } from '@/logic/shelf';
import { deletePhoto, saveProductPhoto } from '@/shelf/photos';
import { colors, font, minTouch, radius, SLOTS } from '@/theme/tokens';

const LEVELS: [number, string][] = [
  [0.1, 'Almost out'],
  [0.25, '¼'],
  [0.5, '½'],
  [0.75, '¾'],
  [1, 'Full'],
];

const OPENED: [number, string][] = [
  [0, 'Today'],
  [7, 'A week ago'],
  [14, '2 weeks ago'],
  [30, 'A month ago'],
  [60, '2 months ago'],
];

const fmt = (k: string) => parseKey(k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** One product: how full it is, open date, your own photo (cut out), and the numbers behind the battery. */
export default function ProductSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const items = useShelf();
  const [busy, setBusy] = useState(false);
  const x = items.find((i) => i.p.id === id);
  if (!s || !x) return <View style={styles.screen} />;
  const { p, st } = x;
  const t = todayKey();
  const save = (patch: Parameters<typeof s.saveShelf>[1]) => {
    Haptics.selectionAsync();
    s.saveShelf(p.id, patch);
  };
  const statusTone = st.status === 'low' || st.status === 'empty' ? 'warn' : st.status === 'fresh' ? 'on' : 'plain';

  const takePhoto = async (from: 'camera' | 'library') => {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9 };
    if (from === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return s.showToast('Camera is off for Daily Ritual. Allow it in iPhone Settings.');
    }
    const res =
      from === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    setBusy(true);
    s.showToast('Cutting out the product…');
    try {
      const out = await saveProductPhoto(p.id, res.assets[0].uri);
      const old = st.r.photo;
      s.saveShelf(p.id, { photo: out.name, photoCut: out.cut });
      if (old) deletePhoto(old);
      s.showToast(
        out.cut ? 'Photo saved, background removed' : 'Photo saved. Couldn’t find a clear outline, so it’s kept as is.',
      );
    } catch {
      s.showToast('Couldn’t save the photo. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const pickPhoto = () =>
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ['Take a photo', 'Choose from Photos', 'Cancel'], cancelButtonIndex: 2 },
      (i) => (i === 0 ? takePhoto('camera') : i === 1 ? takePhoto('library') : undefined),
    );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <SheetDone />
      <View style={styles.head}>
        <View style={styles.pic}>
          <ProductPic p={p} st={st} width={66} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="title" accessibilityRole="header">
            {p.name}
          </T>
          <View style={styles.stepsRow}>
            {p.steps.length ? (
              p.steps.map((z) => (
                <View key={z.id} style={styles.stepTag}>
                  <View style={[styles.dot, { backgroundColor: SLOTS.find((q) => q.id === z.slot)?.color }]} />
                  <T variant="sub">{z.name}</T>
                </View>
              ))
            ) : (
              <T variant="sub">Not in your routine</T>
            )}
          </View>
          <View style={{ alignSelf: 'flex-start', marginTop: 6 }}>
            <Pill tone={statusTone}>{STATUS_LABEL[st.status]}</Pill>
          </View>
        </View>
        <Button label="Done" kind="plain" small onPress={() => router.back()} />
      </View>

      {st.opened && st.frac != null ? (
        <View style={styles.levelBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.big}>
              {Math.round(st.frac * 100)}
              <Text style={styles.unit}>% left</Text>
            </Text>
            <T variant="sub">
              {st.mode === 'uses'
                ? `~${st.usesLeft} of ${st.cap} uses left · about ${st.left} days at your pace`
                : `about ${st.left} days left`}
            </T>
          </View>
          <Battery frac={st.frac} big showPct={false} />
        </View>
      ) : (
        <T variant="sub">Add roughly when you opened it and the bag tracks how much is left.</T>
      )}

      {st.opened ? (
        <T variant="mono">
          Opened {fmt(st.opened)} · used {st.uses}× since ·{' '}
          {st.mode === 'uses' ? 'drops each time you tick it' : 'by date (no step uses it)'}
        </T>
      ) : null}

      {st.opened ? (
        <Field
          label={`How full is it really? ${st.manual ? '· set by you, then counts your ticks' : '· estimated from your ticks'}`}>
          <View style={styles.seg}>
            {LEVELS.map(([v, label]) => {
              const on = !!st.manual && Math.abs((st.r.level?.v ?? -1) - v) < 0.01;
              return (
                <Pressable
                  key={v}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => save({ level: { v, at: t } })}
                  style={[styles.segBtn, on && { backgroundColor: colors.text }]}>
                  <Text style={[styles.segText, on && { color: colors.bg }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Field>
      ) : (
        <Field label="When did you open it?">
          <View style={styles.chips}>
            {OPENED.map(([d, label]) => (
              <Chip key={d} label={label} onPress={() => save({ openedAt: addDays(t, -d), level: null })} />
            ))}
          </View>
        </Field>
      )}

      <View style={styles.photoRow}>
        <Button
          label={busy ? 'Working…' : st.r.photo ? 'Retake photo' : 'Add a photo of it'}
          icon="camera"
          kind="line"
          small
          disabled={busy}
          onPress={pickPhoto}
        />
        {st.r.photo ? (
          <Pressable
            hitSlop={10}
            accessibilityRole="button"
            onPress={() => {
              deletePhoto(st.r.photo);
              save({ photo: null, photoCut: false });
            }}>
            <Text style={styles.link}>Remove photo</Text>
          </Pressable>
        ) : null}
      </View>
      <T variant="sub" style={{ fontSize: 12.5 }}>
        Photograph your own bottle against a plain wall or table. The background is cut away on the phone; the photo
        never leaves it.
      </T>

      <View style={styles.settings}>
        {st.opened ? (
          <Setting label="Opened">
            <Host matchContents>
              <DatePicker
                title="Opened"
                displayedComponents={['date']}
                selection={st.opened ? parseKey(st.opened) : new Date()}
                range={{ end: new Date() }}
                onDateChange={(d) => save({ openedAt: keyOf(d) })}
                modifiers={[datePickerStyle('compact'), labelsHidden(), tint(colors.sage)]}
              />
            </Host>
          </Setting>
        ) : null}
        {st.mode === 'uses' ? (
          <Setting label="Uses per bottle">
            <NumberInput value={st.cap ?? 0} min={1} max={2000} onChange={(v) => save({ capacity: v })} />
          </Setting>
        ) : null}
        <Setting label="Lasts about (weeks)">
          <NumberInput value={st.wk} min={1} max={104} onChange={(v) => save({ lastsWeeks: v })} />
        </Setting>
        <View style={{ gap: 8, paddingVertical: 10 }}>
          <T variant="label">Shape (for the drawing)</T>
          <View style={styles.chips}>
            {SHAPES.map((sh) => (
              <Chip key={sh} label={sh} on={st.shape === sh} onPress={() => save({ shape: sh })} />
            ))}
          </View>
        </View>
        <Setting label="Packed">
          <Switch
            value={!!st.r.packed}
            onValueChange={(v) => save({ packed: v })}
            trackColor={{ true: colors.sage, false: colors.card2 }}
            accessibilityLabel="Packed"
          />
        </Setting>
      </View>

      <View style={styles.chips}>
        {st.opened ? (
          <Button
            label="Opened a new one"
            small
            onPress={() => {
              save({ openedAt: t, level: null, warnedFor: null, history: [...(st.r.history ?? []), t].slice(-12) });
              s.showToast('New one opened today');
            }}
          />
        ) : null}
        {p.standalone ? (
          <Button
            label="Remove from bag"
            kind="line"
            small
            onPress={() => {
              router.back();
              deletePhoto(st.r.photo);
              s.removeBagProduct(p.id);
            }}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <T variant="label">{label}</T>
      {children}
    </View>
  );
}

function Setting({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.setting}>
      <T style={{ flex: 1 }}>{label}</T>
      {children}
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.chip, on && { backgroundColor: colors.sage, borderColor: colors.sage }]}>
      <Text style={[styles.chipText, on && { color: colors.sageInk }]}>{label}</Text>
    </Pressable>
  );
}

function NumberInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <TextInput
      defaultValue={String(value)}
      keyboardType="number-pad"
      returnKeyType="done"
      onEndEditing={(e) => {
        const v = Math.round(Number(e.nativeEvent.text));
        if (v >= min && v <= max && v !== value) onChange(v);
      }}
      style={styles.num}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 20, paddingTop: 8, paddingBottom: 60, gap: 16 },
  head: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  pic: { width: 76, alignItems: 'center' },
  stepsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepTag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  levelBox: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  big: { ...font.light, fontSize: 40, lineHeight: 46, color: colors.text, letterSpacing: -1 },
  unit: { ...font.medium, fontSize: 16, color: colors.muted, letterSpacing: 0 },
  seg: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segBtn: { flex: 1, minHeight: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segText: { ...font.medium, fontSize: 13, color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 13,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: colors.fill,
  },
  chipText: { ...font.semibold, fontSize: 13, color: colors.text },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  link: { ...font.medium, fontSize: 13.5, color: colors.muted, textDecorationLine: 'underline' },
  settings: { borderTopWidth: 1, borderTopColor: colors.line },
  setting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  num: {
    minWidth: 72,
    minHeight: minTouch - 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.line2,
    color: colors.text,
    ...font.regular,
    fontSize: 16,
    textAlign: 'right',
  },
});
