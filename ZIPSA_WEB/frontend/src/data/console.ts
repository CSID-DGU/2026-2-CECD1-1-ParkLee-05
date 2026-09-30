import type { Tone } from '../components/Pill';

export type IncidentSeverity = 'crit' | 'warn' | 'idle';

export interface Incident {
  id: number;
  unit: number;
  severity: IncidentSeverity;
  title: string;
  summary: string;
  action: string;
}

/** 시연용 예시 데이터 */
export const INCIDENTS: Incident[] = [
  { id: 1, unit: 41, severity: 'crit', title: '시니어 세대 · 활동 단절 5시간 10분', summary: '평소 이 시각까지 냉장고 문 열림 19회, 오늘 0회. 로봇이 말을 걸었지만 응답이 없습니다.', action: '보호자 연결' },
  { id: 2, unit: 8, severity: 'warn', title: 'D4 충돌 후 작업 중단 · 작은방', summary: '3.2G 충격, 장애물은 빨래 바구니로 추정. 같은 세대의 E5가 대기 중이고 배터리 91%입니다.', action: 'E5로 재할당' },
  { id: 3, unit: 24, severity: 'warn', title: 'CO₂ 2,480ppm · 90분째', summary: '창문이 모두 닫혀 있고 조리 중입니다. 단지 전체로 보면 2,000ppm을 넘는 날이 52.5%입니다.', action: '환기 제안 보내기' },
  { id: 4, unit: 13, severity: 'idle', title: '허브 연결 끊김 3일째', summary: '2024년 말까지 보고를 유지한 기기는 57.4%였습니다. 이탈하기 전에 점검 안내가 필요합니다.', action: '점검 안내 발송' },
];

export const SEVERITY_LABEL: Record<IncidentSeverity, string> = { crit: '즉시 확인', warn: '주의', idle: '연결 끊김' };
export const SEVERITY_TONE: Record<IncidentSeverity, Tone> = { crit: 'crit', warn: 'warn', idle: 'idle' };

/** 사건과 무관하게 연결이 끊긴 세대 */
export const OFFLINE_UNITS = [31, 45];

/** [기존 기능, 대화 도구, 질문 예시] */
export const FEATURE_MAP: [string, string, string][] = [
  ['F-03 실시간 상태 수집', 'get_robot_state', '"로봇들 지금 뭐 해?"'],
  ['F-04 이상 징후 감지', 'explain_incident', '"D4 왜 멈췄어?"'],
  ['F-05 원격 명령', 'send_command (승인 필요)', '"치웠어, 다시 해"'],
  ['F-07 · F-19 작업·KPI', 'summarize_tasks', '"오늘 집 어땠어?"'],
  ['F-08 · F-09 스케줄', 'plan_schedule', '"내일 아침 빨래 돌려줘"'],
  ['F-10 · F-11 다중 로봇 조율', '로봇 단톡방', '"@E5 작은방 정리 부탁해"'],
  ['F-13 · F-14 로그', 'search_log', '"어제 3시에 거실에서 무슨 일 있었어?"'],
  ['F-15 컨텍스트 분석', '리듬 엔진', '(먼저 제안) "토요일 아침 빨래, 돌려둘까요?"'],
  ['F-02 · F-16 · F-17 보안', '화자 권한 · 정직 원장', '(자동) 아이 목소리로는 인덕션이 켜지지 않음'],
];
