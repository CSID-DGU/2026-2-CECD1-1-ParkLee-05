import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Select } from './Select';

const SURFACES = [
  { value: '/home', label: '가족 앱' },
  { value: '/console', label: '관제 콘솔' },
  { value: '/stage', label: '가디언 시연' },
];

interface PageHeaderProps {
  /** 화면 전환 옆에 붙는 화면별 컨트롤 (가족 앱의 화자 선택 등) */
  children?: ReactNode;
  className?: string;
}

/** 모든 화면 공통 상단 바: 브랜드 표시 + 가족 앱 / 관제 콘솔 / 가디언 시연 전환.
    좁은 화면에서는 화면 전환을 드롭다운으로 바꿔 한 줄에 둔다. */
export function PageHeader({ children, className }: PageHeaderProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = SURFACES.find(s => pathname.startsWith(s.value))?.value ?? SURFACES[0].value;

  return (
    <header className={className ? `top ${className}` : 'top'}>
      <div className="brand"><b>ZIPSA</b><span>집사 · 홈 휴머노이드 관제 (가칭, 시연용)</span></div>
      <div className="top-ctl">
        {children}
        <div className="seg top-seg" role="group" aria-label="화면 선택">
          {SURFACES.map(s => (
            <button key={s.value} type="button" aria-pressed={current === s.value} onClick={() => navigate(s.value)}>
              {s.label}
            </button>
          ))}
        </div>
        <Select className="top-select" label="화면 선택" value={current} options={SURFACES} onChange={v => navigate(v)} />
      </div>
    </header>
  );
}
