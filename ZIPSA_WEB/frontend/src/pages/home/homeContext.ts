import { createContext, useContext } from 'react';

export type TabId = 'chat' | 'group' | 'rhythm' | 'care' | 'guard';

export const TAB_IDS: TabId[] = ['chat', 'group', 'rhythm', 'care', 'guard'];

/** 대화 카드의 버튼으로 실행하는 시연 동작 */
export type ActionId = 'd4-handoff' | 'd4-resume' | 'why-e5' | 'approve-task' | 'vent-on' | 'laundry-yes' | 'away-on';

interface HomeActions {
  runAction: (action: ActionId) => void;
  showTab: (tab: TabId) => void;
}

export const HomeContext = createContext<HomeActions | null>(null);

/** 대화 카드처럼 깊이 들어간 컴포넌트에서 가족 앱 동작을 호출할 때 사용 */
export function useHomeActions() {
  const actions = useContext(HomeContext);
  if (!actions) throw new Error('useHomeActions는 HomeContext 안에서만 사용할 수 있습니다');
  return actions;
}
