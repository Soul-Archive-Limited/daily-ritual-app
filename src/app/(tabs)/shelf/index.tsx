import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Icon } from '@/components/bits';
import { Battery, ProductPic, productColor } from '@/components/shelf/bits';
import { Screen } from '@/components/Screen';
import { Card, Pill, Seg, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { lowItems, useShelf, type ShelfItem } from '@/data/useShelf';
import { STATUS_LABEL, type Status } from '@/logic/shelf';
import { colors, font, SLOTS } from '@/theme/tokens';

const enter = (i: number) => FadeInDown.duration(360).delay(40 * i);
const ORDER: Record<Status, number> = { empty: 0, low: 1, unset: 2, half: 3, fresh: 4 };

const shortName = (n: string) => {
  const w = n.replace(/[’']/g, '').split(/\s+/);
  return w.length <= 2 ? n : `${w.slice(0, 2).join(' ')}…`;
};

const daysText = (x: ShelfItem) =>
  x.st.mode === 'uses' ? `~${x.st.usesLeft} uses left · about ${x.st.left} days` : `about ${x.st.left} days left`;

export default function Shelf() {
  const s = useStore();
  const items = useShelf();
  const [view, setView] = useState<'list' | 'bag'>('list');
  const [pack, setPack] = useState(false);
  if (!s) return <View style={styles.screen} />;

  const low = lowItems(items);
  const unset = items.filter((x) => x.st.status === 'unset');
  const packedN = items.filter((x) => s.shelf[x.p.id]?.packed).length;
  const slotOrder = { am: 0, pm: 1, health: 2 } as Record<string, number>;
  const bag = [...items].sort((a, b) => (slotOrder[a.p.steps[0]?.slot] ?? 3) - (slotOrder[b.p.steps[0]?.slot] ?? 3));
  const list = [...items].sort(
    (a, b) => ORDER[a.st.status] - ORDER[b.st.status] || (a.st.left ?? 999) - (b.st.left ?? 999),
  );

  const open = (id: string) => router.push({ pathname: '/product/[id]', params: { id } });
  const togglePacked = (id: string) => {
    Haptics.selectionAsync();
    s.saveShelf(id, { packed: !s.shelf[id]?.packed });
  };

  return (
    <Screen wide>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={pack ? 'checkmark.circle.fill' : 'suitcase'}
          accessibilityLabel={pack ? 'Done packing' : 'Pack for a trip'}
          onPress={() => {
            setPack((v) => !v);
            if (!pack) setView('bag');
          }}
        />
        <Stack.Toolbar.Button
          icon="plus"
          accessibilityLabel="Add a product"
          onPress={() => router.push('/product/new')}
        />
      </Stack.Toolbar>

      <Animated.View entering={enter(0)} style={{ gap: 12 }}>
        <T variant="sub">
          {items.length} products, what’s running low first. Tap one for dates, how full it really is, and a photo of
          your own bottle.
        </T>
        <Seg
          options={[
            ['list', 'Restock list'],
            ['bag', 'Bag'],
          ]}
          value={view}
          onChange={setView}
          label="Shelf view"
        />
      </Animated.View>

      <T variant="mono" style={{ marginHorizontal: 4 }}>
        Each bar drops a notch every time you tick that step. Tap a product to correct it or add a photo.
      </T>

      {pack ? (
        <T variant="sub" style={{ marginHorizontal: 4 }}>
          Tap what’s packed. Cabin bag only? Liquids, gels and sprays over 100 ml go in checked luggage, and all small
          ones in one clear 1 L bag.
        </T>
      ) : null}

      {view === 'list' && !pack ? (
        <Animated.View entering={enter(2)}>
          <Card style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
            {list.map((x) => {
              const sl = SLOTS.find((z) => z.id === x.p.steps[0]?.slot);
              return (
                <Pressable
                  key={x.p.id}
                  onPress={() => open(x.p.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${x.p.name}. ${STATUS_LABEL[x.st.status]}${x.st.frac != null ? `, about ${Math.round(x.st.frac * 100)}% left` : ''}`}
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.fill }]}>
                  <ProductPic p={x.p} st={x.st} width={30} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name}>{x.p.name}</Text>
                    <View style={styles.meta}>
                      <View style={[styles.dot, { backgroundColor: productColor(x.p) }]} />
                      <Text style={styles.small} numberOfLines={1}>
                        {sl ? `${sl.name} · ` : ''}
                        {x.p.steps.map((z) => z.name).join(' · ') || 'Bag only'}
                      </Text>
                    </View>
                    {x.st.opened ? <Text style={[styles.small, { marginTop: 3 }]}>{daysText(x)}</Text> : null}
                  </View>
                  {x.st.frac == null ? <Pill>Add open date</Pill> : <Battery frac={x.st.frac} />}
                </Pressable>
              );
            })}
            {!items.length ? (
              <T variant="sub" style={{ padding: 16, textAlign: 'center' }}>
                Your bag is empty. Add products to your steps on the Routine tab, or tap “Add a product”.
              </T>
            ) : null}
          </Card>
        </Animated.View>
      ) : (
        <Animated.View entering={enter(2)} style={{ gap: 12 }}>
          {!pack && (low.length || unset.length) ? (
            <View style={styles.pills}>
              {low.map((x) => (
                <Pressable key={x.p.id} onPress={() => open(x.p.id)} accessibilityRole="button">
                  <Pill tone="warn">
                    {x.p.name} · {x.st.status === 'empty' ? 'finished?' : `~${x.st.left}d left`}
                  </Pill>
                </Pressable>
              ))}
              {unset.length ? <Pill>{unset.length} without an open date: tap them to add one</Pill> : null}
            </View>
          ) : null}
          <View style={styles.bag}>
            <View style={styles.flap} accessibilityElementsHidden>
              <View style={styles.zip} />
              <View style={styles.pull} />
            </View>
            <View style={styles.grid}>
              {bag.map((x) => {
                const packed = !!s.shelf[x.p.id]?.packed;
                return (
                  <Pressable
                    key={x.p.id}
                    onPress={() => (pack ? togglePacked(x.p.id) : open(x.p.id))}
                    accessibilityRole={pack ? 'checkbox' : 'button'}
                    accessibilityState={pack ? { checked: packed } : undefined}
                    accessibilityLabel={`${x.p.name}: ${STATUS_LABEL[x.st.status]}${x.st.frac != null ? `, about ${Math.round(x.st.frac * 100)}% left` : ''}`}
                    style={({ pressed }) => [
                      styles.item,
                      pressed && { backgroundColor: colors.fill },
                      pack && !packed && { opacity: 0.45 },
                    ]}>
                    <ProductPic p={x.p} st={x.st} width={50} />
                    {x.st.frac != null ? (
                      <Battery frac={x.st.frac} big showPct={false} />
                    ) : (
                      <View style={{ height: 22 }} />
                    )}
                    {pack && packed ? (
                      <View style={styles.tick}>
                        <Icon name="checkmark" size={11} color={colors.sageInk} />
                      </View>
                    ) : null}
                    {!pack && (x.st.status === 'low' || x.st.status === 'empty') ? (
                      <View style={styles.warnDot} />
                    ) : null}
                    <Text style={styles.itemName} numberOfLines={2}>
                      {shortName(x.p.name)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.key}>
              <Text style={styles.keyText}>Colour = routine it’s used in:</Text>
              {[...SLOTS.map((z) => [z.name, z.color] as const), ['Extra', colors.extra] as const].map(([n, c]) => (
                <View key={n} style={styles.keyItem}>
                  <View style={[styles.dot, { backgroundColor: c }]} />
                  <Text style={styles.keyText}>{n}</Text>
                </View>
              ))}
            </View>
            {pack ? (
              <View style={styles.packFoot}>
                <Text style={styles.keyText}>
                  {packedN}/{items.length} packed
                </Text>
                <Pressable
                  hitSlop={10}
                  accessibilityRole="button"
                  onPress={() =>
                    items.forEach((x) => s.shelf[x.p.id]?.packed && s.saveShelf(x.p.id, { packed: false }))
                  }>
                  <Text style={[styles.keyText, { textDecorationLine: 'underline' }]}>Clear</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </Animated.View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, minHeight: 60 },
  name: { ...font.semibold, fontSize: 14.5, color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  small: { ...font.regular, fontSize: 12.5, color: colors.muted, flexShrink: 1 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bag: {
    paddingTop: 52,
    paddingHorizontal: 12,
    paddingBottom: 14,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.line2,
  },
  flap: {
    position: 'absolute',
    left: -1,
    right: -1,
    top: -1,
    height: 40,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.line2,
  },
  zip: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 10,
    height: 0,
    borderTopWidth: 3,
    borderStyle: 'dotted',
    borderColor: colors.line2,
  },
  pull: {
    position: 'absolute',
    right: 46,
    bottom: 0,
    width: 10,
    height: 20,
    borderRadius: 5,
    backgroundColor: colors.extra,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  item: { width: '33.33%', alignItems: 'center', gap: 6, paddingTop: 10, paddingBottom: 8, borderRadius: 18 },
  itemName: { ...font.medium, fontSize: 12, color: colors.muted, textAlign: 'center', paddingHorizontal: 4 },
  tick: {
    position: 'absolute',
    top: 6,
    right: 14,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warnDot: {
    position: 'absolute',
    top: 8,
    right: 18,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  key: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, paddingHorizontal: 4 },
  keyItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  keyText: { ...font.regular, fontSize: 12, color: colors.dim },
  packFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 4 },
});
