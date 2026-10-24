import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconTile } from '@/components/bits';
import { Card, Pill, T } from '@/components/ui';
import { lowItems, useShelf } from '@/data/useShelf';
import { colors, font } from '@/theme/tokens';

/** Only shows when something is running low. */
export function RestockCard() {
  const low = lowItems(useShelf());
  if (!low.length) return null;
  return (
    <Card>
      <View style={styles.head}>
        <IconTile name="shippingbox" color={colors.gold} />
        <View style={{ flex: 1 }}>
          <T variant="h2">Restock soon</T>
          <T variant="sub">estimated from open dates and your ticks</T>
        </View>
        <Pressable hitSlop={10} onPress={() => router.navigate('/shelf')} accessibilityRole="button">
          <Text style={styles.link}>Shelf</Text>
        </Pressable>
      </View>
      {low.slice(0, 4).map((x) => (
        <Pressable
          key={x.p.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/product/[id]', params: { id: x.p.id } })}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
          <Text style={styles.name} numberOfLines={1}>
            {x.p.name}
          </Text>
          <Pill tone="warn">{x.st.status === 'empty' ? 'probably finished' : `~${x.st.left} days left`}</Pill>
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  link: { ...font.semibold, fontSize: 13.5, color: colors.muted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  name: { ...font.semibold, fontSize: 14.5, color: colors.text, flex: 1 },
});
