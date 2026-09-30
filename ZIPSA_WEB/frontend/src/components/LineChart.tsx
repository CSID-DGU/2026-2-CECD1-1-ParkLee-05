import { useState } from 'react';
import type { MouseEvent, TouchEvent } from 'react';

interface Series {
  name: string;
  color: string;
  values: number[];
}

interface LineChartProps {
  aria: string;
  labels: string[];
  labelSuffix?: string;
  /** x축 라벨을 몇 칸마다 표시할지 */
  xEvery: number;
  yMax: number;
  ticks: number[];
  yFormat: (v: number) => string;
  threshold?: { value: number; label: string };
  series: Series[];
}

const W = 340, H = 158, L = 34, R = 8, T = 10, B = 20;
const IW = W - L - R, IH = H - T - B;

/** 마우스·터치로 시간별 값을 보여 주는 선 차트 */
export function LineChart({ aria, labels, labelSuffix = '', xEvery, yMax, ticks, yFormat, threshold, series }: LineChartProps) {
  const [hover, setHover] = useState<{ i: number; w: number; h: number } | null>(null);
  const n = labels.length;
  const X = (i: number) => L + (IW * i) / (n - 1);
  const Y = (v: number) => T + IH * (1 - v / yMax);

  function track(clientX: number, svg: SVGSVGElement) {
    const r = svg.getBoundingClientRect();
    const i = Math.round((((clientX - r.left) / r.width) * W - L) / IW * (n - 1));
    setHover({ i: Math.max(0, Math.min(n - 1, i)), w: r.width, h: r.height });
  }
  const onMouse = (e: MouseEvent<SVGSVGElement>) => track(e.clientX, e.currentTarget);
  const onTouch = (e: TouchEvent<SVGSVGElement>) => track(e.touches[0].clientX, e.currentTarget);

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} onMouseMove={onMouse} onMouseLeave={() => setHover(null)} onTouchStart={onTouch} onTouchMove={onTouch}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke="var(--line)" />
            <text x={L - 5} y={Y(t) + 3} textAnchor="end">{yFormat(t)}</text>
          </g>
        ))}
        {labels.map((l, i) => i % xEvery === 0 && <text key={i} x={X(i)} y={H - 5} textAnchor="middle">{l}</text>)}
        {threshold && (
          <>
            <line x1={L} x2={W - R} y1={Y(threshold.value)} y2={Y(threshold.value)} stroke="var(--crit)" strokeDasharray="4 3" />
            <text x={W - R} y={Y(threshold.value) - 4} textAnchor="end" style={{ fill: 'var(--crit)' }}>{threshold.label}</text>
          </>
        )}
        {series.map(s => (
          <polyline key={s.name} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
            points={s.values.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')} />
        ))}
        {hover && (
          <>
            <line x1={X(hover.i)} x2={X(hover.i)} y1={T} y2={T + IH} stroke="var(--muted)" />
            {series.map(s => <circle key={s.name} cx={X(hover.i)} cy={Y(s.values[hover.i])} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />)}
          </>
        )}
        <rect x={L} y={T} width={IW} height={IH} fill="transparent" style={{ cursor: 'crosshair' }} />
      </svg>
      {hover && (
        <div className="tip" style={{ left: Math.max(60, Math.min(hover.w - 60, (X(hover.i) / W) * hover.w)), top: (T / H) * hover.h + 6 }}>
          {labels[hover.i] + labelSuffix + ' · ' + series.map(s => s.name + ' ' + yFormat(s.values[hover.i])).join(' / ')}
        </div>
      )}
    </div>
  );
}
