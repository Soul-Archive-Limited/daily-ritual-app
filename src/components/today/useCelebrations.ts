import { router, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getKv, setKv } from '@/db/repo';
import type { Rewards } from '@/logic/rewards';

type Seen = { rituals: string[]; badges: string[]; level: number };
const KEY = 'rewardsSeen';

/**
 * Opens the celebration screen when a routine is finished today, a level is reached or a badge is earned.
 * Each one shows once. On the first run everything already earned counts as seen, so nothing floods in.
 */
export function useCelebrations(r: Rewards | null) {
  const db = useSQLiteContext();
  const seen = useRef<Seen | null>(null);
  const busy = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [focusTick, setFocusTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      busy.current = false;
      setFocusTick((n) => n + 1);
    }, []),
  );

  useEffect(() => {
    if (!r || loaded) return;
    getKv<Seen>(db, KEY).then((v) => {
      seen.current = v ?? {
        rituals: r.today.rituals.map((id) => `${r.today.k}:${id}`),
        badges: r.badges.filter((b) => b.got).map((b) => b.id),
        level: r.level.n,
      };
      if (!v) setKv(db, KEY, seen.current);
      setLoaded(true);
    });
  }, [r, loaded, db]);

  useEffect(() => {
    const st = seen.current;
    if (!r || !st || busy.current) return;
    const t = r.today;
    const ritual = t.rituals.find((id) => !st.rituals.includes(`${t.k}:${id}`));
    const badge = r.badges.find((b) => b.got && !st.badges.includes(b.id));
    let href: Href | null = null;
    if (ritual) {
      st.rituals = [...st.rituals.slice(-60), `${t.k}:${ritual}`];
      href = { pathname: '/celebrate', params: { kind: 'ritual', slot: ritual } };
    } else if (r.level.n > st.level) {
      st.level = r.level.n;
      href = { pathname: '/celebrate', params: { kind: 'level' } };
    } else if (badge) {
      st.badges = [...st.badges, badge.id];
      href = { pathname: '/celebrate', params: { kind: 'badge', id: badge.id } };
    } else if (r.level.n < st.level) {
      // Unticking can drop a level; don't celebrate it twice when it comes back.
      st.level = r.level.n;
    }
    if (!href) return;
    busy.current = true;
    setKv(db, KEY, st);
    const go = href;
    const id = setTimeout(() => router.push(go), 550);
    return () => clearTimeout(id);
  }, [r, loaded, focusTick, db]);
}
