import { useEffect, useState } from 'react';
import { LineChart } from '../../../components/LineChart';
import { Pill } from '../../../components/Pill';
import { useToast } from '../../../components/toast';
import { CO2_HOURS, CO2_VALUES } from '../../../data/rhythm';
import { ActButton } from '../HomeButtons';

/** 오늘 값과 평소 이 시각 기준선을 함께 보여 주는 막대 */
function MeterRow({ label, value, base, max, unit }: { label: string; value: number; base: number; max: number; unit: string }) {
  return (
    <div>
      <div className="kv"><span>{label}</span><span>{value}{unit} <span className="mut">/ 평소 {base}</span></span></div>
      <div className="meter"><i style={{ width: (value / max) * 100 + '%' }} /><em style={{ left: (base / max) * 100 + '%' }} /></div>
    </div>
  );
}

const LADDER = [
  '로봇이 먼저 말을 겁니다 — "어머니, 점심 드셨어요?"',
  '2분간 응답이 없으면 보호자에게 알립니다',
  '보호자도 닿지 않으면 관제센터가 방문을 요청합니다',
];
/** 활동 단절 시뮬레이션에서 각 단계가 켜지는 시점(ms) */
const LADDER_DELAYS = [300, 1700, 3100];

export function CareScreen({ active }: { active: boolean }) {
  const toast = useToast();
  const [alert, setAlert] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!alert) return;
    const timers = LADDER_DELAYS.map((delay, i) => setTimeout(() => {
      setStep(i + 1);
      if (i === 1) toast('보호자 알림: 어머니 댁 활동이 5시간째 없습니다');
    }, delay));
    return () => timers.forEach(clearTimeout);
  }, [alert, toast]);

  return (
    <section className="screen" hidden={!active} aria-label="안부">
      <div className="screen-title"><div className="eyebrow">안부</div><h2>카메라 없는 안부</h2></div>

      <div className="panel">
        <div className="sw">
          <div>
            <h3>어머니 댁</h3>
            <div className="sm mut">시니어 1인 세대 · 카메라 없음 · 가전 사용 기록만 봅니다</div>
          </div>
          <Pill tone={alert ? 'crit' : 'good'}>{alert ? '활동 단절' : '평소와 같음'}</Pill>
        </div>
        <MeterRow label="냉장고 문 열림" value={alert ? 0 : 22} base={24} max={40} unit="회" />
        <MeterRow label="쿡탑 사용" value={alert ? 0 : 2} base={2.6} max={6} unit="회" />
        <div className="kv"><span>마지막 활동</span><span>{alert ? '5시간 10분 전 · 07:40' : '12분 전 · 냉장고'}</span></div>
        <div className="sm mut">세로선은 평소 이 시각까지의 값입니다. 시니어 세대의 기준선은 하루 36.5회(리포트 실측)로, 재택 시간이 길어 일반 세대보다 높습니다.</div>
      </div>

      <div className="panel">
        <h3>응답이 없을 때의 순서</h3>
        <div className="ladder">
          {LADDER.map((text, i) => <div key={i} className={i < step ? (i === 2 ? 'hot' : 'on') : ''}>{text}</div>)}
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setAlert(a => !a);
            setStep(0);
          }}
        >
          {alert ? '평소 상태로 되돌리기' : '활동 단절 상황 보기'}
        </button>
      </div>

      <div className="panel">
        <h3>안방 공기 · 간밤 CO₂</h3>
        <LineChart
          aria="간밤 안방 CO₂ 농도"
          labels={CO2_HOURS}
          labelSuffix="시"
          xEvery={2}
          yMax={3000}
          ticks={[0, 1000, 2000, 3000]}
          yFormat={v => Math.round(v).toLocaleString() + 'ppm'}
          threshold={{ value: 2000, label: '2,000ppm' }}
          series={[{ name: 'CO₂', color: 'var(--s1)', values: CO2_VALUES }]}
        />
        <div className="sm mut">예시 곡선입니다. 리포트에서 일중 최대값의 중앙값은 2,652ppm, 2,000ppm을 넘는 날이 52.5%였습니다.</div>
        <div className="row"><ActButton act="vent-on" goTab="chat" primary>오늘 밤부터 자동 환기</ActButton></div>
      </div>
    </section>
  );
}
