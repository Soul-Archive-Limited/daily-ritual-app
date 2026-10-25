import * as Haptics from 'expo-haptics';
import { useEffect, useId, useState } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

/** How Lune feels. Ears, arms and face all change with it. */
export type LuneMood = 'happy' | 'cheer' | 'worried' | 'sleepy';

const INK = '#2B1D33';
const ARM = '#DCD8FB';
const SHADE = '#A49AE8';

/** Ear angles (left, right): up when happy, splayed when cheering, drooping when worried, one flopped when sleepy. */
const EARS: Record<LuneMood, [number, number]> = {
  happy: [-12, 14],
  cheer: [-26, 26],
  worried: [-104, 104],
  sleepy: [-62, 18],
};
/** Arm angles from straight down (left, right): a wave, both up, hands together, resting. */
const ARMS: Record<LuneMood, [number, number]> = {
  happy: [22, -125],
  cheer: [122, -122],
  worried: [-38, 38],
  sleepy: [14, -14],
};

function Arm({ x, y, angle }: { x: number; y: number; angle: number }) {
  const l = 28;
  return (
    <G transform={`translate(${x} ${y}) rotate(${angle})`}>
      <Rect x={-8} y={-4} width={16} height={l + 4} rx={8} fill={ARM} />
      <Rect x={1} y={0} width={7} height={l} rx={3.5} fill={SHADE} opacity={0.35} />
      <Circle cx={0} cy={l} r={9.5} fill={ARM} />
      <Circle cx={-6} cy={l + 6} r={3.6} fill={ARM} />
      <Circle cx={0} cy={l + 8} r={3.6} fill={ARM} />
      <Circle cx={6} cy={l + 6} r={3.6} fill={ARM} />
    </G>
  );
}

function Eye({ x, y, r, kind }: { x: number; y: number; r: number; kind: 'open' | 'joy' | 'closed' }) {
  if (kind === 'joy')
    return (
      <Path
        d={`M${x - r} ${y + r * 0.35}Q${x} ${y - r * 1.1} ${x + r} ${y + r * 0.35}`}
        stroke={INK}
        strokeWidth={r * 0.42}
        strokeLinecap="round"
        fill="none"
      />
    );
  if (kind === 'closed')
    return (
      <Path
        d={`M${x - r} ${y - r * 0.1}Q${x} ${y + r * 0.9} ${x + r} ${y - r * 0.1}`}
        stroke={INK}
        strokeWidth={r * 0.36}
        strokeLinecap="round"
        fill="none"
      />
    );
  return (
    <G>
      <Ellipse cx={x} cy={y} rx={r * 0.82} ry={r} fill={INK} />
      <Circle cx={x + r * 0.28} cy={y - r * 0.38} r={r * 0.36} fill="#fff" />
      <Circle cx={x - r * 0.3} cy={y + r * 0.4} r={r * 0.16} fill="#fff" opacity={0.8} />
    </G>
  );
}

const CONFETTI: [number, number, number, string][] = [
  [28, 40, 20, '#FFB27A'],
  [170, 34, -25, '#F06FA5'],
  [16, 120, 40, '#9B7BF2'],
  [184, 110, 10, '#8FD1B6'],
  [44, 18, -15, '#FFD36E'],
  [154, 12, 30, '#FFB27A'],
];

/** Lune's drawing for one mood, in a 200 × 220 box. */
function LuneArt({ mood, blink, id }: { mood: LuneMood; blink: boolean; id: string }) {
  const fur = `url(#fur${id})`;
  const [el, er] = EARS[mood];
  const [al, ar] = ARMS[mood];
  const eyeKind = mood === 'cheer' ? 'joy' : mood === 'sleepy' || blink ? 'closed' : 'open';
  const eyeY = mood === 'happy' ? 102 : 104;
  const eyeR = mood === 'happy' ? 11 : 10;
  return (
    <>
      <Defs>
        <LinearGradient id={`fur${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ECEBFF" />
          <Stop offset="1" stopColor="#C9C3F6" />
        </LinearGradient>
        <LinearGradient id={`ear${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFC1A0" />
          <Stop offset="1" stopColor="#F58AB4" />
        </LinearGradient>
      </Defs>
      {mood === 'cheer'
        ? CONFETTI.map(([x, y, a, c]) => (
            <Rect
              key={`${x}${y}`}
              x={x - 4}
              y={y - 2.5}
              width={8}
              height={5}
              rx={2}
              fill={c}
              transform={`rotate(${a} ${x} ${y})`}
            />
          ))
        : null}
      <Ellipse cx={100} cy={210} rx={44} ry={6} fill="#3A2350" opacity={0.13} />
      {[
        [80, el],
        [120, er],
      ].map(([px, a]) => (
        <G key={px} transform={`translate(${px} 62) rotate(${a})`}>
          <Ellipse cx={0} cy={-38} rx={15} ry={40} fill={fur} />
          <Ellipse cx={0} cy={-36} rx={7.5} ry={29} fill={`url(#ear${id})`} />
        </G>
      ))}
      <Circle cx={140} cy={178} r={13} fill="#fff" />
      <Ellipse cx={100} cy={166} rx={38} ry={36} fill={fur} />
      <Ellipse cx={100} cy={174} rx={25} ry={23} fill="#FBFAFF" />
      {[78, 122].map((x) => (
        <G key={x}>
          <Ellipse cx={x} cy={201} rx={19} ry={9} fill="#E4E1FF" />
          <Ellipse cx={x} cy={203} rx={8} ry={4} fill="#F9B7CC" />
        </G>
      ))}
      <Ellipse cx={100} cy={104} rx={58} ry={50} fill={fur} />
      <Ellipse cx={100} cy={130} rx={44} ry={16} fill={SHADE} opacity={0.18} />
      <Ellipse cx={76} cy={72} rx={20} ry={9} fill="#fff" opacity={0.7} transform="rotate(-18 76 72)" />
      <Ellipse cx={64} cy={120} rx={11} ry={6.5} fill="#FF8FB5" opacity={0.42} />
      <Ellipse cx={136} cy={120} rx={11} ry={6.5} fill="#FF8FB5" opacity={0.42} />
      <Path d="M95 113Q100 110 105 113Q103 118 100 119Q97 118 95 113Z" fill="#F58AB4" />
      <Eye x={78} y={eyeY} r={eyeR} kind={eyeKind} />
      <Eye x={122} y={eyeY} r={eyeR} kind={eyeKind} />
      {mood === 'happy' ? (
        <Path
          d="M100 119Q100 126 93 126M100 119Q100 126 107 126"
          stroke={INK}
          strokeWidth={2.8}
          strokeLinecap="round"
          fill="none"
        />
      ) : null}
      {mood === 'cheer' ? (
        <>
          <Path d="M89 121Q100 142 111 121Z" fill={INK} />
          <Path d="M94 132Q100 136 106 132" stroke="#FF6F9C" strokeWidth={4} strokeLinecap="round" />
        </>
      ) : null}
      {mood === 'worried' ? (
        <>
          <Path d="M70 89L83.6 82M130 89L116.4 82" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
          <Path
            d="M90 128Q95 122 100 127Q105 132 110 126"
            stroke={INK}
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
          />
          <Path d="M150 76q7 11 0 15q-7-4 0-15z" fill="#BFE3FF" />
        </>
      ) : null}
      {mood === 'sleepy' ? (
        <>
          <Ellipse cx={100} cy={126} rx={4} ry={3.4} fill={INK} />
          <SvgText x={152} y={64} fontSize={20} fontWeight="800" fill="#8A8CF7">
            z
          </SvgText>
          <SvgText x={167} y={50} fontSize={14} fontWeight="800" fill="#8A8CF7" opacity={0.75}>
            z
          </SvgText>
        </>
      ) : null}
      <Arm x={70} y={152} angle={al} />
      <Arm x={130} y={152} angle={ar} />
    </>
  );
}

/**
 * Lune, the lavender bunny who keeps you company. Bobs gently, blinks, and hops when tapped.
 * Decorative unless `label` is given. Respects Reduce Motion.
 */
export function Lune({
  mood = 'happy',
  size = 120,
  label,
  style,
  still,
}: {
  mood?: LuneMood;
  size?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
  /** No idle bobbing (for small, repeated uses) */
  still?: boolean;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduce = useReducedMotion();
  const [blink, setBlink] = useState(false);
  const bob = useSharedValue(0);
  const hop = useSharedValue(0);
  const pop = useSharedValue(1);

  // Idle bob: a slow breath, never on every frame of attention.
  useEffect(() => {
    if (reduce || still) return;
    bob.value = withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduce, still, bob]);

  // A small pop when the mood changes.
  useEffect(() => {
    if (reduce) return;
    pop.value = withSequence(withTiming(0.92, { duration: 90 }), withSpring(1, { damping: 9, stiffness: 220 }));
  }, [mood, reduce, pop]);

  // Blink every few seconds while the eyes are open.
  useEffect(() => {
    if (reduce || mood === 'cheer' || mood === 'sleepy') return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(
        () => {
          setBlink(true);
          t = setTimeout(() => {
            setBlink(false);
            loop();
          }, 130);
        },
        2600 + Math.random() * 2600,
      );
    };
    loop();
    return () => clearTimeout(t);
  }, [mood, reduce]);

  const anim = useAnimatedStyle(() => ({
    transform: [
      { translateY: -4 * bob.value + hop.value },
      { scaleX: pop.value * (1 + 0.012 * bob.value) },
      { scaleY: pop.value * (1 - 0.012 * bob.value) },
    ],
  }));

  const onPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    if (reduce) return;
    hop.value = withSequence(
      withTiming(-16, { duration: 140, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 7, stiffness: 260 }),
    );
  };

  return (
    <Pressable
      onPress={onPress}
      accessible={!!label}
      accessibilityLabel={label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      style={style}>
      <Animated.View style={[{ width: size, height: size * 1.1, transformOrigin: 'bottom' }, anim]}>
        <Svg viewBox="0 0 200 220" width={size} height={size * 1.1}>
          <LuneArt mood={mood} blink={blink} id={id} />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}
