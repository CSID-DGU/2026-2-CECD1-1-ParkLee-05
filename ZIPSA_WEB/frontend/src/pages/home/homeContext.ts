import { createContext, useContext } from 'react';

export type TabId = 'chat' | 'group' | 'rhythm' | 'care' | 'guard';

export const TAB_IDS: TabId[] = ['chat', 'group', 'rhythm', 'care', 'guard'];

export function isTabId(value: string | undefined): value is TabId {
  return (TAB_IDS as (string | undefined)[]).includes(value);
}

/** 탭마다 경로가 따로 있다 (/home/chat, /home/group …) */
export const tabPath = (tab: TabId) => `/home/${tab}`;

const TAB_STORAGE_KEY = 'zipsa.tab';

/** 마지막으로 본 탭. /home으로 들어오면 이 탭으로 보낸다. */
export function loadTab(): TabId {
  try {
    const saved = localStorage.getItem(TAB_STORAGE_KEY) ?? undefined;
    if (isTabId(saved)) return saved;
  } catch {
    // 저장소를 쓸 수 없는 환경
  }
  return 'chat';
}

export function saveTab(tab: TabId) {
  try {
    localStorage.setItem(TAB_STORAGE_KEY, tab);
  } catch {
    // 저장소를 쓸 수 없는 환경
  }
}

export type SpeakerId = 'guardian' | 'child' | 'guest';

/** 가족 앱 화자와 권한 등급 (UX Flow 5장 권한표) */
export const SPEAKERS: { id: SpeakerId; label: string; level: string }[] = [
  { id: 'guardian', label: '보호자', level: '권한 전체' },
  { id: 'child', label: '아이', level: '제한' },
  { id: 'guest', label: '손님', level: '조회만' },
];

export function speakerOf(id: SpeakerId) {
  return SPEAKERS.find(s => s.id === id) ?? SPEAKERS[0];
}

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
