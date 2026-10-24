import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { Icon } from '@/components/bits';
import { mono } from '@/components/charts/mono';
import { fmtDay, Tip, tipStyles, useReader } from '@/components/progress/charts';
import { Button, Card, Pill, T } from '@/components/ui';
import { useStore } from '@/data/store';
import type { Weighin } from '@/db/repo';
import { diffDays, parseKey } from '@/logic/dates';
import { bmiCat, bmiOf, signed } from '@/logic/progress';
import { colors, font, minTouch, usePalette } from '@/theme/tokens';

const enter = (i: number) => FadeInDown.duration(360).delay(40 * i);
const r1 = (v: number) => Math.round(v * 10) / 10;

export function BodyView({ today }: { today: string }) {
  const s = useStore()!;
  const c = s.config;
  const B = s.weighins;
  const last = B[B.length - 1];
  const prev = B[B.length - 2];
  const tdy = B.find((b) => b.date === today);
  const [kg, setKg] = useState('');
  const [ht, setHt] = useState('');
  const [all, setAll] = useState(false);

  const bL = last ? bmiOf(last.kg, c.heightCm) : null;
  const bP = prev ? bmiOf(prev.kg, c.heightCm) : null;
  const ago = last ? diffDays(last.date, today) : null;
  const dKg = last && prev ? r1(last.kg - prev.kg) : null;
  const dB = bL != null && bP != null ? r1(bL - bP) : null;
  const history = [...B].reverse();
  const shown = all ? history : history.slice(0, 6);

  const log = () => {
    const v = Number(kg.replace(',', '.'));
    if (!(v >= 30 && v <= 250)) return s.showToast('Enter your weight in kg, between 30 and 250.');
    s.logWeight(v);
    setKg('');
    Keyboard.dismiss();
  };
  const saveHeight = () => {
    const v = Number(ht);
    if (!(v >= 120 && v <= 230)) return s.showToast('Height in cm, between 120 and 230.');
    s.updateConfig({ heightCm: v });
    setHt('');
    Keyboard.dismiss();
  };

  return (
    <View style={{ gap: 14 }}>
      <Animated.View entering={enter(0)}>
        <Card style={{ gap: 14 }}>
          <View style={styles.between}>
            <View style={{ flex: 1 }}>
              <T variant="h2">Body</T>
              <T variant="sub">Weigh in whenever you like. Weekly or monthly is plenty.</T>
            </View>
            {last && ago! >= 14 ? <Pill tone="warn">{ago} days since last</Pill> : null}
          </View>

          {!c.heightCm ? (
            <View style={styles.ask}>
              <View style={{ flex: 1 }}>
                <T style={{ ...font.semibold }}>Add your height to see BMI</T>
                <T variant="sub">Used only to work out BMI from your weight.</T>
              </View>
              <TextInput
                value={ht}
                onChangeText={setHt}
                keyboardType="number-pad"
                placeholder="cm"
                placeholderTextColor={colors.dim}
                style={[styles.input, { width: 72 }]}
                accessibilityLabel="Height in centimetres"
                onSubmitEditing={saveHeight}
              />
              <Button label="Save" kind="line" small onPress={saveHeight} />
            </View>
          ) : null}

          {last ? (
            <View>
              <T variant="label">
                Latest · {fmtDay(last.date)} · {ago ? `${ago} ${ago === 1 ? 'day' : 'days'} ago` : 'today'}
              </T>
              <Text style={styles.big}>
                {last.kg}
                <Text style={styles.unit}> kg</Text>
              </Text>
              <T variant="sub">
                {dKg == null
                  ? 'First weigh-in. Your next one shows the change.'
                  : `${signed(dKg)} kg since ${fmtDay(prev!.date)}`}
              </T>
              {bL != null ? (
                <View style={styles.bmi}>
                  <Text style={styles.mid}>
                    {bL.toFixed(1)}
                    <Text style={styles.unit}> BMI</Text>
                  </Text>
                  <Pill tone={bmiCat(bL)[1]}>{bmiCat(bL)[0]}</Pill>
                  {dB != null ? <T variant="sub">{signed(dB)} vs last</T> : null}
                </View>
              ) : null}
            </View>
          ) : (
            <T variant="sub">No weigh-ins yet. Log your first one below.</T>
          )}

          <View style={styles.row}>
            <TextInput
              value={kg}
              onChangeText={setKg}
              keyboardType="decimal-pad"
              placeholder={tdy ? String(tdy.kg) : 'kg'}
              placeholderTextColor={colors.dim}
              style={[styles.input, { flex: 1 }]}
              accessibilityLabel="Weight in kilograms"
              onSubmitEditing={log}
            />
            <Button
              label={tdy ? 'Update today' : 'Log weight'}
              onPress={log}
              style={{ backgroundColor: colors.body }}
            />
          </View>
        </Card>
      </Animated.View>

      {B.length ? (
        <Animated.View entering={enter(1)}>
          <Card>
            <T variant="h2">Weight</T>
            <WeightChart B={B} heightCm={c.heightCm} />
            <View style={[styles.tr, styles.th]}>
              <Text style={[styles.thText, { flex: 1.3 }]}>Date</Text>
              <Text style={[styles.thText, { flex: 1 }]}>Weight</Text>
              {c.heightCm ? <Text style={[styles.thText, { flex: 0.7 }]}>BMI</Text> : null}
              <Text style={[styles.thText, { flex: 1 }]}>Change</Text>
              <View style={{ width: minTouch }} />
            </View>
            {shown.map((b) => {
              const j = B.indexOf(b);
              const p0 = B[j - 1];
              const d = p0 ? r1(b.kg - p0.kg) : null;
              return (
                <View key={b.id} style={styles.tr}>
                  <Text style={[styles.td, { flex: 1.3, ...font.regular }]}>
                    {fmtDay(b.date, { day: 'numeric', month: 'short', year: '2-digit' })}
                  </Text>
                  <Text style={[styles.td, { flex: 1 }]}>{b.kg} kg</Text>
                  {c.heightCm ? (
                    <Text style={[styles.td, { flex: 0.7 }]}>{bmiOf(b.kg, c.heightCm)!.toFixed(1)}</Text>
                  ) : null}
                  <Text style={[styles.td, { flex: 1, color: colors.muted }]}>
                    {d == null ? '–' : `${signed(d)} kg`}
                  </Text>
                  <Pressable
                    onPress={() => s.removeWeighin(b.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove weigh-in ${fmtDay(b.date, { day: 'numeric', month: 'long' })}`}
                    style={styles.x}>
                    <View style={styles.xIn}>
                      <Icon name="xmark" size={11} color={colors.muted} />
                    </View>
                  </Pressable>
                </View>
              );
            })}
            {history.length > 6 ? (
              <Pressable onPress={() => setAll((v) => !v)} accessibilityRole="button" style={styles.more}>
                <T variant="label" style={{ color: colors.text }}>
                  {all ? 'Show latest 6' : `Show all ${history.length}`}
                </T>
              </Pressable>
            ) : null}
          </Card>
        </Animated.View>
      ) : null}

      <T variant="sub" style={{ marginHorizontal: 4, fontSize: 12.5 }}>
        BMI is a rough screen from height and weight only. It doesn’t see muscle, so for an active person it can read
        high. The trend matters more than one number.
      </T>
    </View>
  );
}

const H = 170;
const PL = 40;
const PR = 12;
const PT = 16;
const PB = 24;

function WeightChart({ B, heightCm }: { B: Weighin[]; heightCm?: number }) {
  const { w, sel, onLayout, bind } = useReader();
  const pal = usePalette();
  if (B.length < 2)
    return (
      <T variant="sub" style={{ paddingVertical: 26, textAlign: 'center' }}>
        The weight line appears after your second weigh-in.
      </T>
    );
  const t0 = parseKey(B[0].date).getTime();
  const span = Math.max(1, parseKey(B[B.length - 1].date).getTime() - t0);
  const ks = B.map((b) => b.kg);
  const pad = Math.max(0.8, (Math.max(...ks) - Math.min(...ks)) * 0.25);
  const lo = Math.min(...ks) - pad;
  const hi = Math.max(...ks) + pad;
  const X = (b: Weighin) => PL + ((w - PL - PR) * (parseKey(b.date).getTime() - t0)) / span;
  const Y = (v: number) => PT + (H - PT - PB) * (1 - (v - lo) / (hi - lo));
  const pts = B.map((b) => [X(b), Y(b.kg)] as [number, number]);
  const d = mono(pts);
  const n = pts.length;
  const sb = sel != null ? B[sel] : null;
  const bmi = sb ? bmiOf(sb.kg, heightCm) : null;

  return (
    <View
      onLayout={onLayout}
      style={{ height: H, marginTop: 12 }}
      {...bind(pts.map((p) => p[0]))}
      accessibilityLabel={`Weight over time, from ${B[0].kg} to ${B[n - 1].kg} kg`}>
      {w ? (
        <Svg width={w} height={H}>
          <Defs>
            <LinearGradient id="bw" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor={pal.body} stopOpacity={0.28} />
              <Stop offset="1" stopColor={pal.body} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {[lo + pad, (lo + hi) / 2, hi - pad].map((v) => (
            <Line key={v} x1={PL} x2={w - PR} y1={Y(v)} y2={Y(v)} stroke={colors.grid} />
          ))}
          {[lo + pad, (lo + hi) / 2, hi - pad].map((v) => (
            <SvgText key={`t${v}`} x={PL - 8} y={Y(v) + 4} textAnchor="end" fontSize={10} fill={colors.dim}>
              {v.toFixed(1)}
            </SvgText>
          ))}
          <Path d={`${d} L${pts[n - 1][0]},${H - PB} L${pts[0][0]},${H - PB} Z`} fill="url(#bw)" />
          <Path d={d} fill="none" stroke={colors.bodyLight} strokeWidth={2.4} strokeLinecap="round" />
          {pts.map((p, i) => (
            <Circle
              key={B[i].id}
              cx={p[0]}
              cy={p[1]}
              r={i === n - 1 || i === sel ? 5.5 : 3.2}
              fill={i === n - 1 || i === sel ? colors.bodyLight : colors.bg}
              stroke={colors.bodyLight}
              strokeWidth={2}
            />
          ))}
          {sel != null ? (
            <Line x1={pts[sel][0]} x2={pts[sel][0]} y1={PT} y2={H - PB} stroke={colors.line2} strokeDasharray="3 4" />
          ) : null}
          <SvgText x={PL} y={H - 6} fontSize={10} fill={colors.dim}>
            {fmtDay(B[0].date)}
          </SvgText>
          <SvgText x={w - PR} y={H - 6} textAnchor="end" fontSize={10} fill={colors.dim}>
            {fmtDay(B[n - 1].date)}
          </SvgText>
        </Svg>
      ) : null}
      {sb ? (
        <Tip x={pts[sel!][0]} y={pts[sel!][1]} w={w}>
          <Text style={tipStyles.title}>{fmtDay(sb.date, { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
          <Text style={tipStyles.text}>
            {sb.kg} kg{bmi ? ` · BMI ${bmi.toFixed(1)}` : ''}
          </Text>
        </Tip>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  input: {
    minHeight: minTouch,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.line2,
    color: colors.text,
    ...font.regular,
    fontSize: 16,
  },
  big: { ...font.light, fontSize: 52, lineHeight: 58, color: colors.text, letterSpacing: -1.5, marginTop: 6 },
  mid: { ...font.light, fontSize: 30, lineHeight: 36, color: colors.text, letterSpacing: -0.6 },
  unit: { ...font.medium, fontSize: 15, color: colors.muted, letterSpacing: 0 },
  bmi: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTouch,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  th: { borderTopWidth: 0, minHeight: 34, marginTop: 10 },
  thText: { ...font.medium, fontSize: 12, color: colors.muted },
  td: { ...font.mono, fontSize: 12.5, color: colors.text },
  x: { width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center' },
  xIn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
  },
  more: { minHeight: minTouch, justifyContent: 'center' },
});
