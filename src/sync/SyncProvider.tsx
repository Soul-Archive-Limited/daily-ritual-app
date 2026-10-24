import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useStore } from '@/data/store';

import { getSession, syncNow, syncUrl, type Session } from './client';

type SyncState = {
  session: Session | null;
  busy: boolean;
  lastAt: number | null;
  error: string | null;
  run: () => Promise<void>;
  setSession: (s: Session | null) => void;
};

const Ctx = createContext<SyncState | null>(null);

const EVERY = 15 * 60_000;
const AFTER_EDIT = 30_000;

/** Syncs on open, when the app comes back, 30 s after the last change and every 15 minutes. */
export function SyncProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const s = useStore();
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastAt, setLastAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const reload = s?.reloadAll;

  useEffect(() => {
    getSession(db).then(setSession);
  }, [db]);

  const run = useCallback(async () => {
    if (!syncUrl || !session || running.current) return;
    running.current = true;
    setBusy(true);
    try {
      if (await syncNow(db)) await reload?.();
      setLastAt(Date.now());
      setError(null);
    } catch (e) {
      const status = (e as { status?: number }).status;
      setError(status === 401 ? 'Signed out on the server. Sign in again to keep syncing.' : 'Couldn’t sync. It will try again.');
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [db, session, reload]);

  // On open and every 15 minutes while active.
  useEffect(() => {
    if (!session) return;
    const first = setTimeout(run, 0);
    const id = setInterval(run, EVERY);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && run());
    return () => {
      clearTimeout(first);
      clearInterval(id);
      sub.remove();
    };
  }, [session, run]);

  // A little after the last change.
  const days = s?.days;
  const steps = s?.steps;
  const config = s?.config;
  useEffect(() => {
    if (!session) return;
    const t = setTimeout(run, AFTER_EDIT);
    return () => clearTimeout(t);
  }, [session, run, days, steps, config]);

  return <Ctx.Provider value={{ session, busy, lastAt, error, run, setSession }}>{children}</Ctx.Provider>;
}

export const useSync = () => useContext(Ctx);
