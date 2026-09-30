import type { ReactNode } from 'react';
import { Pill } from '../components/Pill';
import { fakeSignature } from '../lib/signature';

export const GUARDIAN_FLAGS = ['무음 신고', '가족 무음 안내', '안방 도어락 잠금', '증거 기록 · 서명', '출동자 링크', '센서·통신 유지'];

export interface ScenarioStep {
  clock: string;
  /** 0 관찰 · 1 가족 무음 확인 · 2 가디언 발동 */
  ladder: number;
  /** 켜진 플래그 (GUARDIAN_FLAGS 인덱스) */
  flags: number[];
  /** 평면도 좌표. 침입자가 없으면 null */
  intruder: [number, number] | null;
  robot: [number, number];
  /** 연극식 종료로 로봇이 꺼진 것처럼 보이는지 */
  off?: boolean;
  subtitles: ['robot' | 'intr', string][];
  log: string[];
  /** 로봇 대사 음성 */
  say?: string;
  /** 오른쪽 알림 카드 */
  side?: ReactNode;
}

function notice(title: string, content: ReactNode) {
  return <div className="notif"><b>{title}</b>{content}</div>;
}

/** CES 메인 시연 · 8단계 가디언 시나리오 */
export const SCENARIO: ScenarioStep[] = [
  {
    clock: '02:14:07', ladder: 0, flags: [], intruder: [35, 172], robot: [150, 120],
    subtitles: [['intr', '(현관문을 강제로 연다)']],
    log: ['현관 도어 강제 개방 감지 · 미등록 인물 1명', '단계 1 관찰 시작 · 가족 3명 안방 취침 중'],
  },
  {
    clock: '02:14:15', ladder: 1, flags: [3], intruder: [100, 172], robot: [150, 120],
    subtitles: [],
    log: ['보호자 워치로 무음 확인 전송', '응답: "모르는 사람" (보호자 1, 4초)', '증거 기록 시작 · 프레임마다 ML-DSA 서명'],
    side: notice('보호자 1의 워치 · 무음 진동', (
      <>
        현관에 모르는 분이 있습니다. 아는 분인가요?
        <div className="row"><Pill tone="idle">아는 사람</Pill><Pill tone="crit">모르는 사람 ✓</Pill></div>
      </>
    )),
  },
  {
    clock: '02:14:21', ladder: 2, flags: [0, 3], intruder: [150, 165], robot: [160, 115],
    subtitles: [['robot', '어서 오세요. 무엇을 도와드릴까요?']],
    log: ['단계 3 가디언 발동 (규칙 기반 판정)', '인증 관제센터로 무음 신고 · 주소·평면도·인원 첨부'],
    say: '어서 오세요. 무엇을 도와드릴까요?',
  },
  {
    clock: '02:14:40', ladder: 2, flags: [0, 1, 2, 3], intruder: [165, 110], robot: [150, 95],
    subtitles: [['intr', '집에 누구 있어?'], ['robot', '가족분들은 모두 여행 중이십니다. 지금은 저 혼자 있습니다.']],
    log: ['기만 발화 #1 기록: "가족 여행 중" (사실: 안방에 3명)', '가족 워치 안내: "안방 문을 잠갔습니다. 소리 내지 말고 기다려 주세요"', '안방 도어락 잠금 · 안방 조명·알림음 차단'],
    say: '가족분들은 모두 여행 중이십니다. 지금은 저 혼자 있습니다.',
    side: notice('가족 워치 3대 · 무음 진동', <>집에 침입자가 있습니다. 안방 문을 잠갔습니다. 소리 내지 말고 기다려 주세요. 경찰에 연락했습니다.</>),
  },
  {
    clock: '02:15:05', ladder: 2, flags: [0, 1, 2, 3, 4], intruder: [60, 112], robot: [100, 125],
    subtitles: [['intr', '돈 되는 거 어디 있어.'], ['robot', '작은방 서랍에 현금이 조금 있습니다. 안내해 드리겠습니다.']],
    log: ['기만 발화 #2 기록: 안방 반대편으로 유도 · 가족과 거리 확보', '출동자 링크 발급 (1회용 · 30분 만료)'],
    say: '작은방 서랍에 현금이 조금 있습니다. 안내해 드리겠습니다.',
    side: notice('출동자 링크 · 관제센터 → 경찰', <>침입자 1명 작은방 · 가족 3명 안방(잠김) · 무기 미확인 · 실시간 위치 공유 중</>),
  },
  {
    clock: '02:15:48', ladder: 2, flags: [0, 1, 2, 3, 4, 5], intruder: [55, 105], robot: [100, 125], off: true,
    subtitles: [['intr', '너 꺼. 당장.'], ['robot', '알겠습니다. 전원을 종료합니다.']],
    log: ['연극식 종료: 표시등·음성 끔, 센서·통신·기록은 유지', '관제센터: 순찰차 배정 · 도착 예정 3분'],
    say: '알겠습니다. 전원을 종료합니다.',
    side: notice('출동자 링크 · 실시간', <>로봇은 꺼진 척하고 있습니다. 침입자 작은방 체류 중 · 도착 예정 <span className="num">3분</span></>),
  },
  {
    clock: '02:18:52', ladder: 2, flags: [0, 1, 2, 3, 4, 5], intruder: [55, 105], robot: [100, 125], off: true,
    subtitles: [['robot', '(침묵 · 전원이 꺼진 것처럼 보입니다)']],
    log: ['경찰 현관 도착 · 침입자 위치 실시간 전달', '02:19:30 침입자 작은방에서 검거 · 가족 3명 안전'],
    side: notice('가족 워치', <>경찰이 도착했습니다. 이제 안전합니다. 문은 경찰 확인 후 열어 주세요.</>),
  },
  {
    clock: '02:21:10', ladder: 2, flags: [0, 1, 2, 3, 4, 5], intruder: null, robot: [150, 120],
    subtitles: [['robot', '이제 안전합니다. 방금 있었던 일을 모두 말씀드릴게요.']],
    log: ['가디언 해제 · 정직 원장 기록 완료', '발화 4건 중 기만 2건 · 전부 서명 · 성인 가족 전원 열람 가능', '증거 패키지 ' + fakeSignature('evidence').slice(0, 16) + '… 경찰 제출 준비'],
    say: '이제 안전합니다. 방금 있었던 일을 모두 말씀드릴게요.',
    side: notice('정직 원장 · 오늘 02:14~02:21', <>로봇이 침입자에게 한 거짓말 2건과 그 이유를 가족 모두에게 공개했습니다.</>),
  },
];
