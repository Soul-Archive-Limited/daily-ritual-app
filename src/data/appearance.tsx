import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Appearance } from 'react-native';

import { getKv, setKv } from '@/db/repo';

/** Light, dark, or follow the phone. Kept on this device only. */
export type AppearanceMode = 'system' | 'light' | 'dark';

const KEY = 'appearance';

export const applyAppearance = (m: AppearanceMode) => Appearance.setColorScheme(m === 'system' ? 'unspecified' : m);

/** Applies the saved choice once the database is open. */
export function AppearanceLoader() {
  const db = useSQLiteContext();
  useEffect(() => {
    getKv<AppearanceMode>(db, KEY).then((m) => m && applyAppearance(m));
  }, [db]);
  return null;
}

export function useAppearance(): [AppearanceMode, (m: AppearanceMode) => void] {
  const db = useSQLiteContext();
  const [mode, setMode] = useState<AppearanceMode>('system');
  useEffect(() => {
    getKv<AppearanceMode>(db, KEY).then((m) => m && setMode(m));
  }, [db]);
  return [
    mode,
    (m) => {
      setMode(m);
      applyAppearance(m);
      void setKv(db, KEY, m);
    },
  ];
}
