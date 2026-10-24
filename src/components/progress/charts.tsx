import {
  StyleSheet,
  Text,
  View,
  type ColorValue,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { useState, type ReactNode } from 'react';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { mono, nearest } from '@/components/charts/mono';
import { parseKey } from '@/logic/dates';
import { pct } from '@/logic/progress';
import { colors, font, usePalette } from '@/theme/tokens';

export const fmtDay = (k: string, o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  parseKey(k).toLocaleDateString('en-GB', o);

/** Width from layout + touch-to-read the nearest x. The reading clears shortly after the finger lifts. */
export function useReader() {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const bind = (xs: number[]) => {
    const touch = (e: GestureResponderEvent) => {
      if (xs.length) setSel(nearest(xs, e.nativeEvent.locationX));
    };
    return {
      onStartShouldSetResponder: () => true,
      onResponderGrant: touch,
      onResponderMove: touch,
      onResponderRelease: () => setTimeout(() => setSel(null), 1800),
      onResponderTerminate: () => setSel(null),
    };
  };
  return { w, sel, onLayout, bind };
}

/** Floating reading above a chart point. */
export function Tip({ x, y, w, children }: { x: number; y: number; w: number; children: ReactNode }) {
  const TW = 170;
  const left = x + 14 + TW > w ? x - TW - 14 : x + 14;
  return (
    <View pointerEvents="none" style={[styles.tip, { left: Math.max(0, left), top: Math.max(0, y - 46), width: TW }]}>
      {children}
    </View>
  );
}

export const tipStyles = StyleSheet.create({
  title: { ...font.semibold, fontSize: 12.5, color: colors.text },
  text: { ...font.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
});

const H = 220;
const PL = 36;
const PR = 10;
const PT = 16;
const PB = 26;

/** 7-day average line over daily dots. Touch to read a day. */
export function TrendChart({
  keys,
  vals,
  avg7,
  today,
}: {
  keys: string[];
  vals: (number | null)[];
  avg7: (number | null)[];
  today: string;
}) {
  const { w, sel, onLayout, bind } = useReader();
  const pal = usePalette();
  const n = keys.length;
  const X = (i: number) => (n < 2 ? PL + (w - PL - PR) / 2 : PL + ((w - PL - PR) * i) / (n - 1));
  const Y = (v: number) => PT + (H - PT - PB) * (1 - v);
  const pts = avg7.map((v, i) => (v == null ? null : ([X(i), Y(v)] as [number, number]))).filter(Boolean) as [
    number,
    number,
  ][];
  const d = pts.length > 1 ? mono(pts) : '';
  const last = pts[pts.length - 1];
  const step = Math.max(1, Math.ceil(n / 5));
  // Evenly spaced dates plus the last one, skipping any that would crowd it.
  const showLabel = (i: number) => i === n - 1 || (i % step === 0 && n - 1 - i >= step * 0.6);
  const xs = keys.map((_, i) => X(i));
  const latest = avg7[n - 1];

  return (
    <View
      onLayout={onLayout}
      style={{ height: H, marginTop: 10 }}
      {...bind(xs)}
      accessibilityLabel={`Seven-day average of steps done${latest != null ? `, now ${pct(latest)}%` : ''}`}>
      {w ? (
        <Svg width={w} height={H}>
          <Defs>
            <LinearGradient id="ta" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor={pal.sage} stopOpacity={0.34} />
              <Stop offset="1" stopColor={pal.sage} stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id="tl" x1="0" x2="1" y1="0" y2="0">
              <Stop offset="0" stopColor={pal.sage} stopOpacity={0.6} />
              <Stop offset="1" stopColor={pal.sageLight} />
            </LinearGradient>
          </Defs>
          {[0, 0.5, 1].map((v) => (
            <Line key={v} x1={PL} x2={w - PR} y1={Y(v)} y2={Y(v)} stroke={colors.grid} />
          ))}
          {[0, 0.5, 1].map((v) => (
            <SvgText key={`t${v}`} x={PL - 8} y={Y(v) + 4} textAnchor="end" fontSize={10} fill={colors.dim}>
              {`${v * 100}%`}
            </SvgText>
          ))}
          {vals.map((v, i) =>
            v == null ? null : (
              <Circle key={keys[i]} cx={X(i)} cy={Y(v)} r={2.6} fill={v >= 1 ? colors.sageLight : colors.line2} />
            ),
          )}
          {d ? (
            <>
              <Path d={`${d} L${last[0]},${Y(0)} L${pts[0][0]},${Y(0)} Z`} fill="url(#ta)" />
              <Path d={d} fill="none" stroke="url(#tl)" strokeWidth={2.6} strokeLinecap="round" />
              <Circle cx={last[0]} cy={last[1]} r={11} fill={colors.sage} opacity={0.22} />
              <Circle cx={last[0]} cy={last[1]} r={5.5} fill={colors.sageLight} />
            </>
          ) : null}
          {sel != null ? (
            <>
              <Line x1={xs[sel]} x2={xs[sel]} y1={PT} y2={H - PB} stroke={colors.line2} strokeDasharray="3 4" />
              <Circle cx={xs[sel]} cy={Y(avg7[sel] ?? 0)} r={5} fill={colors.text} />
            </>
          ) : null}
          {keys.map((k, i) =>
            showLabel(i) ? (
              <SvgText
                key={`d${k}`}
                x={X(i)}
                y={H - 6}
                textAnchor={n < 2 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
                fontSize={10}
                fill={colors.dim}>
                {k === today ? 'Today' : fmtDay(k)}
              </SvgText>
            ) : null,
          )}
        </Svg>
      ) : null}
      {sel != null ? (
        <Tip x={xs[sel]} y={Y(avg7[sel] ?? 0)} w={w}>
          <Text style={tipStyles.title}>{fmtDay(keys[sel], { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
          <Text style={tipStyles.text}>That day: {vals[sel] == null ? '–' : `${pct(vals[sel]!)}%`}</Text>
          <Text style={tipStyles.text}>7-day average: {avg7[sel] == null ? '–' : `${pct(avg7[sel]!)}%`}</Text>
        </Tip>
      ) : null}
    </View>
  );
}

/** Small 7-day-average sparkline for one routine. */
export function Spark({
  vals,
  color,
  light,
  stop,
  id,
}: {
  vals: (number | null)[];
  color: ColorValue;
  light: ColorValue;
  /** The same colour as a plain string (SVG gradients need one) */
  stop: string;
  /** Unique per chart on screen (gradient id) */
  id: string;
}) {
  const [w, setW] = useState(0);
  const h = 64;
  const n = vals.length;
  const X = (i: number) => (n < 2 ? w / 2 : 4 + ((w - 8) * i) / (n - 1));
  const Y = (v: number) => 6 + (h - 12) * (1 - v);
  const pts = vals.map((v, i) => (v == null ? null : ([X(i), Y(v)] as [number, number]))).filter(Boolean) as [
    number,
    number,
  ][];
  const d = pts.length > 1 ? mono(pts) : '';
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ height: h, marginTop: 8 }}
      accessibilityElementsHidden>
      {w && d ? (
        <Svg width={w} height={h}>
          <Defs>
            <LinearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor={stop} stopOpacity={0.3} />
              <Stop offset="1" stopColor={stop} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={`${d} L${pts[pts.length - 1][0]},${h} L${pts[0][0]},${h} Z`} fill={`url(#${id})`} />
          <Path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
          <Circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={3.5} fill={light} />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tip: {
    position: 'absolute',
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.solid,
    borderWidth: 1,
    borderColor: colors.line2,
  },
});
