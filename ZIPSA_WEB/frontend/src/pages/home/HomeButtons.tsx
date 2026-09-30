import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useHomeActions } from './homeContext';
import type { ActionId, TabId } from './homeContext';

interface ActButtonProps {
  act: ActionId;
  primary?: boolean;
  /** 실행 후 이동할 탭 */
  goTab?: TabId;
  children: ReactNode;
}

/** 시연 동작을 실행하는 버튼. "왜 E5?"를 제외하면 한 번만 눌린다. */
export function ActButton({ act, primary, goTab, children }: ActButtonProps) {
  const { runAction, showTab } = useHomeActions();
  const [used, setUsed] = useState(false);
  return (
    <button
      type="button"
      className={primary ? 'btn pri' : 'btn'}
      disabled={used}
      onClick={() => {
        if (act !== 'why-e5') setUsed(true);
        runAction(act);
        if (goTab) showTab(goTab);
      }}
    >
      {children}
    </button>
  );
}

export function TabButton({ tab, children }: { tab: TabId; children: ReactNode }) {
  const { showTab } = useHomeActions();
  return <button type="button" className="btn" onClick={() => showTab(tab)}>{children}</button>;
}

/** 가디언 시연 화면(/stage)으로 이동 */
export function StageButton({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  return <button type="button" className="btn pri" onClick={() => navigate('/stage')}>{children}</button>;
}
