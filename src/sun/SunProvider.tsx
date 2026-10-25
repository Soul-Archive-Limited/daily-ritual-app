import * as Location from 'expo-location';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { deviceTz, useStore } from '@/data/store';
import { getKv, setKv } from '@/db/repo';
import { geoFromNetwork } from '@/sync/client';
import type { Place } from '@/db/types';

import { estimateDay, fetchSunDay, km, type SunDay } from './sun';

type Perm = 'unknown' | 'granted' | 'denied' | 'undetermined';

type SunCtx = {
  perm: Perm;
  loading: boolean;
  /** Ask for location (only from a tap on the Sun card). */
  askLocation: () => Promise<void>;
  /** Set a city by name. Stays until the phone's time zone changes. */
  setManual: (query: string) => Promise<boolean>;
  backToAuto: () => Promise<void>;
};

const Ctx = createContext<SunCtx | null>(null);
const CACHE_KEY = 'sun.cache';
const STALE_MS = 3 * 36e5;

/** Today's date on the device clock. */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** "TH" → "Thailand" (the server sends an ISO code). */
function countryName(code: string | null) {
  if (!code) return '';
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

async function cityFor(lat: number, lon: number) {
  try {
    const [r] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    // In some big cities iOS returns a district as the "city" (Bangkok → "Phra Nakhon District");
    // the region holds the real city name there.
    const city = r?.city && !/district|borough|ward|khet|amphoe/i.test(r.city) ? r.city : null;
    return { name: city ?? r?.region ?? r?.subregion ?? '', country: r?.country ?? '' };
  } catch {
    return { name: '', country: '' };
  }
}

/**
 * Location, time zone and sun follow the phone silently. Never prompts on a time-zone change.
 * The first permission request only happens when you tap "Use my location" on the Sun card.
 */
export function SunProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const s = useStore();
  const [perm, setPerm] = useState<Perm>('unknown');
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  // Latest store values for async work.
  const ref = useRef(s);
  useEffect(() => {
    ref.current = s;
  }, [s]);

  /** Update the saved place from GPS if it's automatic (or a manual one from another time zone). */
  const followPhone = useCallback(async (): Promise<Place | undefined> => {
    const st = ref.current!;
    const place = st.config.place;
    const tz = deviceTz();
    if (place?.manual && place.tz === tz) return place;

    let p = await Location.getForegroundPermissionsAsync();
    // Ask once, the first time the app opens without an answer, so the city and UV follow you from then on.
    if (!p.granted && p.canAskAgain && !(await getKv<boolean>(db, 'locAsked'))) {
      await setKv(db, 'locAsked', true);
      p = await Location.requestForegroundPermissionsAsync();
    }
    setPerm(p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied');
    if (!p.granted) {
      // Manual city from another time zone: fall back to automatic, keeping the last known point.
      if (place?.manual) {
        const next = { ...place, manual: false, tz };
        st.updateConfig({ place: next });
        return next;
      }
      // No GPS: an approximate city from the internet connection, refreshed when the time zone changes
      // or every few hours (neighbouring countries often share a time zone).
      if (!place?.lat || place.tz !== tz || Date.now() - (place.at ?? 0) > 4 * 36e5) {
        const g = await geoFromNetwork();
        if (g?.lat != null && g.lon != null) {
          const next: Place = {
            name: g.city || place?.name || 'Here',
            country: countryName(g.country),
            lat: g.lat,
            lon: g.lon,
            tz,
            at: Date.now(),
            manual: false,
          };
          st.updateConfig({ place: next });
          return next;
        }
      }
      return place;
    }

    const pos =
      (await Location.getLastKnownPositionAsync({ maxAge: 30 * 60e3 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null));
    if (!pos) return place;
    const here = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    if (place && !place.manual && place.name && place.lat != null && place.lon != null) {
      if (km({ lat: place.lat, lon: place.lon }, here) < 15 && place.tz === tz) return place;
    }
    const { name, country } = await cityFor(here.lat, here.lon);
    const next: Place = { name: name || place?.name || 'Here', country, ...here, tz, at: Date.now(), manual: false };
    st.updateConfig({ place: next });
    return next;
  }, [db]);

  /** Live UV for the place, cached for 3 hours; estimate when offline. */
  const loadSun = useCallback(
    async (place?: Place) => {
      const st = ref.current!;
      if (place?.lat == null || place?.lon == null) return st.setSun(null);
      const at = { lat: place.lat, lon: place.lon };
      const cached = await getKv<SunDay>(db, CACHE_KEY);
      const fresh =
        cached &&
        cached.live &&
        cached.date === today() &&
        km(cached, at) < 15 &&
        Date.now() - cached.fetchedAt < STALE_MS;
      if (fresh) return st.setSun(cached);
      try {
        const d = await fetchSunDay(at.lat, at.lon);
        await setKv(db, CACHE_KEY, d);
        st.setSun(d);
      } catch {
        const usable = cached && cached.date === today() && km(cached, at) < 15;
        st.setSun(usable ? cached : estimateDay(at.lat, at.lon, place.tz ?? deviceTz()));
      }
    },
    [db],
  );

  const refresh = useCallback(async () => {
    if (busy.current || !ref.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const place = await followPhone();
      await loadSun(place);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [followPhone, loadSun]);

  const ready = !!s;
  useEffect(() => {
    if (!ready) return;
    refresh();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && refresh());
    return () => sub.remove();
  }, [ready, refresh]);

  const askLocation = useCallback(async () => {
    const p = await Location.requestForegroundPermissionsAsync();
    setPerm(p.granted ? 'granted' : 'denied');
    if (p.granted) await refresh();
  }, [refresh]);

  const setManual = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q) return false;
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en`,
        );
        const j = (await res.json()) as {
          results?: { name: string; country?: string; latitude: number; longitude: number }[];
        };
        const r = j.results?.[0];
        if (!r) return false;
        const place: Place = {
          name: r.name,
          country: r.country ?? '',
          lat: r.latitude,
          lon: r.longitude,
          tz: deviceTz(),
          at: Date.now(),
          manual: true,
        };
        ref.current!.updateConfig({ place });
        await loadSun(place);
        return true;
      } catch {
        return false;
      }
    },
    [loadSun],
  );

  const backToAuto = useCallback(async () => {
    const st = ref.current!;
    if (st.config.place) st.updateConfig({ place: { ...st.config.place, manual: false, name: '' } });
    // Give the store a tick to save, then follow the phone again.
    setTimeout(refresh, 50);
  }, [refresh]);

  return <Ctx.Provider value={{ perm, loading, askLocation, setManual, backToAuto }}>{children}</Ctx.Provider>;
}

export function useSunControls() {
  return useContext(Ctx);
}
