export interface PlanMark {
  id: string;
  x: number;
  y: number;
  color: string;
  r?: number;
  label?: string;
  hidden?: boolean;
}

const ROOM_LABELS: [string, number, number][] = [
  ['주방', 8, 14], ['작은방', 8, 94], ['현관', 8, 154], ['거실', 118, 14], ['안방', 228, 14], ['욕실', 228, 124],
];

/** 세대 평면도 (좌표 0~320 × 0~200). 표시(mark)는 위치가 바뀌면 부드럽게 이동한다. */
export function FloorPlan({ marks }: { marks: PlanMark[] }) {
  return (
    <svg viewBox="-2 -2 324 204" role="img" aria-label="집 평면도">
      <rect className="room" x="0" y="0" width="110" height="80" />
      <rect className="room" x="0" y="80" width="110" height="60" />
      <rect className="room" x="0" y="140" width="70" height="60" />
      <polygon className="room" points="110,0 220,0 220,200 70,200 70,140 110,140" />
      <rect className="room" x="220" y="0" width="100" height="110" />
      <rect className="room" x="220" y="110" width="100" height="90" />
      {ROOM_LABELS.map(([name, x, y]) => <text key={name} x={x} y={y}>{name}</text>)}
      {marks.map(m => (
        <g key={m.id} className="mv" style={{ transform: `translate(${m.x}px,${m.y}px)` }} visibility={m.hidden ? 'hidden' : undefined}>
          <circle r={m.r ?? 6} fill={m.color} stroke="var(--surface)" strokeWidth={2} />
          {m.label && <text x="9" y="3.5" style={{ fill: 'var(--ink)', fontWeight: 600 }}>{m.label}</text>}
        </g>
      ))}
    </svg>
  );
}
