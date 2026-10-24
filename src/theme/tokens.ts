// Apple-style design tokens: iOS system colours for surfaces and text, light and dark.
// Every accent colour means one thing (morning, night, health, skin, body, progress, attention); each has a light-mode
// shade with enough contrast on white and a dark-mode shade for black.
import { DynamicColorIOS, useColorScheme, type ColorValue, type TextStyle } from 'react-native';

const dark = {
  /** systemGroupedBackground */
  bg: '#000000',
  bg2: '#1C1C1E',
  /** secondarySystemGroupedBackground */
  card: '#1C1C1E',
  /** tertiarySystemGroupedBackground */
  card2: '#2C2C2E',
  /** tertiarySystemFill */
  fill: 'rgba(118,118,128,0.24)',
  /** Elevated surface (tooltips, popovers) */
  solid: '#2C2C2E',
  line: 'rgba(84,84,88,0.45)',
  /** separator */
  line2: 'rgba(84,84,88,0.65)',
  /** Chart grid lines */
  grid: 'rgba(235,235,245,0.10)',

  /** label */
  text: '#FFFFFF',
  /** secondaryLabel */
  muted: 'rgba(235,235,245,0.6)',
  /** systemGray: readable tertiary text */
  dim: '#8E8E93',

  /** Overall progress and primary buttons */
  sage: '#63D2A5',
  sageLight: '#A8E8CD',
  /** Text on a sage button */
  sageInk: '#04261A',
  sageSoft: 'rgba(99,210,165,0.18)',

  /** Needs attention */
  gold: '#F2C14E',
  goldSoft: 'rgba(242,193,78,0.16)',
  /** Nearly empty */
  empty: '#FF8A7A',

  morning: '#F0BE7E',
  morningLight: '#F7DAB2',
  night: '#A9A6F5',
  nightLight: '#D3D1FA',
  health: '#7CC4F2',
  healthLight: '#BEE1F8',
  skin: '#F2A49B',
  skinLight: '#F8CFC9',
  body: '#A3B6DC',
  bodyLight: '#D0DBF0',
  activity: '#8AD5DD',
  /** Bag-only products */
  extra: '#C7C1B3',
  /** Soft tints for chips, pressed states and highlights */
  morningSoft: 'rgba(240,190,126,0.14)',
  healthSoft: 'rgba(124,196,242,0.16)',
  skinSoft: 'rgba(242,164,155,0.2)',
  emptySoft: 'rgba(255,138,122,0.3)',
};

const light: typeof dark = {
  bg: '#F2F2F7',
  bg2: '#E5E5EA',
  card: '#FFFFFF',
  card2: '#F2F2F7',
  fill: 'rgba(118,118,128,0.12)',
  solid: '#FFFFFF',
  line: 'rgba(60,60,67,0.12)',
  line2: 'rgba(60,60,67,0.29)',
  grid: 'rgba(60,60,67,0.10)',

  text: '#000000',
  muted: 'rgba(60,60,67,0.6)',
  dim: '#8A8A8E',

  sage: '#1F9D6E',
  sageLight: '#3DB887',
  sageInk: '#FFFFFF',
  sageSoft: 'rgba(31,157,110,0.12)',

  gold: '#B57A00',
  goldSoft: 'rgba(181,122,0,0.12)',
  empty: '#D9452F',

  morning: '#C4852F',
  morningLight: '#E0A552',
  night: '#5E58D6',
  nightLight: '#837EE6',
  health: '#1F84C9',
  healthLight: '#4FA3DC',
  skin: '#D0625A',
  skinLight: '#E3877F',
  body: '#4F6699',
  bodyLight: '#7489B8',
  activity: '#1E9AA6',
  extra: '#8C8577',
  morningSoft: 'rgba(196,133,47,0.12)',
  healthSoft: 'rgba(31,132,201,0.12)',
  skinSoft: 'rgba(208,98,90,0.14)',
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
  accent: '#A8E8CD',
} as const;

export const radius = { card: 24, small: 14, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, gutter: 16 } as const;

/** SF Pro, the system font, by weight. Spread into a style: `{ ...font.semibold, fontSize: 15 }`. */
export const font = {
  light: { fontWeight: '300' },
  regular: { fontWeight: '400' },
  medium: { fontWeight: '500' },
  semibold: { fontWeight: '600' },
  bold: { fontWeight: '700' },
  /** Numbers that line up (axes, times, tables) */
  mono: { fontWeight: '400', fontVariant: ['tabular-nums'] },
  monoMedium: { fontWeight: '500', fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export const motion = { max: 400, ease: [0.2, 0.8, 0.2, 1] as const } as const;

export const minTouch = 44;

export type SlotId = 'am' | 'pm' | 'health';

export const SLOTS: { id: SlotId; name: string; color: ColorValue; light: ColorValue; key: ColorName }[] = [
  { id: 'am', name: 'Morning', color: colors.morning, light: colors.morningLight, key: 'morning' },
  { id: 'pm', name: 'Night', color: colors.night, light: colors.nightLight, key: 'night' },
  { id: 'health', name: 'Health', color: colors.health, light: colors.healthLight, key: 'health' },
];

export const slotColor = (id: string) => SLOTS.find((s) => s.id === id)?.color ?? colors.sage;
