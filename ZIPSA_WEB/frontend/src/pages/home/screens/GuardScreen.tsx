import { useState } from 'react';
import { Pill } from '../../../components/Pill';
import { fakeSignature } from '../../../lib/signature';
import { StageButton } from '../HomeButtons';

const PASSPHRASE = '"오늘 저녁은 미역국이야"';
const PASSPHRASE_MASK = '•••• ••• •••••';

/** 시연용 원장 기록 [시각, 내용] */
const LEDGER: [string, string][] = [
  ['2026-09-02 21:10', '정기 모의 훈련 · 발화 4건 (기만 2건)'],
  ['2026-08-14 03:22', '관찰 단계 → 해제 · 늦게 귀가한 가족으로 확인'],
  ['2026-07-30 11:05', '암호문 변경 · 보호자 1'],
];

export function GuardScreen({ active }: { active: boolean }) {
  const [showPass, setShowPass] = useState(false);

  return (
    <section className="screen" hidden={!active} aria-label="가디언">
      <div className="screen-title"><div className="eyebrow">가디언</div><h2>가디언 모드 설정</h2></div>

      <div className="panel">
        <div className="sw">
          <div>
            <h3>가디언 모드</h3>
            <div className="sm mut">현관·창문 센서 정상 · 미등록 인물 없음</div>
          </div>
          <Pill tone="good">대기 중</Pill>
        </div>
        <div className="ladder">
          <div><span><b>관찰</b> — 강제 개방, 미등록 얼굴, 비명·유리 깨지는 소리</span></div>
          <div><span><b>가족 무음 확인</b> — "현관에 모르는 분이 있습니다. 아는 분인가요?"</span></div>
          <div><span><b>발동</b> — 순응 연기, 무음 신고, 대피 안내, 증거 기록</span></div>
        </div>
        <div className="row"><StageButton>시연 보기</StageButton></div>
      </div>

      <div className="panel">
        <h3>가족 암호문</h3>
        <div className="sm mut">위협받는 상황에서 평범한 말처럼 들리는 문장입니다. 로봇이 들으면 조용히 발동합니다.</div>
        <div className="sw">
          <span className="num">{showPass ? PASSPHRASE : PASSPHRASE_MASK}</span>
          <button type="button" className="btn" onClick={() => setShowPass(v => !v)}>{showPass ? '가리기' : '보기'}</button>
        </div>
      </div>

      <div className="panel">
        <h3>신고 경로</h3>
        <div className="kv">
          <span>1차 · 인증 관제센터 (무음)</span><span>연결됨</span>
          <span>2차 · 112 문자 신고</span><span>준비됨</span>
          <span>가족 비상 연락</span><span>2명</span>
          <span>통신 백업</span><span>LTE · 배터리 6h</span>
        </div>
        <div className="sm mut">기기가 긴급번호로 직접 자동 발신하는 방식은 지역에 따라 제한됩니다. 관제센터가 검증 후 신고합니다.</div>
      </div>

      <div className="panel">
        <h3>정직 원장</h3>
        <div className="sm mut">가디언 모드의 모든 발동과 발화는 서명되어 남고, 성인 가족 전원이 볼 수 있습니다.</div>
        <div className="ledger">
          {LEDGER.map(([at, text]) => (
            <div key={at}>
              <span className="mut">{at}</span>
              <span>{text}</span>
              <span className="sig">ML-DSA 서명 {fakeSignature(at)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
