// The website's copy of a signed-in person's data: pulled from the sync server, kept in memory,
// and written back as whole documents (the newest change wins, exactly like the app).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import type { Config, Day, Review, Step } from '@/db/types';
import { parseKey, todayKey } from '@/logic/dates';
import { snapshotDay } from '@/logic/scoring';
import type { ShelfRecord } from '@/logic/shelf';

import { demoData } from './demo';

type Kind = 'config' | 'step' | 'day' | 'shelf' | 'checkin' | 'weighin' | 'review';
type Doc = { kind: Kind; id: string; updated_at: number; deleted: 0 | 1; body?: unknown };

export type User = { id: string; email: string | null };
export type Weighin = { id: string; date: string; kg: number; at: number };
export type CheckinLite = { id: string; date: string; scores: Record<string, number>; note?: string };

export type Data = {
  config: Config | null;
  steps: Step[];
  days: Record<string, Day>;
  shelf: Record<string, ShelfRecord>;
  checkins: CheckinLite[];
  weighins: Weighin[];
  reviews: Review[];
};

const EMPTY: Data = { config: null, steps: [], days: {}, shelf: {}, checkins: [], weighins: [], reviews: [] };

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw Object.assign(new Error(json.error ?? `HTTP ${res.status}`), { status: res.status });
  return json;
}

/** Steps travel as the app's database rows; turn them back into steps. */
type StepRow = {
  id: string;
  slot: Step['slot'];
  name: string;
  product?: string;
  note?: string;
  schedule?: Step['on'];
  essential?: number;
  paused?: number;
  type?: 'water' | null;
  goal?: number | null;
  position?: number;
};
const toSteps = (rows: StepRow[]): Step[] =>
  [...rows]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((r) => ({
      id: r.id,
      slot: r.slot,
      name: r.name,
      product: r.product ?? '',
      note: r.note ?? '',
      on: r.schedule ?? 'every',
      ...(r.essential ? { essential: true } : {}),
      ...(r.paused ? { paused: true } : {}),
      ...(r.type ? { type: r.type } : {}),
      ...(r.goal != null ? { goal: r.goal } : {}),
    }));

function apply(data: Data, d: Doc): Data {
  const gone = d.deleted === 1;
  const b = d.body as never;
  switch (d.kind) {
    case 'config':
      return gone ? data : { ...data, config: b };
    case 'step':
      return gone || !Array.isArray(b) ? data : { ...data, steps: toSteps(b) };
    case 'day': {
      const days = { ...data.days };
      if (gone) delete days[d.id];
      else days[d.id] = { ...(b as Day), date: d.id };
      return { ...data, days };
    }
    case 'shelf': {
      const shelf = { ...data.shelf };
      if (gone) delete shelf[d.id];
      else shelf[d.id] = b;
      return { ...data, shelf };
    }
    case 'checkin': {
      const rest = data.checkins.filter((x) => x.id !== d.id);
      return { ...data, checkins: gone ? rest : [...rest, b as CheckinLite].sort((x, y) => (x.date < y.date ? 1 : -1)) };
    }
    case 'weighin': {
      const rest = data.weighins.filter((x) => x.id !== d.id);
      return { ...data, weighins: gone ? rest : [...rest, b as Weighin].sort((x, y) => (x.date < y.date ? -1 : 1)) };
    }
    case 'review': {
      const rest = data.reviews.filter((x) => x.week !== d.id);
      return { ...data, reviews: gone ? rest : [b as Review, ...rest].sort((x, y) => (x.week < y.week ? 1 : -1)) };
    }
  }
}

type Store = {
  user: User | null;
  /** Showing sample data from "Try the demo" */
  demo: boolean;
  /** True until we know whether someone is signed in */
  checking: boolean;
  loading: boolean;
  error: string | null;
  data: Data;
  signIn: (provider: 'apple' | 'google', idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  tick: (k: string, id: string) => void;
  setWater: (k: string, ml: number) => void;
  logWeight: (kg: number) => void;
};

const Ctx = createContext<Store | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Data>(EMPTY);
  const live = useRef(data);
  const cursor = useRef(0);
  live.current = data;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      let next = live.current;
      for (;;) {
        const r = await api<{ docs: Doc[]; cursor: number; more: boolean }>(`/sync?since=${cursor.current}`);
        for (const d of r.docs) next = apply(next, d);
        cursor.current = r.cursor;
        if (!r.more || !r.docs.length) break;
      }
      setData(next);
      setError(null);
    } catch (e) {
      if ((e as { status?: number }).status === 401) setUser(null);
      else setError('Couldn’t load your data. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  // "Try the demo": sample data in this tab only, never synced.
  const demo = useRef(new URLSearchParams(location.search).has('demo'));

  useEffect(() => {
    if (demo.current) {
      setData(demoData());
      setUser({ id: 'demo', email: null });
      setChecking(false);
      return;
    }
    api<{ user: User }>('/me')
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  // Load once signed in, then every minute and when the tab comes back.
  useEffect(() => {
    if (!user || demo.current) return;
    void refresh();
    const id = setInterval(refresh, 60_000);
    const onFocus = () => document.visibilityState === 'visible' && void refresh();
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [user, refresh]);

  const push = useCallback(async (docs: Doc[]) => {
    if (demo.current) return;
    try {
      await api('/sync', { method: 'POST', body: JSON.stringify({ docs }) });
    } catch {
      setError('Couldn’t save that change. It will be lost if you close this page.');
    }
  }, []);

  /** Save a day the same way the app does: snapshot the routine, score it, then send it. */
  const writeDay = useCallback(
    (doc: Day) => {
      const { config, steps } = live.current;
      if (!config) return;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const out = snapshotDay(doc, config, steps, { tz });
      setData((d) => ({ ...d, days: { ...d.days, [out.date]: out } }));
      void push([{ kind: 'day', id: out.date, updated_at: Date.now(), deleted: 0, body: out }]);
    },
    [push],
  );

  const dayDoc = (k: string): Day => {
    const d = live.current.days[k];
    return d ? (JSON.parse(JSON.stringify(d)) as Day) : { date: k, done: {} };
  };

  const value: Store = {
    user,
    demo: demo.current,
    checking,
    loading,
    error,
    data,
    refresh,
    signIn: async (provider, idToken) => {
      const body = provider === 'apple' ? { identityToken: idToken } : { idToken };
      const r = await api<{ user: User }>(`/auth/${provider}`, { method: 'POST', body: JSON.stringify(body) });
      cursor.current = 0;
      setData(EMPTY);
      setUser(r.user);
    },
    signOut: async () => {
      if (demo.current) {
        location.href = '/';
        return;
      }
      await api('/signout', { method: 'POST' }).catch(() => {});
      cursor.current = 0;
      setData(EMPTY);
      setUser(null);
    },
    tick: (k, id) => {
      if (k > todayKey()) return;
      const doc = dayDoc(k);
      if (doc.skip?.[id]) {
        doc.skip = { ...doc.skip };
        delete doc.skip[id];
      }
      if (doc.done[id]) delete doc.done[id];
      else doc.done[id] = k === todayKey() ? Date.now() : parseKey(k).getTime() + 12 * 36e5;
      writeDay(doc);
    },
    setWater: (k, ml) => {
      if (k > todayKey()) return;
      const w = live.current.steps.find((x) => x.type === 'water');
      const g = w?.goal || 3000;
      const doc = dayDoc(k);
      doc.water = Math.max(0, Math.min(g * 2, Math.round(ml)));
      writeDay(doc);
    },
    logWeight: (kg) => {
      const date = todayKey();
      const w: Weighin = { id: `w-${date}`, date, kg: Math.round(kg * 10) / 10, at: Date.now() };
      setData((d) => ({
        ...d,
        weighins: [...d.weighins.filter((x) => x.id !== w.id), w].sort((a, b) => (a.date < b.date ? -1 : 1)),
      }));
      void push([{ kind: 'weighin', id: w.id, updated_at: Date.now(), deleted: 0, body: w }]);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useData = () => useContext(Ctx)!;
