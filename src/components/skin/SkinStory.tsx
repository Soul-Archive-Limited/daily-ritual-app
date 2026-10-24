import { Slider, Host } from '@expo/ui/swift-ui';
import { tint } from '@expo/ui/swift-ui/modifiers';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { IconTile } from '@/components/bits';
import { Button, Card, T } from '@/components/ui';
import { parseKey } from '@/logic/dates';
import { WORD, type Checkin } from '@/skin/model';
import { checkinPhotoUri } from '@/skin/photos';
import { colors, font, onPhoto } from '@/theme/tokens';

const fmt = (k: string, year = false) =>
  parseKey(k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) });

/** Timelapse of the lined-up front photos, with play and a scrubber. */
export function SkinStory({ checkins }: { checkins: Checkin[] }) {
  const frames = checkins.filter((c) => c.photos.front).reverse(); // oldest first
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  // The native slider also reports changes the app makes; only a finger on it should stop playback.
  const dragging = useRef(false);
  const reduce = useReducedMotion();
  const idx = Math.min(i, Math.max(0, frames.length - 1));

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setI((v) => {
        const next = v + 1;
        if (next >= frames.length - 1) setPlaying(false);
        return Math.min(next, frames.length - 1);
      });
    }, 900);
    return () => clearInterval(id);
  }, [playing, frames.length]);

  const head = (
    <View style={styles.head}>
      <IconTile name="play" color={colors.skin} />
      <View style={{ flex: 1 }}>
        <T variant="h2">Skin story</T>
        <T variant="sub">
          {frames.length >= 2
            ? `${frames.length} front photos, ${fmt(frames[0].date)} to ${fmt(frames[frames.length - 1].date)}`
            : 'A timelapse of your lined-up front photos. It starts after your first two check-ins with photos.'}
        </T>
      </View>
    </View>
  );
  if (frames.length < 2) return <Card>{head}</Card>;

  const c = frames[idx];
  return (
    <Card style={{ gap: 12 }}>
      {head}
      <View style={styles.view}>
        {frames.map((f, j) => (
          <Image
            key={f.id}
            source={{ uri: checkinPhotoUri(f.photos.front) ?? undefined }}
            style={[StyleSheet.absoluteFill, { opacity: j === idx ? 1 : 0 }]}
            contentFit="cover"
            transition={reduce ? 0 : 300}
            accessibilityLabel={j === idx ? `Front photo ${fmt(f.date)}` : undefined}
          />
        ))}
        <View style={styles.cap}>
          <Text style={styles.capTitle}>{fmt(c.date, true)}</Text>
          <Text style={styles.capText}>
            Overall {c.scores.overall} · {WORD[c.scores.overall]}
          </Text>
        </View>
      </View>
      <View style={styles.controls}>
        <Button
          label={playing ? 'Pause' : idx >= frames.length - 1 ? 'Replay' : 'Play'}
          icon={playing ? 'pause.fill' : 'play.fill'}
          small
          onPress={() => {
            if (!playing && idx >= frames.length - 1) setI(0);
            setPlaying((p) => !p);
          }}
        />
        <Host style={{ flex: 1, height: 40 }}>
          <Slider
            value={idx}
            min={0}
            max={frames.length - 1}
            step={1}
            onEditingChanged={(on) => {
              dragging.current = on;
              if (on) setPlaying(false);
            }}
            onValueChange={(v) => {
              if (dragging.current) setI(Math.round(v));
            }}
            modifiers={[tint(colors.skin)]}
          />
        </Host>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  view: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    aspectRatio: 3 / 4,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.fill,
  },
  cap: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: onPhoto.scrim,
  },
  capTitle: { ...font.semibold, fontSize: 13, color: colors.text },
  capText: { ...font.regular, fontSize: 12.5, color: colors.muted },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
