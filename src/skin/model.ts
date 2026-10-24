// Skin check-ins: model, wording and when the next one is due (ported from the web app).
import { addDays, diffDays, todayKey } from '@/logic/dates';

export type Angle = 'front' | 'left' | 'right';
export const ANGLES: [Angle, string][] = [
  ['front', 'Front'],
  ['left', 'Left'],
  ['right', 'Right'],
];

export type Metric = 'overall' | 'hydration' | 'clarity' | 'calm' | 'texture';
export const METRICS: [Metric, string][] = [
  ['overall', 'Overall'],
  ['hydration', 'Hydration'],
  ['clarity', 'Clarity'],
  ['calm', 'Calm'],
  ['texture', 'Texture'],
];
export const METRIC_HINT: Record<Metric, string> = {
  overall: 'How your skin feels overall',
  hydration: 'How tight or comfortable it feels',
  clarity: 'Breakouts and clogged pores',
  calm: 'Redness, stinging, itch',
  texture: 'Bumps and rough patches',
};
export const ANCHORS: Record<Metric, [string, string]> = {
  overall: ['Rough', 'Great'],
  hydration: ['Very dry, tight', 'Comfortable'],
  clarity: ['Many breakouts', 'Clear'],
  calm: ['Red, irritated', 'Calm'],
  texture: ['Rough, bumpy', 'Smooth'],
};
export const WORD = ['', 'Rough', 'Meh', 'Okay', 'Good', 'Great'];

export type Irritation = 'none' | 'mild' | 'strong';

export type Checkin = {
  id: string;
  /** YYYY-MM-DD, one per day */
  date: string;
  /** File names in Documents/checkins */
  photos: Partial<Record<Angle, string>>;
  scores: Record<Metric, number>;
  irritation: Irritation;
  note: string;
  /** ms epoch */
  at: number;
  analysis?: unknown;
};

export const DEFAULT_SCORES: Record<Metric, number> = { overall: 3, hydration: 3, clarity: 3, calm: 3, texture: 3 };

/** Next check-in: due today if never done or the interval has passed. */
export function checkinDue(list: Checkin[], every: number, today = todayKey()) {
  const last = list[0] ?? null;
  if (!last) return { due: true, inDays: 0, last, every };
  const d = diffDays(today, addDays(last.date, every || 3));
  return { due: d <= 0, inDays: d, last, every };
}
