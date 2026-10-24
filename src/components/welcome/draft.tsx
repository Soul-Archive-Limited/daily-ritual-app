import { createContext, useContext, useState, type ReactNode } from 'react';

import type { StarterId } from '@/data/starters';

/** What the person has chosen so far during setup. */
export type Draft = { name: string; washDays: number[]; starter: StarterId };

const Ctx = createContext<{ draft: Draft; set: (patch: Partial<Draft>) => void } | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>({ name: '', washDays: [1, 3, 5], starter: 'classic' });
  return <Ctx.Provider value={{ draft, set: (p) => setDraft((d) => ({ ...d, ...p })) }}>{children}</Ctx.Provider>;
}

export const useDraft = () => useContext(Ctx)!;
