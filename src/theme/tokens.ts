// Design tokens: pearl and ink surfaces, the aura gradient, and one colour per meaning, in light and dark.
// Every accent means one thing (morning, night, health, skin, body, done/progress, attention); each has a light-mode
// shade with enough contrast on white and a dark-mode shade for near-black.
import { DynamicColorIOS, useColorScheme, type ColorValue, type TextStyle } from 'react-native';

const dark = {
  /** Page background (with the dot grid) */
  bg: '#0E0E12',
  bg2: '#17171C',
  /** Cards */
  card: '#1A1A20',
  card2: '#24242B',
  fill: 'rgba(255,255,255,0.08)',
  /** Elevated surface (tooltips, popovers) */
  solid: '#24242B',
  line: 'rgba(255,255,255,0.07)',
  line2: 'rgba(255,255,255,0.14)',
  /** Chart grid lines and the background dots */
  grid: 'rgba(255,255,255,0.06)',

  text: '#F3F3F6',
  muted: 'rgba(243,243,246,0.62)',
  /** Readable tertiary text */
  dim: '#8E8E9A',

  /** Primary buttons and dark chips: ink on pearl, pearl on ink */
  ink: '#F3F3F6',
  onInk: '#121214',

  /** Done and overall progress (the glossy green "done" pills) */
  sage: '#5FD39A',
  sageLight: '#9BE8BF',
  /** Text on a done-green surface */
  sageInk: '#05281A',
  sageSoft: 'rgba(95,211,154,0.16)',

  /** Needs attention */
  gold: '#F2C14E',
  goldSoft: 'rgba(242,193,78,0.16)',
  /** Nearly empty */
  empty: '#FF8A7A',

  /** Aura gradient stops (rewards, glow, celebrations) */
  apricot: '#FFB27A',
  rose: '#F477AE',
  orchid: '#A88BF6',

  morning: '#FFA472',
  morningLight: '#FFC9A6',
  night: '#8F8CFA',
  nightLight: '#C2C0FC',
  health: '#5CC9E3',
  healthLight: '#A6E2F0',
  skin: '#F58DB8',
  skinLight: '#F9C2D9',
  body: '#B19AF7',
  bodyLight: '#D5C9FB',
  activity: '#5CD1B8',
  /** Bag-only products */
  extra: '#B9B4C4',
  /** Soft tints for chips, pressed states and highlights */
  morningSoft: 'rgba(255,164,114,0.15)',
  healthSoft: 'rgba(92,201,227,0.16)',
  skinSoft: 'rgba(245,141,184,0.18)',
  emptySoft: 'rgba(255,138,122,0.3)',
};

const light: typeof dark = {
  bg: '#F1F1F4',
  bg2: '#E6E6EB',
  card: '#FFFFFF',
  card2: '#F4F4F7',
  fill: 'rgba(18,18,20,0.06)',
  solid: '#FFFFFF',
  line: 'rgba(18,18,20,0.07)',
  line2: 'rgba(18,18,20,0.14)',
  grid: 'rgba(18,18,20,0.07)',

  text: '#121214',
  muted: 'rgba(18,18,20,0.58)',
  dim: '#7D7D88',

  ink: '#121214',
  onInk: '#FFFFFF',

  sage: '#2E9E66',
  sageLight: '#46B37A',
  sageInk: '#FFFFFF',
  sageSoft: 'rgba(46,158,102,0.12)',

  gold: '#B57A00',
  goldSoft: 'rgba(181,122,0,0.12)',
  empty: '#D9452F',

  apricot: '#FFB27A',
  rose: '#F06FA5',
  orchid: '#9B7BF2',

  morning: '#E2733A',
  morningLight: '#FF9F6B',
  night: '#6D6AF2',
  nightLight: '#8A8CF7',
  health: '#1F9CBF',
  healthLight: '#3FB8D6',
  skin: '#D9548E',
  skinLight: '#F06FA5',
  body: '#7E5FE0',
  bodyLight: '#9B7BF2',
  activity: '#1E9C86',
  extra: '#8D879A',
  morningSoft: 'rgba(226,115,58,0.12)',
  healthSoft: 'rgba(31,156,191,0.12)',
  skinSoft: 'rgba(217,84,142,0.12)',
  emptySoft: 'rgba(217,69,47,0.3)',
};

export type Palette = typeof dark;
export type ColorName = keyof Palette;

/** Colours that follow the phone's light/dark setting by themselves. Use in StyleSheets and SVG. */
export const colors = Object.fromEntries(
  (Object.keys(dark) as ColorName[]).map((k) => [k, DynamicColorIOS({ light: light[k], dark: dark[k] })]),
) as Record<ColorName, ColorValue>;

/** Plain colour strings for the current mode, for when a value is mixed in code (alpha, gradients). */
export function usePalette(): Palette {
  return useColorScheme() === 'light' ? light : dark;
}

/** Colours for things drawn on photos (hero, camera): the same in both modes. */
export const onPhoto = {
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.78)',
  scrim: 'rgba(0,0,0,0.45)',
  chip: 'rgba(0,0,0,0.35)',
  line: 'rgba(255,255,255,0.22)',
  /** Highlighted words on a photo */
  accent: '#FFD9E8',
} as const;

export const radius = { card: 30, small: 20, pill: 999 } as const;

/** The aura gradient: apricot to rose to orchid. Same in both modes. */
export const AURA = ['#FFB27A', '#F06FA5', '#9B7BF2'] as const;
/** The night card gradient */
export const NIGHT = ['#8A8CF7', '#5F5FF0'] as const;
/** Glossy green for done: light top, deeper bottom */
export const DEW = ['#8BE3AE', '#46B37A'] as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, gutter: 16 } as const;

/** Font files loaded at start (see `src/app/_layout.tsx`). */
export const FONT_FILES = {
  Urbanist_200ExtraLight: require('@/assets/fonts/Urbanist_200ExtraLight.ttf'),
  Urbanist_300Light: require('@/assets/fonts/Urbanist_300Light.ttf'),
  Urbanist_400Regular: require('@/assets/fonts/Urbanist_400Regular.ttf'),
  Urbanist_500Medium: require('@/assets/fonts/Urbanist_500Medium.ttf'),
  Urbanist_600SemiBold: require('@/assets/fonts/Urbanist_600SemiBold.ttf'),
  Urbanist_700Bold: require('@/assets/fonts/Urbanist_700Bold.ttf'),
  Urbanist_800ExtraBold: require('@/assets/fonts/Urbanist_800ExtraBold.ttf'),
  InstrumentSerif_400Regular: require('@/assets/fonts/InstrumentSerif_400Regular.ttf'),
  InstrumentSerif_400Regular_Italic: require('@/assets/fonts/InstrumentSerif_400Regular_Italic.ttf'),
};

/** Urbanist by weight, Instrument Serif for editorial moments. Spread into a style: `{ ...font.semibold, fontSize: 15 }`. */
export const font = {
  /** Huge thin numbers and the thin half of headlines */
  thin: { fontFamily: 'Urbanist_200ExtraLight' },
  light: { fontFamily: 'Urbanist_300Light' },
  regular: { fontFamily: 'Urbanist_400Regular' },
  medium: { fontFamily: 'Urbanist_500Medium' },
  semibold: { fontFamily: 'Urbanist_600SemiBold' },
  bold: { fontFamily: 'Urbanist_700Bold' },
  heavy: { fontFamily: 'Urbanist_800ExtraBold' },
  serif: { fontFamily: 'InstrumentSerif_400Regular' },
  serifItalic: { fontFamily: 'InstrumentSerif_400Regular_Italic' },
  /** Numbers that line up (axes, times, tables) */
  mono: { fontFamily: 'Urbanist_500Medium', fontVariant: ['tabular-nums'] },
  monoMedium: { fontFamily: 'Urbanist_600SemiBold', fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export const motion = { max: 400, ease: [0.2, 0.8, 0.2, 1] as const, spring: { damping: 18, stiffness: 180 } } as const;

export const minTouch = 44;

export type SlotId = 'am' | 'pm' | 'health';

export const SLOTS: { id: SlotId; name: string; color: ColorValue; light: ColorValue; key: ColorName }[] = [
  { id: 'am', name: 'Morning', color: colors.morning, light: colors.morningLight, key: 'morning' },
  { id: 'pm', name: 'Night', color: colors.night, light: colors.nightLight, key: 'night' },
  { id: 'health', name: 'Health', color: colors.health, light: colors.healthLight, key: 'health' },
];

export const slotColor = (id: string) => SLOTS.find((s) => s.id === id)?.color ?? colors.sage;
