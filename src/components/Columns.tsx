import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLayout } from '@/components/layout';

/**
 * Lays cards side by side on a wide window (iPad), one under another on a phone.
 * `max` caps the number of columns; children are dealt left to right, row by row.
 */
export function Columns({ children, max = 3, gap = 14 }: { children: ReactNode; max?: number; gap?: number }) {
  const { columns } = useLayout();
  const items = Children.toArray(children).filter(Boolean);
  const n = Math.min(max, columns, items.length || 1);
  if (n <= 1) return <View style={{ gap }}>{items}</View>;
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += n) rows.push(items.slice(i, i + n));
  return (
    <View style={{ gap }}>
      {rows.map((row, r) => (
        <View key={r} style={[styles.row, { gap }]}>
          {row.map((c, i) => (
            <View key={i} style={styles.cell}>
              {c}
            </View>
          ))}
          {Array.from({ length: n - row.length }, (_, i) => (
            <View key={`pad${i}`} style={styles.cell} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  cell: { flex: 1, minWidth: 0 },
});
