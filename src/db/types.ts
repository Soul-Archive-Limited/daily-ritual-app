import type { SlotId } from '@/theme/tokens';

/** When a step is scheduled. Same values as the web app's `on`. */
export type StepRule = 'every' | 'shampoo' | 'noshampoo' | 'exfoliate' | 'noexfoliate' | 'optional';

export type Step = {
  id: string;
  slot: SlotId;
  name: string;
  product: string;
  note: string;
  on: StepRule;
  essential?: boolean;
  paused?: boolean;
  type?: 'water';
  /** Water goal in ml */
  goal?: number;
};

export type Place = {
  name: string;
  country?: string;
  lat?: number;
  lon?: number;
  tz?: string;
  /** ms epoch when set */
  at?: number;
  manual?: boolean;
};

/** App settings. Steps live in their own table. */
export type Config = {
  name: string;
  startedAt: string; // YYYY-MM-DD
  shampooDays: number[]; // 0 = Sun
  exfoliateDays: number[];
  exfoliateMode: boolean;
  checkinEvery: number;
  reminders: { am: string; pm: string };
  lastTz?: string;
  place?: Place;
  heightCm?: number;
  cards?: Partial<Record<'ask' | 'next' | 'sun' | 'restock' | 'activity', boolean>>;
  /** Local notifications. Undefined until a choice is made on the Today card. */
  notify?: { on: boolean };
  /** Nudge to reapply SPF during strong sun after sunscreen was ticked. */
  spfNudge?: boolean;
};

/** Snapshot of a step definition stored with each day (web: defs). */
export type StepDef = { n: string; s: SlotId; p?: string; t?: 'water'; g?: number };

export type DayFlags = { shampoo?: boolean; exfoliate?: boolean; travel?: boolean };

export type Activity = { type: string; at: number };

/** One logged day. Shape matches the web app's day document. */
export type Day = {
  date: string; // YYYY-MM-DD
  tz?: string;
  flags?: DayFlags;
  /** Expected step ids, snapshotted on every write (skipped ones excluded) */
  exp?: string[];
  defs?: Record<string, StepDef>;
  /** step id → ms epoch it was ticked */
  done: Record<string, number>;
  /** step id → ms epoch it was skipped */
  skip?: Record<string, number>;
  /** ml */
  water?: number;
  activity?: Activity[];
  places?: string[];
  /** SPF reapply times, ms epoch */
  spf?: number[];
  pct?: number;
  /** ms epoch of last save */
  at?: number;
};

/** Weekly review written on-device by Apple Intelligence. Keyed by the Monday of the week. */
export type Review = {
  week: string;
  at: number;
  headline: string;
  wins: string[];
  slips: string[];
  skin?: string;
  body?: string;
  focus?: string;
};
