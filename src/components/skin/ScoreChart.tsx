import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { mono, nearest } from '@/components/charts/mono';
import { T } from '@/components/ui';
import { parseKey } from '@/logic/dates';
import { METRICS, WORD, type Checkin, type Metric } from '@/skin/model';
import { colors, font, radius, usePalette } from '@/theme/tokens';

const H = 200;
const PL = 22;
const PR = 14;
const PT = 26;
const PB = 24;
const fmt = (k: string) => parseKey(k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** One score over time (1 rough → 5 great). Touch to read a check-in. */
export function ScoreChart({ checkins }: { checkins: Checkin[] }) {
  const pal = usePalette();
  const [metric, setMetric] = useState<Metric>('overall');
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const list = [...checkins].reverse(); // oldest first

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const n = list.length;
  const X = (i: number) => PL + ((w - PL - PR) * i) / Math.max(1, n - 1);
  const Y = (v: number) => PT + (H - PT - PB) * (1 - (v - 1) / 4);
  const pts: [number, number][] = list.map((c, i) => [X(i), Y(c.scores[metric] ?? 3)]);
  const d = mono(pts);
  const touch = (e: GestureResponderEvent) =>
    setSel(
      nearest(
        pts.map((p) => p[0]),
        e.nativeEvent.locationX,
      ),
    );
  const shown = sel != null ? list[sel] : null;

  return (
    <View>
      <View style={styles.chips}>
        {METRICS.map(([m, label]) => {
          const on = m === metric;
          return (
            <Pressable
              key={m}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => {
                setMetric(m);
                setSel(null);
              }}
              style={[styles.chip, on && { backgroundColor: colors.skin, borderColor: colors.skin }]}>
              <Text style={[styles.chipText, on && { color: colors.bg }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {n < 2 ? (
        <T variant="sub" style={styles.empty}>
          The trend appears after your second check-in.
        </T>
      ) : (
        <View
          onLayout={onLayout}
          style={{ height: H, marginTop: 12 }}
          onStartShouldSetResponder={() => true}
          onResponderGrant={touch}
          onResponderMove={touch}
          onResponderRelease={() => setTimeout(() => setSel(null), 1800)}
          accessibilityLabel={`${METRICS.find((m) => m[0] === metric)?.[1]} score over time, latest ${list[n - 1].scores[metric]}`}>
          {w ? (
            <Svg width={w} height={H}>
              <Defs>
                <LinearGradient id="ka" x1="0" x2="0" y1="0" y2="1">
                  <Stop offset="0" stopColor={pal.skin} stopOpacity={0.35} />
                  <Stop offset="1" stopColor={pal.skin} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              {[1, 2, 3, 4, 5].map((v) => (
                <Line key={v} x1={PL} x2={w - PR} y1={Y(v)} y2={Y(v)} stroke={colors.grid} />
              ))}
              {[1, 2, 3, 4, 5].map((v) => (
                <SvgText key={`t${v}`} x={PL - 10} y={Y(v) + 4} textAnchor="end" fontSize={10} fill={colors.dim}>
                  {v}
                </SvgText>
              ))}
              <Path d={`${d} L${pts[n - 1][0]},${Y(1)} L${pts[0][0]},${Y(1)} Z`} fill="url(#ka)" />
              <Path d={d} fill="none" stroke={colors.skinLight} strokeWidth={2.6} strokeLinecap="round" />
              {pts.map((p, i) => (
                <Circle
                  key={i}
                  cx={p[0]}
                  cy={p[1]}
                  r={i === n - 1 || i === sel ? 6 : 3.4}
                  fill={i === n - 1 || i === sel ? colors.skinLight : colors.bg}
                  stroke={colors.skinLight}
                  strokeWidth={2}
                />
              ))}
              {sel != null ? (
                <Line
                  x1={pts[sel][0]}
                  x2={pts[sel][0]}
                  y1={PT}
                  y2={H - PB}
                  stroke={colors.line2}
                  strokeDasharray="3 4"
                />
              ) : null}
              {list.map((c, i) =>
                i === 0 || i === n - 1 || i % Math.max(1, Math.ceil(n / 5)) === 0 ? (
                  <SvgText
                    key={`d${c.id}`}
                    x={X(i)}
                    y={H - 6}
                    textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
                    fontSize={10}
                    fill={colors.dim}>
                    {fmt(c.date)}
                  </SvgText>
                ) : null,
              )}
            </Svg>
          ) : null}
          {shown ? (
            <View
              style={[styles.tip, { left: Math.min(Math.max(0, pts[sel!][0] - 90), w - 190) }]}
              pointerEvents="none">
              <Text style={styles.tipTitle}>{fmt(shown.date)}</Text>
              <Text style={styles.tipText}>
                {METRICS.map(([m, l]) => `${l} ${shown.scores[m] ?? '–'}`).join(' · ')}
              </Text>
            </View>
          ) : (
            <Text style={[styles.latest, { top: Math.max(0, pts[n - 1][1] - 26) }]} pointerEvents="none">
              {list[n - 1].scores[metric]} · {WORD[list[n - 1].scores[metric]]}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  chip: {
    minHeight: 34,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line2,
  },
  chipText: { ...font.semibold, fontSize: 12.5, color: colors.text },
  empty: { paddingVertical: 36, textAlign: 'center' },
  tip: {
    position: 'absolute',
    top: 0,
    width: 190,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.solid,
    borderWidth: 1,
    borderColor: colors.line2,
  },
  tipTitle: { ...font.semibold, fontSize: 12.5, color: colors.text },
  tipText: { ...font.regular, fontSize: 11.5, color: colors.muted, marginTop: 2 },
  latest: { position: 'absolute', right: PR, ...font.semibold, fontSize: 12.5, color: colors.text },
});
