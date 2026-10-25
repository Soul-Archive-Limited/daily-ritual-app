import * as Haptics from 'expo-haptics';
import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { LuneOutfit } from '@/db/types';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

/** How Lune feels. Ears, arms and face all change with it. */
export type LuneMood = 'happy' | 'cheer' | 'worried' | 'sleepy';

export type { LuneOutfit };

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
  happy: [22, -30],
  cheer: [122, -122],
  worried: [-38, 38],
  sleepy: [14, -14],
};

const VB = '0 0 200 220';

function FurDefs({ id }: { id: string }) {
  return (
    <Defs>
      <LinearGradient id={`fur${id}`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#ECEBFF" />
        <Stop offset="1" stopColor="#C9C3F6" />
      </LinearGradient>
      <LinearGradient id={`ear${id}`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#FFC1A0" />
        <Stop offset="1" stopColor="#F58AB4" />
      </LinearGradient>
      <LinearGradient id={`aura${id}`} x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor="#FFB27A" />
        <Stop offset="0.55" stopColor="#F06FA5" />
        <Stop offset="1" stopColor="#9B7BF2" />
      </LinearGradient>
      <LinearGradient id={`gold${id}`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#FFE9A8" />
        <Stop offset="1" stopColor="#E5B23F" />
      </LinearGradient>
      <LinearGradient id={`cap${id}`} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#A9ABFF" />
        <Stop offset="1" stopColor="#6F6FF0" />
      </LinearGradient>
    </Defs>
  );
}

/** A full-size SVG layer that moves around its own pivot (in the 200 × 220 drawing). */
function Layer({
  size,
  pivot,
  style,
  children,
  id,
}: {
  size: number;
  pivot: [number, number];
  style?: ComponentProps<typeof Animated.View>['style'];
  children: ReactNode;
  id: string;
}) {
  const s = size / 200;
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { transformOrigin: `${pivot[0] * s}px ${pivot[1] * s}px` }, style]}>
      <Svg viewBox={VB} width={size} height={size * 1.1}>
        <FurDefs id={id} />
        {children}
      </Svg>
    </Animated.View>
  );
}

type Face = 'open' | 'joy' | 'closed';

function Eye({ x, y, r, kind }: { x: number; y: number; r: number; kind: Face }) {
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

function Arm() {
  const l = 28;
  return (
    <G>
      <Rect x={-8} y={-4} width={16} height={l + 4} rx={8} fill={ARM} />
      <Rect x={1} y={0} width={7} height={l} rx={3.5} fill={SHADE} opacity={0.35} />
      <Circle cx={0} cy={l} r={9.5} fill={ARM} />
      <Circle cx={-6} cy={l + 6} r={3.6} fill={ARM} />
      <Circle cx={0} cy={l + 8} r={3.6} fill={ARM} />
      <Circle cx={6} cy={l + 6} r={3.6} fill={ARM} />
    </G>
  );
}

/** Head wear, drawn in head coordinates so it tilts with the head. */
function HeadWear({ outfit, mood, id }: { outfit: LuneOutfit; mood: LuneMood; id: string }) {
  if (mood === 'sleepy' && outfit !== 'crown')
    return (
      <G>
        <Path d="M58 68Q74 28 124 34Q150 44 156 30Q164 56 142 68Z" fill={`url(#cap${id})`} />
        <Rect x={54} y={62} width={92} height={12} rx={6} fill="#F4F2FF" />
        <Circle cx={158} cy={30} r={8} fill="#F4F2FF" />
      </G>
    );
  switch (outfit) {
    case 'bow':
      return (
        <G>
          <Path d="M74 66L58 56Q54 70 60 78Z" fill="#F06FA5" />
          <Path d="M74 66L90 56Q94 70 88 78Z" fill="#F06FA5" />
          <Circle cx={74} cy={67} r={5} fill="#FF9CC6" />
        </G>
      );
    case 'headband':
      return (
        <G>
          <Path d="M46 82Q100 60 154 82L154 92Q100 70 46 92Z" fill={`url(#aura${id})`} />
          <Path d="M100 72L84 62Q78 74 86 82Z" fill={`url(#aura${id})`} />
          <Path d="M100 72L116 62Q122 74 114 82Z" fill={`url(#aura${id})`} />
          <Circle cx={100} cy={72} r={5} fill="#F06FA5" />
        </G>
      );
    case 'sunnies':
      return (
        <G>
          <Rect x={60} y={90} width={34} height={22} rx={10} fill={INK} opacity={0.92} />
          <Rect x={106} y={90} width={34} height={22} rx={10} fill={INK} opacity={0.92} />
          <Path d="M94 98H106" stroke={INK} strokeWidth={4} />
          <Path d="M66 96L76 92M112 96L122 92" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.6} />
        </G>
      );
    case 'flowers':
      return (
        <G>
          {[
            [66, 64, '#FFB27A'],
            [84, 56, '#F06FA5'],
            [100, 54, '#FFFFFF'],
            [116, 56, '#9B7BF2'],
            [134, 64, '#FFB27A'],
          ].map(([x, y, c]) => (
            <G key={String(x)}>
              {[0, 72, 144, 216, 288].map((a) => (
                <Circle
                  key={a}
                  cx={(x as number) + 5 * Math.cos((a * Math.PI) / 180)}
                  cy={(y as number) + 5 * Math.sin((a * Math.PI) / 180)}
                  r={3.6}
                  fill={c as string}
                />
              ))}
              <Circle cx={x as number} cy={y as number} r={2.6} fill="#FFE08A" />
            </G>
          ))}
        </G>
      );
    case 'crown':
      return (
        <G>
          <Path d="M78 62L82 40L92 52L100 34L108 52L118 40L122 62Z" fill={`url(#gold${id})`} />
          <Circle cx={100} cy={46} r={3.4} fill="#F06FA5" />
        </G>
      );
    default:
      return null;
  }
}

function Confetti() {
  const bits: [number, number, number, string][] = [
    [28, 40, 20, '#FFB27A'],
    [170, 34, -25, '#F06FA5'],
    [16, 120, 40, '#9B7BF2'],
    [184, 110, 10, '#8FD1B6'],
    [44, 18, -15, '#FFD36E'],
    [154, 12, 30, '#FFB27A'],
  ];
  return (
    <>
      {bits.map(([x, y, a, c]) => (
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
      ))}
    </>
  );
}

const spring = { damping: 12, stiffness: 160 };

/** Rotation that follows a base angle (mood) plus a live offset (twitches, waves). */
function useRot(base: SharedValue<number>, extra: SharedValue<number>) {
  return useAnimatedStyle(() => ({ transform: [{ rotate: `${base.value + extra.value}deg` }] }));
}

/**
 * Lune, the lavender bunny who keeps you company. She breathes, blinks, twitches her ears, looks around
 * and waves on her own; tap her and she hops, giggles or flops her ears. Bump `react` to make her
 * celebrate (Today does this when a step is ticked). Decorative unless `label` is given. Respects
 * Reduce Motion.
 */
export function Lune({
  mood = 'happy',
  size = 120,
  label,
  style,
  still,
  react = 0,
  outfit = 'none',
}: {
  mood?: LuneMood;
  size?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
  /** Only blink: no idle moves (for small, repeated uses) */
  still?: boolean;
  /** Change this number to make Lune jump for joy */
  react?: number;
  outfit?: LuneOutfit;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduce = useReducedMotion();
  const [reacting, setReacting] = useState(false);
  const face: LuneMood = reacting ? 'cheer' : mood;

  // Mood poses, eased between moods.
  const earL = useSharedValue(EARS[mood][0]);
  const earR = useSharedValue(EARS[mood][1]);
  const armL = useSharedValue(ARMS[mood][0]);
  const armR = useSharedValue(ARMS[mood][1]);
  // Live motion on top of the pose.
  const twL = useSharedValue(0);
  const twR = useSharedValue(0);
  const wave = useSharedValue(0);
  const tilt = useSharedValue(0);
  const hop = useSharedValue(0);
  const squash = useSharedValue(1);
  const breathe = useSharedValue(0);
  const blink = useSharedValue(1);
  const look = useSharedValue(0);

  useEffect(() => {
    const [el, er] = EARS[face];
    const [al, ar] = ARMS[face];
    earL.value = reduce ? el : withSpring(el, spring);
    earR.value = reduce ? er : withSpring(er, spring);
    armL.value = reduce ? al : withSpring(al, spring);
    armR.value = reduce ? ar : withSpring(ar, spring);
  }, [face, reduce, earL, earR, armL, armR]);

  // Breathing.
  useEffect(() => {
    if (reduce || still) return;
    breathe.value = withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduce, still, breathe]);

  // Idle life: a blink most of the time, sometimes an ear twitch, a look around or a little wave.
  const moodRef = useRef(mood);
  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);
  useEffect(() => {
    if (reduce) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(
        () => {
          const m = moodRef.current;
          const r = Math.random();
          if (still || r < 0.45 || m === 'sleepy') {
            if (m !== 'sleepy' && m !== 'cheer')
              blink.value = withSequence(withTiming(0.08, { duration: 70 }), withTiming(1, { duration: 110 }));
          } else if (r < 0.65) {
            const side = Math.random() < 0.5 ? twL : twR;
            const dir = side === twL ? -1 : 1;
            side.value = withSequence(
              withTiming(dir * 14, { duration: 90 }),
              withTiming(dir * -4, { duration: 90 }),
              withSpring(0, spring),
            );
          } else if (r < 0.82) {
            look.value = withSequence(
              withTiming(Math.random() < 0.5 ? -3.5 : 3.5, { duration: 220 }),
              withDelay(700, withTiming(0, { duration: 240 })),
            );
            tilt.value = withSequence(
              withTiming(look.value > 0 ? 5 : -5, { duration: 260 }),
              withDelay(600, withSpring(0, spring)),
            );
          } else if (m === 'happy') {
            wave.value = withSequence(
              withTiming(-55, { duration: 220 }),
              withRepeat(
                withSequence(withTiming(-35, { duration: 160 }), withTiming(-60, { duration: 160 })),
                3,
                false,
              ),
              withSpring(0, spring),
            );
          }
          loop();
        },
        still ? 3000 + Math.random() * 2500 : 1800 + Math.random() * 2600,
      );
    };
    loop();
    return () => clearTimeout(t);
  }, [reduce, still, blink, twL, twR, look, tilt, wave]);

  const jump = () => {
    if (reduce) return;
    squash.value = withSequence(withTiming(0.88, { duration: 90 }), withSpring(1, { damping: 6, stiffness: 240 }));
    hop.value = withSequence(
      withDelay(60, withTiming(-26, { duration: 170, easing: Easing.out(Easing.quad) })),
      withSpring(0, { damping: 7, stiffness: 220 }),
    );
  };

  const cheerFor = (ms: number) => {
    setReacting(true);
    setTimeout(() => setReacting(false), ms);
  };

  // Celebrate when asked (a ticked step).
  const lastReact = useRef(react);
  useEffect(() => {
    if (react === lastReact.current) return;
    lastReact.current = react;
    jump();
    cheerFor(1100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [react]);

  // Tap reactions take turns.
  const taps = useRef(0);
  const onPress = () => {
    const n = taps.current++ % 3;
    Haptics.impactAsync(n === 0 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Soft);
    if (reduce) return;
    if (n === 0) {
      jump();
      cheerFor(900);
    } else if (n === 1) {
      tilt.set(
        withSequence(
          withTiming(9, { duration: 110 }),
          withTiming(-9, { duration: 140 }),
          withTiming(7, { duration: 140 }),
          withTiming(-5, { duration: 140 }),
          withSpring(0, spring),
        ),
      );
      cheerFor(700);
    } else {
      twL.set(withSequence(withTiming(-50, { duration: 160 }), withDelay(250, withSpring(0, { damping: 6 }))));
      twR.set(withSequence(withTiming(50, { duration: 160 }), withDelay(250, withSpring(0, { damping: 6 }))));
      blink.set(withSequence(withTiming(0.08, { duration: 80 }), withDelay(300, withTiming(1, { duration: 120 }))));
    }
  };

  const whole = useAnimatedStyle(() => ({
    transform: [
      { translateY: -3 * breathe.value + hop.value },
      { scaleX: squash.value * (1 + 0.012 * breathe.value) + (1 - squash.value) * 0.6 },
      { scaleY: squash.value * (1 - 0.012 * breathe.value) },
    ],
  }));
  const shadow = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 + hop.value / 80 }],
    opacity: 1 + hop.value / 60,
  }));
  const head = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.value}deg` }] }));
  const earLs = useRot(earL, twL);
  const earRs = useRot(earR, twR);
  const armLs = useRot(armL, twL); // the left arm shares the left ear's twitch: a small shrug
  const armRs = useAnimatedStyle(() => ({ transform: [{ rotate: `${armR.value + wave.value}deg` }] }));
  const eyes = useAnimatedStyle(() => ({ transform: [{ translateX: look.value }, { scaleY: blink.value }] }));

  const fur = `url(#fur${id})`;
  const eyeKind: Face = face === 'cheer' ? 'joy' : face === 'sleepy' ? 'closed' : 'open';
  const eyeY = face === 'happy' ? 102 : 104;
  const eyeR = face === 'happy' ? 11 : 10;
  const h = size * 1.1;

  return (
    <Pressable
      onPress={onPress}
      accessible={!!label}
      accessibilityLabel={label}
      accessibilityRole={label ? 'button' : undefined}
      accessibilityHint={label ? 'Tap to play with Lune' : undefined}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      style={style}>
      <View style={{ width: size, height: h }}>
        <Layer size={size} pivot={[100, 210]} style={shadow} id={id}>
          <Ellipse cx={100} cy={210} rx={44} ry={6} fill="#3A2350" opacity={0.13} />
        </Layer>
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: 'bottom' }, whole]}>
          {face === 'cheer' ? (
            <Layer size={size} pivot={[100, 110]} id={id}>
              <Confetti />
            </Layer>
          ) : null}
          <Layer size={size} pivot={[100, 180]} id={id}>
            <Circle cx={140} cy={178} r={13} fill="#fff" />
            <Ellipse cx={100} cy={166} rx={38} ry={36} fill={fur} />
            <Ellipse cx={100} cy={174} rx={25} ry={23} fill="#FBFAFF" />
            {[78, 122].map((x) => (
              <G key={x}>
                <Ellipse cx={x} cy={201} rx={19} ry={9} fill="#E4E1FF" />
                <Ellipse cx={x} cy={203} rx={8} ry={4} fill="#F9B7CC" />
              </G>
            ))}
            {outfit === 'scarf' ? (
              <G>
                <Path d="M66 140Q100 158 134 140L136 152Q100 170 64 152Z" fill={`url(#aura${id})`} />
                <Path d="M118 150L126 182L114 180L110 154Z" fill="#F06FA5" />
              </G>
            ) : null}
          </Layer>
          <Animated.View
            style={[StyleSheet.absoluteFill, { transformOrigin: `${size * 0.5}px ${size * 0.75}px` }, head]}>
            {[
              [80, earLs],
              [120, earRs],
            ].map(([px, st]) => (
              <Layer
                key={px as number}
                size={size}
                pivot={[px as number, 62]}
                style={st as ComponentProps<typeof Animated.View>['style']}
                id={id}>
                <G transform={`translate(${px} 62)`}>
                  <Ellipse cx={0} cy={-38} rx={15} ry={40} fill={fur} />
                  <Ellipse cx={0} cy={-36} rx={7.5} ry={29} fill={`url(#ear${id})`} />
                </G>
              </Layer>
            ))}
            <Layer size={size} pivot={[100, 104]} id={id}>
              <Ellipse cx={100} cy={104} rx={58} ry={50} fill={fur} />
              <Ellipse cx={100} cy={130} rx={44} ry={16} fill={SHADE} opacity={0.18} />
              <Ellipse cx={76} cy={72} rx={20} ry={9} fill="#fff" opacity={0.7} transform="rotate(-18 76 72)" />
              <Ellipse cx={64} cy={120} rx={11} ry={6.5} fill="#FF8FB5" opacity={face === 'cheer' ? 0.62 : 0.42} />
              <Ellipse cx={136} cy={120} rx={11} ry={6.5} fill="#FF8FB5" opacity={face === 'cheer' ? 0.62 : 0.42} />
              <Path d="M95 113Q100 110 105 113Q103 118 100 119Q97 118 95 113Z" fill="#F58AB4" />
              {face === 'happy' ? (
                <Path
                  d="M100 119Q100 126 93 126M100 119Q100 126 107 126"
                  stroke={INK}
                  strokeWidth={2.8}
                  strokeLinecap="round"
                  fill="none"
                />
              ) : null}
              {face === 'cheer' ? (
                <>
                  <Path d="M89 121Q100 142 111 121Z" fill={INK} />
                  <Path d="M94 132Q100 136 106 132" stroke="#FF6F9C" strokeWidth={4} strokeLinecap="round" />
                </>
              ) : null}
              {face === 'worried' ? (
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
              {face === 'sleepy' ? (
                <>
                  <Ellipse cx={100} cy={126} rx={4} ry={3.4} fill={INK} />
                  <SvgText x={160} y={86} fontSize={20} fontWeight="800" fill="#8A8CF7">
                    z
                  </SvgText>
                  <SvgText x={175} y={72} fontSize={14} fontWeight="800" fill="#8A8CF7" opacity={0.75}>
                    z
                  </SvgText>
                </>
              ) : null}
            </Layer>
            <Layer size={size} pivot={[100, eyeY]} style={eyes} id={id}>
              <Eye x={78} y={eyeY} r={eyeR} kind={eyeKind} />
              <Eye x={122} y={eyeY} r={eyeR} kind={eyeKind} />
            </Layer>
            <Layer size={size} pivot={[100, 104]} id={id}>
              <HeadWear outfit={outfit} mood={face} id={id} />
            </Layer>
          </Animated.View>
          <Layer size={size} pivot={[70, 152]} style={armLs} id={id}>
            <G transform="translate(70 152)">
              <Arm />
            </G>
          </Layer>
          <Layer size={size} pivot={[130, 152]} style={armRs} id={id}>
            <G transform="translate(130 152)">
              <Arm />
            </G>
          </Layer>
        </Animated.View>
      </View>
    </Pressable>
  );
}
