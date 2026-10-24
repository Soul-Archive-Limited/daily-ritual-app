import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { batteryColor, type Product, type Shape, type ShelfState } from '@/logic/shelf';
import { photoUri } from '@/shelf/photos';
import { colors, font, SLOTS, usePalette, type ColorName } from '@/theme/tokens';

/** Colour of the routine a product is used in (grey-sand for bag-only). */
export const productColorKey = (p: Product): ColorName => SLOTS.find((z) => z.id === p.steps[0]?.slot)?.key ?? 'extra';
export const productColor = (p: Product) => colors[productColorKey(p)];

const BODY: Record<Shape, string> = {
  tube: 'M15 16 H45 L41 88 Q30 93 19 88 Z',
  pump: 'M14 38 Q14 32 20 32 H40 Q46 32 46 38 V88 Q46 94 40 94 H20 Q14 94 14 88 Z',
  bottle: 'M12 34 Q12 26 20 26 H40 Q48 26 48 34 V88 Q48 94 42 94 H18 Q12 94 12 88 Z',
  jar: 'M8 48 Q8 44 12 44 H48 Q52 44 52 48 V86 Q52 94 44 94 H16 Q8 94 8 86 Z',
  stick: 'M18 30 Q18 22 30 22 Q42 22 42 30 V88 Q42 94 36 94 H24 Q18 94 18 88 Z',
  spray: 'M16 40 Q16 34 22 34 H38 Q44 34 44 40 V88 Q44 94 38 94 H22 Q16 94 16 88 Z',
  bar: 'M6 70 Q6 60 18 60 H42 Q54 60 54 70 V84 Q54 94 42 94 H18 Q6 94 6 84 Z',
  tub: 'M10 58 Q10 54 14 54 H46 Q50 54 50 58 V88 Q50 94 44 94 H16 Q10 94 10 88 Z',
};
const TOP: Record<Shape, number> = { tube: 16, pump: 32, bottle: 26, jar: 44, stick: 22, spray: 34, bar: 60, tub: 54 };

function Cap({ shape }: { shape: Shape }) {
  switch (shape) {
    case 'tube':
      return <Rect x={14} y={10} width={32} height={6} rx={1.5} />;
    case 'pump':
      return (
        <>
          <Rect x={25} y={22} width={10} height={10} rx={2} />
          <Rect x={20} y={14} width={22} height={7} rx={3} />
          <Path d="M42 17 H50" strokeWidth={3} strokeLinecap="round" />
        </>
      );
    case 'bottle':
      return <Rect x={22} y={12} width={16} height={14} rx={3} />;
    case 'jar':
      return <Rect x={6} y={34} width={48} height={11} rx={4} />;
    case 'stick':
      return <Path d="M18 40 H42" />;
    case 'spray':
      return (
        <>
          <Rect x={25} y={22} width={10} height={12} rx={2} />
          <Rect x={22} y={14} width={18} height={8} rx={3} />
        </>
      );
    case 'tub':
      return <Rect x={9} y={46} width={42} height={9} rx={4} />;
    default:
      return null;
  }
}

/** A drawn vessel in the product's shape, filled to how much is left, tinted by routine. */
export function Vessel({
  shape,
  frac,
  colorKey,
  id,
  width = 60,
}: {
  shape: Shape;
  frac: number | null;
  colorKey: ColorName;
  id: string;
  width?: number;
}) {
  const pal = usePalette();
  const unset = frac == null;
  const top = TOP[shape];
  const lvl = unset ? 0 : Math.max(0.04, frac);
  const y = top + (94 - top) * (1 - lvl);
  const cid = `c${id.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <Svg viewBox="0 0 60 100" width={width} height={(width * 100) / 60}>
      <Defs>
        <ClipPath id={cid}>
          <Path d={BODY[shape]} />
        </ClipPath>
        <LinearGradient id={`g${cid}`} x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor={pal[colorKey]} stopOpacity={0.95} />
          <Stop offset="1" stopColor={pal[colorKey]} stopOpacity={0.55} />
        </LinearGradient>
      </Defs>
      <G fill={colors.grid} stroke={colors.dim} strokeWidth={1.6}>
        <Cap shape={shape} />
      </G>
      <Path d={BODY[shape]} fill={colors.grid} />
      <G clipPath={`url(#${cid})`}>
        <Rect x={0} y={y} width={60} height={100} fill={`url(#g${cid})`} />
        <Rect x={0} y={y} width={60} height={2} fill="#fff" opacity={0.25} />
        {unset ? (
          <SvgText x={30} y={(top + 94) / 2 + 5} textAnchor="middle" fontSize={16} fill={colors.dim}>
            ?
          </SvgText>
        ) : null}
      </G>
      <Path d={BODY[shape]} fill="none" stroke={colors.dim} strokeWidth={1.6} />
      <Path
        d={`M${shape === 'bar' ? 14 : 20} ${top + 8} V${shape === 'bar' ? 84 : 80}`}
        stroke="#fff"
        strokeOpacity={0.18}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Your own photo of the bottle if you took one (cut out), else the drawn vessel. */
export function ProductPic({ p, st, width = 60 }: { p: Product; st: ShelfState; width?: number }) {
  const uri = photoUri(st.r.photo);
  const h = (width * 100) / 60;
  if (uri)
    return (
      <View style={{ width, height: h, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Image
          source={{ uri }}
          style={[
            { width, height: st.r.photoCut ? h : width },
            !st.r.photoCut && { borderRadius: Math.round(width / 5) },
          ]}
          contentFit={st.r.photoCut ? 'contain' : 'cover'}
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  return <Vessel shape={st.shape} frac={st.frac} colorKey={productColorKey(p)} id={p.id} width={width} />;
}

/** 5-segment battery: green, gold at ≤35%, red at ≤15%. */
export function Battery({ frac, big, showPct = true }: { frac: number; big?: boolean; showPct?: boolean }) {
  const col = batteryColor(frac, colors);
  const on = Math.ceil(frac * 5);
  const pct = Math.round(frac * 100);
  return (
    <View style={styles.batt} accessibilityRole="image" accessibilityLabel={`About ${pct}% left`}>
      <View style={styles.bb}>
        {Array.from({ length: 5 }, (_, i) => (
          <View key={i} style={[styles.seg, big && styles.segBig, i < on && { backgroundColor: col }]} />
        ))}
      </View>
      <View style={[styles.tip, big && { height: 8 }]} />
      {showPct ? <Text style={styles.pct}>{pct}%</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  batt: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  bb: {
    flexDirection: 'row',
    gap: 2,
    padding: 2,
    borderRadius: 5,
    borderWidth: 1.4,
    borderColor: colors.line2,
  },
  seg: { width: 5, height: 11, borderRadius: 2, backgroundColor: colors.grid },
  segBig: { width: 8, height: 16 },
  tip: {
    width: 2.5,
    height: 6,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: colors.line2,
  },
  pct: {
    ...font.semibold,
    fontSize: 12.5,
    color: colors.text,
    minWidth: 36,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
