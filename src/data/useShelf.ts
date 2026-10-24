import { useMemo } from 'react';

import { products, shelfState, type Product, type ShelfState } from '@/logic/shelf';

import { useStore } from './store';

export type ShelfItem = { p: Product; st: ShelfState };

/** All products with their state, recomputed when ticks, routine or shelf records change. */
export function useShelf(): ShelfItem[] {
  const s = useStore();
  return useMemo(() => {
    if (!s) return [];
    return products(s.steps, s.shelf).map((p) => ({ p, st: shelfState(p, s.shelf[p.id], s.config, s.days) }));
  }, [s]);
}

/** Products running low or probably finished. */
export const lowItems = (items: ShelfItem[]) =>
  items
    .filter((x) => x.st.status === 'low' || x.st.status === 'empty')
    .sort((a, b) => (a.st.left ?? 0) - (b.st.left ?? 0));
