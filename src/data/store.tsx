import { getCalendars } from 'expo-localization';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import {
  deleteCheckinRow,
  deleteShelf,
  deleteWeighin,
  getCheckins,
  getConfig,
  getShelf,
  getDays,
  getReviews,
  getSteps,
  getWeighins,
  putCheckin,
  putDay,
  putReview,
  putShelf,
  putWeighin,
  saveSteps,
  setConfig as saveConfig,
  type Weighin,
} from '@/db/repo';
import { importExport, type ExportFile } from '@/db/import';
import type { Config, Day, Review, Step } from '@/db/types';
import { parseKey, todayKey } from '@/logic/dates';
import { dayInfo, isActive, snapshotDay } from '@/logic/scoring';
import { slug, type ShelfRecord } from '@/logic/shelf';
import { restockPlan } from '@/notifications/plan';
import { replanReminders } from '@/notifications/schedule';
import type { Checkin } from '@/skin/model';
import { deleteCheckinPhoto } from '@/skin/photos';
import type { SunDay } from '@/sun/sun';
import type { SlotId } from '@/theme/tokens';

export type Toast = { id: number; text: string; undo?: () => void };

export type DayType = 'normal' | 'shampoo' | 'exfoliate' | 'both' | 'travel';

/** Set when a reminder is tapped (Today opens that routine) or a day is tapped in Progress (Today opens that day). */
export type Focus = { slot?: SlotId; day?: string; at: number };

type Store = {
  ready: boolean;
  config: Config;
  steps: Step[];
  days: Record<string, Day>;
  toast: Toast | null;
  showToast: (text: string, undo?: () => void) => void;
  dismissToast: () => void;
  tick: (k: string, id: string) => void;
  skip: (k: string, id: string) => void;
  unskip: (k: string, id: string) => void;
  skipActives: (k: string) => void;
  setWater: (k: string, ml: number) => void;
  setDayType: (k: string, t: DayType) => void;
  logActivity: (k: string, type: string) => void;
  removeActivity: (k: string, index: number) => void;
  updateConfig: (patch: Partial<Config>) => void;
  focus: Focus | null;
  setFocus: (f: Focus | null) => void;
  /** Routine editing. Every change saves straight away. */
  updateStep: (id: string, patch: Partial<Step>) => void;
  moveStep: (id: string, dir: -1 | 1) => void;
  reorderSlot: (slot: SlotId, ids: string[]) => void;
  addStep: (slot: SlotId) => string;
  duplicateStep: (id: string) => string | null;
  togglePause: (id: string) => void;
  removeStep: (id: string) => void;
  /** Replace the routine with an undo toast (routine check fixes). */
  replaceSteps: (next: Step[], message: string) => void;
  weighins: Weighin[];
  logWeight: (kg: number) => void;
  removeWeighin: (id: string) => void;
  /** Re-read everything from the database (after a restore). */
  reloadAll: () => Promise<void>;
  /** Today's sun and UV where you are (set by SunProvider). */
  sun: SunDay | null;
  setSun: (d: SunDay | null) => void;
  logReapply: () => void;
  shelf: Record<string, ShelfRecord>;
  /** Merge and save a product record. */
  saveShelf: (id: string, patch: Partial<ShelfRecord>) => void;
  addBagProduct: (name: string) => string | null;
  removeBagProduct: (id: string) => void;
  /** Newest first */
  checkins: Checkin[];
  saveCheckin: (c: Checkin) => Promise<void>;
  deleteCheckin: (id: string) => void;
  /** Weekly reviews, newest first */
  reviews: Review[];
  saveReview: (r: Review) => Promise<void>;
};

const newId = () => 's' + Math.random().toString(36).slice(2, 9);

/** Runs saves one at a time; if several queue up, only the newest runs. */
function latestOnly<T>(run: (v: T) => Promise<void>) {
  let busy = false;
  let next: { v: T } | null = null;
  return async (v: T) => {
    next = { v };
    if (busy) return;
    busy = true;
    try {
      while (next) {
        const job: { v: T } = next;
        next = null;
        await run(job.v);
      }
    } finally {
      busy = false;
    }
  };
}

const Ctx = createContext<Store | null>(null);

/** First-run setup: known once the database has loaded and no profile exists yet. */
type Setup = {
  needsSetup: boolean;
  finishSetup: (config: Config, steps: Step[]) => Promise<void>;
  restore: (data: ExportFile) => Promise<void>;
};
const SetupCtx = createContext<Setup>({ needsSetup: false, finishSetup: async () => {}, restore: async () => {} });

export const ACTIVITIES: [string, string][] = [
  ['run', 'Run'],
  ['workout', 'Workout'],
  ['walk', 'Walk'],
];

export const deviceTz = () => getCalendars()[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';

export function StoreProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [config, setConfigState] = useState<Config | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [days, setDays] = useState<Record<string, Day>>({});
  const [toast, setToast] = useState<Toast | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [weighins, setWeighins] = useState<Weighin[]>([]);
  const [sun, setSun] = useState<SunDay | null>(null);
  const [shelf, setShelf] = useState<Record<string, ShelfRecord>>({});
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);
  const lastCheckinRef = useRef<string | null>(null);
  useEffect(() => {
    lastCheckinRef.current = checkins[0]?.date ?? null;
  }, [checkins]);
  const shelfRef = useRef(shelf);
  const stepSaver = useRef(latestOnly<Step[]>((list) => saveSteps(db, list)));
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest state for handlers (avoids stale closures between quick taps).
  const live = useRef({ config, steps, days });
  const sunRef = useRef<SunDay | null>(null);
  useEffect(() => {
    sunRef.current = sun;
  }, [sun]);
  useEffect(() => {
    live.current = { config, steps, days };
  }, [config, steps, days]);

  /** Save settings and update state. */
  const persistConfig = useCallback(
    (next: Config) => {
      live.current.config = next;
      setConfigState(next);
      saveConfig(db, next);
    },
    [db],
  );

  /** Merge and save a product record. */
  const persistShelf = useCallback(
    (id: string, patch: Partial<ShelfRecord>) => {
      const doc = { ...shelfRef.current[id], ...patch };
      const next = { ...shelfRef.current, [id]: doc };
      shelfRef.current = next;
      setShelf(next);
      return putShelf(db, id, doc);
    },
    [db],
  );

  /** The phone's time zone is the truth: follow it silently, never prompt. */
  const followTimeZone = useCallback(() => {
    const c = live.current.config;
    const tz = deviceTz();
    if (c && tz && tz !== c.lastTz) {
      persistConfig({ ...c, lastTz: tz });
      return true;
    }
    return false;
  }, [persistConfig]);

  const reloadAll = useCallback(async () => {
    const [c, s, d, w, sh, ck, rv] = await Promise.all([
      getConfig(db),
      getSteps(db),
      getDays(db),
      getWeighins(db),
      getShelf(db),
      getCheckins(db),
      getReviews(db),
    ]);
    live.current = { config: c, steps: s, days: d };
    shelfRef.current = sh;
    setSteps(s);
    setDays(d);
    setWeighins(w);
    setShelf(sh);
    setCheckins(ck);
    setReviews(rv);
    setConfigState(c);
    setLoaded(true);
    followTimeZone();
  }, [db, followTimeZone]);

  const finishSetup = useCallback(
    async (c: Config, list: Step[]) => {
      await saveConfig(db, c);
      await saveSteps(db, list);
      await reloadAll();
    },
    [db, reloadAll],
  );

  const restore = useCallback(
    async (data: ExportFile) => {
      await importExport(db, data);
      await reloadAll();
    },
    [db, reloadAll],
  );

  const setup = useMemo(
    () => ({ needsSetup: loaded && !config, finishSetup, restore }),
    [loaded, config, finishSetup, restore],
  );

  useEffect(() => {
    // Initial load from SQLite; state is set once the queries resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reloadAll();
  }, [reloadAll]);

  // Keep reminders in step with the log: re-plan shortly after any change.
  useEffect(() => {
    if (!config) return;
    const t = setTimeout(() => {
      const r = restockPlan(config, steps, days, shelf);
      r.marks.forEach((m) => persistShelf(m.id, m.patch));
      replanReminders(config, steps, days, sun, r.items, checkins[0]?.date ?? null);
    }, 600);
    return () => clearTimeout(t);
  }, [config, steps, days, sun, shelf, persistShelf, checkins]);

  // Back in the app: the date or time zone may have changed since the last plan.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active') return;
      if (followTimeZone()) return; // config changed, which re-plans
      const { config: c, steps: s, days: d } = live.current;
      if (c)
        replanReminders(c, s, d, sunRef.current, restockPlan(c, s, d, shelfRef.current).items, lastCheckinRef.current);
    });
    return () => sub.remove();
  }, [followTimeZone]);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const showToast = useCallback((text: string, undo?: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const t = { id: Date.now(), text, undo };
    setToast(t);
    toastTimer.current = setTimeout(() => setToast((cur) => (cur?.id === t.id ? null : cur)), undo ? 5500 : 2800);
  }, []);

  /** Copy of a day to edit. */
  const dayDoc = (k: string): Day => {
    const d = live.current.days[k];
    return d ? (JSON.parse(JSON.stringify(d)) as Day) : { date: k, done: {} };
  };

  /** Snapshot, score, save to SQLite and update state. */
  const writeDay = (doc: Day, resnapshot = false) => {
    const { config: c, steps: s } = live.current;
    if (!c) return doc;
    const out = snapshotDay(doc, c, s, { tz: deviceTz(), place: c.place?.name, resnapshot });
    const next = { ...live.current.days, [out.date]: out };
    live.current.days = next;
    setDays(next);
    putDay(db, out).catch(() => showToast('Couldn’t save that change. Try again.'));
    return out;
  };

  const info = (k: string) => {
    const { config: c, steps: s, days: d } = live.current;
    return dayInfo(k, c!, s, d[k]);
  };

  const isFuture = (k: string) => k > todayKey();

  const tick = (k: string, id: string) => {
    if (isFuture(k)) return;
    const before = info(k);
    const doc = dayDoc(k);
    if (doc.skip?.[id]) {
      doc.skip = { ...doc.skip };
      delete doc.skip[id];
    }
    if (doc.done[id]) delete doc.done[id];
    else doc.done[id] = k === todayKey() ? Date.now() : parseKey(k).getTime() + 12 * 36e5;
    writeDay(doc);
    const x = info(k);
    if (x.total && x.n === x.total && before.n < x.n) showToast('Every step done. Perfect day.');
    else if (before.p < 0.8 && x.p >= 0.8 && k === todayKey()) showToast('Today counts for your streak.');
    else {
      const names = { am: 'Morning', pm: 'Night', health: 'Health' } as const;
      const sl = (['am', 'pm', 'health'] as const).find((z) => {
        const p = before.slot[z];
        const q = x.slot[z];
        return q.n && q.d === q.n && p.d < p.n;
      });
      if (sl) showToast(`${names[sl]} routine finished.`);
    }
  };

  const unskipIds = (k: string, ids: string[]) => {
    const d2 = dayDoc(k);
    if (d2.skip) {
      d2.skip = { ...d2.skip };
      ids.forEach((id) => delete d2.skip![id]);
    }
    writeDay(d2);
  };

  const skip = (k: string, id: string) => {
    if (isFuture(k)) return;
    const doc = dayDoc(k);
    doc.skip = { ...doc.skip, [id]: Date.now() };
    delete doc.done[id];
    writeDay(doc);
    const st = live.current.steps.find((x) => x.id === id) ?? info(k).skipped.find((x) => x.id === id);
    showToast(`${st ? st.name : 'Step'} skipped. It won’t count against you.`, () => unskipIds(k, [id]));
  };

  const unskip = (k: string, id: string) => {
    if (isFuture(k)) return;
    unskipIds(k, [id]);
  };

  const skipActives = (k: string) => {
    if (isFuture(k)) return;
    const doc = dayDoc(k);
    const ids = info(k)
      .exp.filter((x) => x.slot === 'pm' && isActive(x) && !doc.done[x.id])
      .map((x) => x.id);
    if (!ids.length) return;
    doc.skip = { ...doc.skip };
    ids.forEach((id) => (doc.skip![id] = Date.now()));
    writeDay(doc);
    showToast('Actives skipped for tonight. Moisturise and let it calm.', () => unskipIds(k, ids));
  };

  const setWater = (k: string, ml: number) => {
    if (isFuture(k)) return;
    const w = live.current.steps.find((x) => x.type === 'water');
    if (!w) return;
    const g = w.goal || 3000;
    const v = Math.max(0, Math.min(g * 2, Math.round(ml)));
    const doc = dayDoc(k);
    const before = doc.water ?? 0;
    if (before === v) return;
    doc.water = v;
    writeDay(doc);
    if (before < g && v >= g) showToast('Water goal reached.');
  };

  const setDayType = (k: string, t: DayType) => {
    if (isFuture(k)) return;
    const c = live.current.config!;
    const doc = dayDoc(k);
    doc.flags =
      t === 'travel'
        ? { shampoo: false, exfoliate: false, travel: true }
        : {
            shampoo: t === 'shampoo' || t === 'both',
            exfoliate: c.exfoliateMode ? t === 'exfoliate' || t === 'both' : t === 'shampoo',
            travel: false,
          };
    writeDay(doc, true);
  };

  const logActivity = (k: string, type: string) => {
    if (isFuture(k)) return;
    const doc = dayDoc(k);
    const now = new Date();
    const at =
      k === todayKey() ? now.getTime() : parseKey(k).getTime() + now.getHours() * 36e5 + now.getMinutes() * 6e4;
    doc.activity = [...(doc.activity ?? []), { type, at }];
    writeDay(doc);
    showToast(`${ACTIVITIES.find((a) => a[0] === type)?.[1] ?? 'Activity'} logged`);
  };

  const removeActivity = (k: string, index: number) => {
    const doc = dayDoc(k);
    if (!doc.activity) return;
    const removed = doc.activity[index];
    doc.activity = doc.activity.filter((_, i) => i !== index);
    writeDay(doc);
    showToast('Activity removed.', () => {
      const d2 = dayDoc(k);
      d2.activity = [...(d2.activity ?? []), removed].sort((a, b) => a.at - b.at);
      writeDay(d2);
    });
  };

  const updateConfig = (patch: Partial<Config>) => persistConfig({ ...live.current.config!, ...patch });

  /** Save a new routine. Past days keep their own snapshot, so history never changes. */
  const commitSteps = (next: Step[]) => {
    live.current.steps = next;
    setSteps(next);
    stepSaver.current(next).catch(() => showToast('Couldn’t save the routine. Try again.'));
  };

  const updateStep = (id: string, patch: Partial<Step>) => {
    const list = live.current.steps;
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return;
    const merged: Step = { ...list[i], ...patch };
    let next = list.map((x) => (x.id === id ? merged : x));
    // Moving to another routine puts it at the end of that routine.
    if (patch.slot && patch.slot !== list[i].slot) next = [...next.filter((x) => x.id !== id), merged];
    commitSteps(next);
  };

  const moveStep = (id: string, dir: -1 | 1) => {
    const list = [...live.current.steps];
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return;
    let j = i + dir;
    while (j >= 0 && j < list.length && list[j].slot !== list[i].slot) j += dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    commitSteps(list);
  };

  const reorderSlot = (slot: SlotId, ids: string[]) => {
    const list = live.current.steps;
    const by = new Map(list.map((x) => [x.id, x]));
    const ordered = ids.map((id) => by.get(id)!).filter(Boolean);
    let j = 0;
    commitSteps(list.map((x) => (x.slot === slot ? ordered[j++] : x)));
  };

  const addStep = (slot: SlotId) => {
    const id = newId();
    commitSteps([...live.current.steps, { id, slot, name: 'New step', product: '', note: '', on: 'every' }]);
    return id;
  };

  const duplicateStep = (id: string) => {
    const list = live.current.steps;
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return null;
    const copy: Step = { ...list[i], id: newId(), name: `${list[i].name} (copy)` };
    commitSteps([...list.slice(0, i + 1), copy, ...list.slice(i + 1)]);
    return copy.id;
  };

  const togglePause = (id: string) => {
    const st = live.current.steps.find((x) => x.id === id);
    if (!st) return;
    const paused = !st.paused;
    commitSteps(live.current.steps.map((x) => (x.id === id ? { ...x, paused: paused || undefined } : x)));
    showToast(paused ? 'Paused. It won’t show on Today until you resume it.' : 'Back in your routine');
  };

  const removeStep = (id: string) => {
    const before = live.current.steps;
    const st = before.find((x) => x.id === id);
    if (!st) return;
    commitSteps(before.filter((x) => x.id !== id));
    showToast(`“${st.name}” removed`, () => commitSteps(before));
  };

  const replaceSteps = (next: Step[], message: string) => {
    const before = live.current.steps;
    commitSteps(next);
    showToast(message, () => commitSteps(before));
  };

  const logWeight = (kg: number) => {
    const date = todayKey();
    const w: Weighin = { id: `w-${date}`, date, kg: Math.round(kg * 10) / 10, at: Date.now() };
    setWeighins((list) => [...list.filter((x) => x.id !== w.id), w].sort((a, b) => (a.date < b.date ? -1 : 1)));
    putWeighin(db, w)
      .then(() => showToast(`Weigh-in saved: ${w.kg} kg`))
      .catch(() => showToast('Couldn’t save. Try again.'));
  };

  const logReapply = () => {
    const k = todayKey();
    const doc = dayDoc(k);
    doc.spf = [...(doc.spf ?? []), Date.now()];
    writeDay(doc);
    const n = doc.spf.length;
    showToast(`SPF reapplied${n > 1 ? ` (${n}× today)` : ''}.`, () => {
      const d2 = dayDoc(k);
      d2.spf = (d2.spf ?? []).slice(0, -1);
      writeDay(d2);
    });
  };

  const saveShelf = (id: string, patch: Partial<ShelfRecord>) =>
    persistShelf(id, patch).catch(() => showToast('Couldn’t save that. Try again.'));

  const addBagProduct = (name: string) => {
    const n = name.trim();
    if (!n) return null;
    const id = slug(n);
    saveShelf(id, { standalone: true, name: n });
    return id;
  };

  const removeBagProduct = (id: string) => {
    const old = shelfRef.current[id];
    if (!old) return;
    const next = { ...shelfRef.current };
    delete next[id];
    shelfRef.current = next;
    setShelf(next);
    deleteShelf(db, id);
    showToast(`“${old.name ?? 'Product'}” removed`, () => saveShelf(id, old));
  };

  const saveCheckin = async (c: Checkin) => {
    // Photos replaced by a retake on the same day are no longer needed.
    const old = checkins.find((x) => x.id === c.id);
    if (old)
      for (const [a, name] of Object.entries(old.photos))
        if (name && c.photos[a as keyof Checkin['photos']] !== name) deleteCheckinPhoto(name);
    await putCheckin(db, c);
    setCheckins((list) => [c, ...list.filter((x) => x.id !== c.id)].sort((a, b) => (a.date < b.date ? 1 : -1)));
  };

  /** Deleting removes the photos for good (no undo). */
  const deleteCheckin = (id: string) => {
    const c = checkins.find((x) => x.id === id);
    if (!c) return;
    setCheckins((list) => list.filter((x) => x.id !== id));
    deleteCheckinRow(db, id).then(() => {
      Object.values(c.photos).forEach((n) => deleteCheckinPhoto(n));
      showToast('Check-in deleted');
    });
  };

  const saveReview = async (rv: Review) => {
    await putReview(db, rv);
    setReviews((list) => [rv, ...list.filter((x) => x.week !== rv.week)].sort((a, b) => (a.week < b.week ? 1 : -1)));
  };

  const removeWeighin = (id: string) => {
    const old = weighins.find((x) => x.id === id);
    setWeighins((list) => list.filter((x) => x.id !== id));
    deleteWeighin(db, id).then(() =>
      showToast(
        'Weigh-in removed',
        old
          ? () => {
              setWeighins((list) => [...list, old].sort((a, b) => (a.date < b.date ? -1 : 1)));
              putWeighin(db, old);
            }
          : undefined,
      ),
    );
  };

  const value: Store | null = config
    ? {
        ready: true,
        config,
        steps,
        days,
        toast,
        showToast,
        dismissToast,
        tick,
        skip,
        unskip,
        skipActives,
        setWater,
        setDayType,
        logActivity,
        removeActivity,
        updateConfig,
        focus,
        setFocus,
        updateStep,
        moveStep,
        reorderSlot,
        addStep,
        duplicateStep,
        togglePause,
        removeStep,
        replaceSteps,
        weighins,
        logWeight,
        removeWeighin,
        reloadAll,
        sun,
        setSun,
        logReapply,
        shelf,
        saveShelf,
        addBagProduct,
        removeBagProduct,
        checkins,
        saveCheckin,
        deleteCheckin,
        reviews,
        saveReview,
      }
    : null;

  return (
    <SetupCtx.Provider value={setup}>
      <Ctx.Provider value={value}>{children}</Ctx.Provider>
    </SetupCtx.Provider>
  );
}

/** App data and actions. Null until the database has loaded. */
export function useStore() {
  return useContext(Ctx);
}

/** First-run setup state and actions. */
export function useSetup() {
  return useContext(SetupCtx);
}

/** Info for one day, recomputed when data changes. */
export function useDayInfo(k: string) {
  const s = useStore();
  return useMemo(() => (s ? dayInfo(k, s.config, s.steps, s.days[k]) : null), [s, k]);
}
