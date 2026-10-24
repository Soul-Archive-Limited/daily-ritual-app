import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Icon, IconTile } from '@/components/bits';
import { Columns } from '@/components/Columns';
import { Compare } from '@/components/skin/Compare';
import { ScoreChart } from '@/components/skin/ScoreChart';
import { SkinStory } from '@/components/skin/SkinStory';
import { Screen } from '@/components/Screen';
import { Button, Card, Pill, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { parseKey, todayKey } from '@/logic/dates';
import { ANGLES, checkinDue } from '@/skin/model';
import { checkinPhotoUri } from '@/skin/photos';
import { colors, font } from '@/theme/tokens';

const enter = (i: number) => FadeInDown.duration(360).delay(40 * Math.min(i, 8));
const fmt = (k: string, o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  parseKey(k).toLocaleDateString('en-GB', o);

export default function Skin() {
  const s = useStore();
  if (!s) return <View style={styles.screen} />;
  const cks = s.checkins;
  const due = checkinDue(cks, s.config.checkinEvery);
  const lastPhoto = checkinPhotoUri(due.last?.photos.front);

  const del = (id: string, date: string) =>
    Alert.alert(
      `Delete the ${fmt(date, { weekday: 'short', day: 'numeric', month: 'short' })} check-in?`,
      'Its photos and scores are removed for good.',
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => s.deleteCheckin(id) },
      ],
    );

  return (
    <Screen wide>
      <Columns max={2}>
        <Animated.View entering={enter(1)} style={{ flex: 1 }}>
          <Card style={{ overflow: 'hidden', flex: 1 }}>
            {lastPhoto ? (
              <Image
                source={{ uri: lastPhoto }}
                style={[StyleSheet.absoluteFill, { opacity: 0.18 }]}
                contentFit="cover"
              />
            ) : null}
            <View style={styles.head}>
              <IconTile name="camera" color={colors.skin} />
              <View style={{ flex: 1 }}>
                <T variant="h2">Skin check-in</T>
                <T variant="sub">Every {due.every} days</T>
              </View>
              {due.due ? <Pill tone="on">Due</Pill> : null}
            </View>
            <Text style={styles.big}>
              {due.due ? 'Today' : due.inDays}
              {!due.due ? <Text style={styles.unit}> {due.inDays === 1 ? 'day' : 'days'}</Text> : null}
            </Text>
            <T variant="sub" style={{ marginBottom: 14 }}>
              {due.last ? `Last one ${fmt(due.last.date)}. ` : ''}5 quick scores, photos optional. About a minute.
            </T>
            <Button
              label={cks[0]?.date === todayKey() ? 'Edit today’s check-in' : 'Start check-in'}
              icon="camera"
              kind={due.due ? 'primary' : 'line'}
              onPress={() => router.push('/checkin')}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={enter(2)} style={{ flex: 1 }}>
          <Card style={{ flex: 1 }}>
            <T variant="h2">
              Skin scores <Text style={{ color: colors.muted, ...font.medium }}>· 1 rough to 5 great</Text>
            </T>
            <ScoreChart checkins={cks} />
          </Card>
        </Animated.View>
      </Columns>

      {cks.length >= 2 ? (
        <Animated.View entering={enter(3)}>
          <Compare checkins={cks} />
        </Animated.View>
      ) : null}

      <Animated.View entering={enter(4)}>
        <SkinStory checkins={cks} />
      </Animated.View>

      <Animated.View entering={enter(5)} style={{ gap: 12 }}>
        <T variant="h2" style={{ marginTop: 10, marginHorizontal: 4 }}>
          All check-ins <Text style={{ color: colors.muted }}>· {cks.length}</Text>
        </T>
        {!cks.length ? (
          <Card>
            <T variant="sub" style={{ textAlign: 'center' }}>
              No check-ins yet. Take a front, left and right photo in the same light each time. Compare unlocks after
              your second one.
            </T>
          </Card>
        ) : (
          cks.map((c, i) => {
            const prev = cks[i + 1];
            const d = prev ? c.scores.overall - prev.scores.overall : null;
            return (
              <Card key={c.id} style={{ padding: 16, gap: 12 }}>
                <View style={styles.head}>
                  <View style={{ flex: 1 }}>
                    <T style={{ ...font.semibold }}>
                      {fmt(c.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </T>
                    <T variant="sub">
                      Overall {c.scores.overall}
                      {d != null ? (
                        <Text style={{ color: d > 0 ? colors.sage : d < 0 ? colors.empty : colors.muted }}>
                          {' · '}
                          {d > 0 ? `+${d}` : d < 0 ? d : '±0'} vs previous
                        </Text>
                      ) : null}
                      {c.irritation !== 'none' ? ` · ${c.irritation} irritation` : ''}
                    </T>
                  </View>
                  <Pressable
                    onPress={() => del(c.id, c.date)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Delete check-in"
                    style={styles.x}>
                    <Icon name="xmark" size={12} color={colors.muted} />
                  </Pressable>
                </View>
                <View style={styles.thumbs}>
                  {ANGLES.map(([a]) => {
                    const uri = checkinPhotoUri(c.photos[a]);
                    return (
                      <View key={a} style={styles.thumb}>
                        {uri ? (
                          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                        ) : (
                          <Text style={styles.none}>no {a} photo</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
                {c.note ? <T variant="sub">{c.note}</T> : null}
              </Card>
            );
          })
        )}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  big: { ...font.light, fontSize: 46, lineHeight: 52, color: colors.text, marginTop: 10, letterSpacing: -1 },
  unit: { ...font.medium, fontSize: 16, color: colors.muted, letterSpacing: 0 },
  x: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
  },
  thumbs: { flexDirection: 'row', gap: 8 },
  thumb: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  none: { ...font.regular, fontSize: 11, color: colors.dim },
});
