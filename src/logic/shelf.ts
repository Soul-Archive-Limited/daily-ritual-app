// Products and how full they are (ported from the web app's products/usesPerDay/shelfState).
import type { Config, Day, Step } from '@/db/types';
import { diffDays, todayKey } from '@/logic/dates';

export type Shape = 'tube' | 'pump' | 'bottle' | 'jar' | 'stick' | 'spray' | 'bar' | 'tub';
export const SHAPES: Shape[] = ['tube', 'pump', 'bottle', 'jar', 'stick', 'spray', 'bar', 'tub'];

/** What's saved per product (shelf table doc). */
export type ShelfRecord = {
  /** YYYY-MM-DD */
  openedAt?: string | null;
  lastsWeeks?: number;
  /** Uses per bottle, if you corrected it */
  capacity?: number | null;
  /** "How full is it really?" from this date on */
  level?: { v: number; at: string } | null;
  shape?: Shape;
  /** File name in the app's product photo folder */
  photo?: string | null;
  /** true when the background was lifted away */
  photoCut?: boolean;
  /** Dates new bottles were opened */
  history?: string[];
  /** Bag-only product, not used in a step */
  standalone?: boolean;
  name?: string;
  packed?: boolean;
  /** Restock reminder planned for this bottle (its openedAt), and when it fires */
  warnedFor?: string | null;
  warnAt?: number | null;
};

export type Product = { id: string; name: string; steps: Step[]; standalone?: boolean };

export type Status = 'unset' | 'empty' | 'low' | 'half' | 'fresh';

export type ShelfState = {
  r: ShelfRecord;
  wk: number;
  shape: Shape;
  opened: string | null;
  /** days left at your pace */
  left: number | null;
  /** 0..1 */
  frac: number | null;
  manual?: boolean;
  cap?: number | null;
  usesLeft?: number | null;
  mode?: 'uses' | 'time';
  rate?: number;
  uses?: number;
  status: Status;
};

export const STATUS_LABEL: Record<Status, string> = {
  unset: 'Add open date',
  empty: 'Probably finished',
  low: 'Restock soon',
  half: 'Half way',
  fresh: 'Plenty left',
};

export const slug = (s: string) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f’']/g, '')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'p';

const LIFE: [RegExp, number][] = [
  [/sunscreen|spf|uv doux/i, 6],
  [/cleanser|face wash/i, 10],
  [/toothpaste|marvis/i, 6],
  [/deodorant/i, 8],
  [/shampoo/i, 8],
  [/conditioner|inforcer/i, 8],
  [/serum|serioxyl|skarfix/i, 8],
  [/oil|mise en/i, 16],
  [/gum|gel|wax/i, 10],
  [/jelly|vaseline/i, 20],
  [/soap/i, 4],
  [/parfum|perfume|fragrance/i, 26],
  [/aha|exfoliant|lacsoft|glycolic/i, 12],
  [/cream|crème|atoderm|moistur/i, 8],
  [/vitamin|b-complex|supplement/i, 8],
];
export const lifeOf = (n: string) => LIFE.find(([r]) => r.test(n))?.[1] ?? 8;

export function shapeOf(text: string): Shape {
  const n = text.toLowerCase();
  if (/spray|parfum|perfume|fragrance|mist/.test(n)) return 'spray';
  if (/deodorant|stick|roll/.test(n)) return 'stick';
  if (/soap bar|bar soap|soap/.test(n)) return 'bar';
  if (/jelly|vaseline|balm|crème|cream|butter/.test(n) && !/sunscreen/.test(n)) return 'jar';
  if (/gum|wax|pomade|clay/.test(n)) return 'tub';
  if (/serum|oil|serioxyl|skarfix|pump/.test(n)) return 'pump';
  if (/shampoo|conditioner|inforcer|lotion|lacsoft|micellar|toner/.test(n)) return 'bottle';
  if (/vitamin|tablet|capsule|complex/.test(n)) return 'tub';
  return 'tube';
}

/** Every product used in a step (same product name = one product), plus bag-only ones. */
export function products(steps: Step[], shelf: Record<string, ShelfRecord>): Product[] {
  const m = new Map<string, Product>();
  for (const s of steps) {
    if (!s.product || s.type === 'water') continue;
    const id = slug(s.product);
    const p = m.get(id) ?? { id, name: s.product, steps: [] };
    p.steps.push(s);
    m.set(id, p);
  }
  for (const [id, r] of Object.entries(shelf)) {
    if (r?.standalone && r.name && !m.has(id)) m.set(id, { id, name: r.name, steps: [], standalone: true });
  }
  return [...m.values()];
}

/** Ticks of this product's steps on or after `since`. */
export function usesSince(p: Product, days: Record<string, Day>, since?: string | null) {
  let n = 0;
  for (const [k, d] of Object.entries(days)) {
    if (since && k < since) continue;
    for (const s of p.steps) if (d?.done?.[s.id]) n++;
  }
  return n;
}

/** Uses per day in this routine: every day = 1, wash days = n/7, no-wash = (7−n)/7, optional = 0.25. */
export function usesPerDay(p: Product, c: Config) {
  const n = c.shampooDays.length;
  const ex = c.exfoliateDays.length || n;
  let r = 0;
  for (const st of p.steps) {
    if (st.paused) continue;
    r +=
      st.on === 'every'
        ? 1
        : st.on === 'shampoo'
          ? n / 7
          : st.on === 'noshampoo'
            ? (7 - n) / 7
            : st.on === 'exfoliate'
              ? ex / 7
              : st.on === 'noexfoliate'
                ? (7 - ex) / 7
                : st.on === 'optional'
                  ? 0.25
                  : 1;
  }
  return r;
}

export function shelfState(
  p: Product,
  r: ShelfRecord = {},
  c: Config,
  days: Record<string, Day>,
  today = todayKey(),
): ShelfState {
  const text = `${p.name} ${p.steps.map((s) => s.name).join(' ')}`;
  const wk = Number(r.lastsWeeks) || lifeOf(text);
  const shape = r.shape ?? shapeOf(text);
  const opened = r.openedAt ?? null;
  if (!opened) return { r, wk, shape, opened: null, left: null, frac: null, status: 'unset' };

  const rate = usesPerDay(p, c);
  const total = wk * 7;
  const manual = !!(r.level?.at && r.level.at >= opened);
  const base = manual ? r.level! : { v: 1, at: opened };
  let frac: number;
  let left: number;
  let cap: number | null = null;
  let usesLeft: number | null = null;
  let mode: 'uses' | 'time' = 'time';
  if (rate > 0) {
    cap = Math.max(1, Number(r.capacity) || Math.round(total * rate));
    const used = usesSince(p, days, base.at);
    frac = Math.max(0, Math.min(1, base.v - used / cap));
    usesLeft = Math.max(0, Math.round(frac * cap));
    left = Math.round(usesLeft / rate);
    mode = 'uses';
  } else {
    const since = diffDays(base.at, today);
    frac = Math.max(0, Math.min(1, base.v - since / total));
    left = Math.round(frac * total);
  }
  const status: Status = frac <= 0 ? 'empty' : left <= 14 || frac <= 0.15 ? 'low' : frac < 0.5 ? 'half' : 'fresh';
  return {
    r,
    wk,
    shape,
    opened,
    left,
    frac,
    manual,
    cap,
    usesLeft,
    mode,
    rate,
    uses: usesSince(p, days, opened),
    status,
  };
}

/** Battery colour: green, gold at ≤35%, red at ≤15%. */
export const batteryColor = <C>(frac: number, c: { sage: C; gold: C; empty: C }) =>
  frac <= 0.15 ? c.empty : frac <= 0.35 ? c.gold : c.sage;
