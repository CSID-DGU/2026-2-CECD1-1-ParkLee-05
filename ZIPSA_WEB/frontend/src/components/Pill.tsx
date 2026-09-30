import type { ReactNode } from 'react';

export type Tone = 'good' | 'warn' | 'crit' | 'idle';

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
