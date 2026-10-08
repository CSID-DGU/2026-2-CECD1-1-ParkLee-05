import { useStore } from '../lib/store';
export type Mark = { id: string; x: number; y: number; color: string; r?: number; label?: string };
export function FloorPlan({ marks, unready }: { marks: Mark[]; unready?: boolean }) {
  const { meta } = useStore();
  return (
    <div className={`plan${unready ? ' unready' : ''}`}>
      <svg viewBox="-2 -2 324 204" role="img" aria-label="실내 지도">
        {meta?.rooms.map((r) => <g key={r.id}><rect className="room" x={r.x} y={r.y} width={r.w} height={r.h} /><text x={r.x + 8} y={r.y + 14}>{r.name}</text></g>)}
        {marks.map((m) => (<g key={m.id} className="mv" style={{ transform: `translate(${m.x}px,${m.y}px)` }}><circle r={m.r ?? 7} fill={m.color} stroke="var(--surface)" strokeWidth="2" />{m.label && <text x="10" y="3.5" style={{ fill: 'var(--ink)', fontWeight: 600 }}>{m.label}</text>}</g>))}
      </svg>
    </div>
  );
}
