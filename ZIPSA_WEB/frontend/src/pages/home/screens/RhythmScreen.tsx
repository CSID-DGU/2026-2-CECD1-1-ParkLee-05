import { useState } from 'react';
import { LineChart } from '../../../components/LineChart';
import { Pill } from '../../../components/Pill';
import { Toggle } from '../../../components/Toggle';
import { useToast } from '../../../components/toast';
import { COMMONALITY, RHYTHM } from '../../../data/rhythm';
import { corr, peak } from '../../../lib/stats';

const DEVICES = Object.keys(RHYTHM);
const HOURS = Array.from({ length: 24 }, (_, i) => String(i));

/** 공통성·안정성 축(0.4~1.0) 위의 위치(%) */
const axisPos = (v: number) => ((v - 0.4) / 0.6) * 100;

/** 부재 위장 재현 계획: 값이 클수록 진하게 */
function SimCells({ values }: { values: number[] }) {
  const max = Math.max(...values);
  return <>{values.map((v, i) => <i key={i} style={{ opacity: v ? 0.18 + (0.82 * v) / max : 0.06 }} />)}</>;
}

const LIGHT_PLAN = RHYTHM['냉장고'].home.map((v, i) => (i >= 18 || i <= 0 || (i >= 6 && i <= 8) ? v : 0));
const TV_PLAN = RHYTHM['TV'].home.map((v, i) => (i >= 19 && i <= 23 ? v : 0));

interface RhythmScreenProps {
  active: boolean;
  awayMode: boolean;
  onAwayModeChange: (on: boolean) => void;
}

export function RhythmScreen({ active, awayMode, onAwayModeChange }: RhythmScreenProps) {
  const toast = useToast();
  const [device, setDevice] = useState('세탁기');
  const d = RHYTHM[device];
  const max = Math.max(...d.all, ...d.home);
  const yMax = max > 16 ? 24 : max > 12 ? 16 : 12;
  const r = corr(d.all, d.home);

  return (
    <section className="screen" hidden={!active} aria-label="리듬">
      <div className="screen-title"><div className="eyebrow">리듬</div><h2>이 집의 생활 리듬</h2></div>

      <div className="panel">
        <h3>이 집의 24시간 리듬</h3>
        <div className="devsel">
          {DEVICES.map(name => (
            <button key={name} type="button" aria-pressed={name === device} onClick={() => setDevice(name)}>{name}</button>
          ))}
        </div>
        <div className="legend">
          <span><i style={{ background: 'var(--s1)' }} />전체 세대 평균</span>
          <span><i style={{ background: 'var(--s2)' }} />우리 집</span>
        </div>
        <LineChart
          aria={device + ' 시간대별 사용 비중'}
          labels={HOURS}
          labelSuffix="시"
          xEvery={3}
          yMax={yMax}
          ticks={[0, yMax / 2, yMax]}
          yFormat={v => +v.toFixed(1) + '%'}
          series={[{ name: '평균', color: 'var(--s1)', values: d.all }, { name: '우리 집', color: 'var(--s2)', values: d.home }]}
        />
        <div className="sm">
          우리 집 피크 <b className="num">{peak(d.home)}시</b> · 전체 평균 피크 <b className="num">{peak(d.all)}시</b> · 닮은 정도 <b className="num">r={r.toFixed(2)}</b>
          <br />
          {r >= 0.7
            ? <><Pill tone="good">공통 모델로 충분</Pill> 첫날부터 방해되지 않는 시간을 압니다.</>
            : <><Pill tone="warn">이 집만의 습관</Pill> 공통 모델이 틀리는 영역이라 이 집 데이터로 배웁니다.</>}
        </div>
        <details>
          <summary>표로 보기</summary>
          <div className="tablewrap">
            <table>
              <thead><tr><th>시</th><th>평균 %</th><th>우리 집 %</th></tr></thead>
              <tbody>
                {d.all.map((v, i) => <tr key={i}><td>{i}</td><td>{v.toFixed(1)}</td><td>{d.home[i].toFixed(1)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      <div className="panel">
        <h3>어디까지 공통 모델로 되고, 어디부터 배워야 하나</h3>
        <div className="legend">
          <span><i style={{ background: 'var(--s1)', height: 8, width: 8, borderRadius: '50%' }} />공통성 (다른 집과 닮은 정도)</span>
          <span><i style={{ background: 'var(--s2)', height: 8, width: 8, borderRadius: '50%' }} />안정성 (그 집 안에서 꾸준한 정도)</span>
        </div>
        <div className="db">
          {COMMONALITY.map(([name, common, stable]) => [
            <span key={name + 'n'}>{name}</span>,
            <div key={name + 't'} className="track" title={`공통성 ${common} · 안정성 ${stable}`}>
              <div className="bar" style={{ left: axisPos(common) + '%', width: axisPos(stable) - axisPos(common) + '%' }} />
              <div className="d" style={{ left: axisPos(common) + '%', background: 'var(--s1)' }} />
              <div className="d" style={{ left: axisPos(stable) + '%', background: 'var(--s2)' }} />
            </div>,
            <span key={name + 'g'} className="gain">+{(stable - common).toFixed(2)}</span>,
          ])}
          <span />
          <div className="num mut" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}><span>0.4</span><span>0.7</span><span>1.0</span></div>
          <span className="gain mut" style={{ fontSize: 10 }}>여지</span>
        </div>
        <div className="sm mut">간격이 넓을수록 그 집만의 습관이 뚜렷합니다. 재실 리듬은 집마다 완전히 다르지만(0.46) 한 집 안에서는 꾸준해서(0.80) 몇 주면 배웁니다.</div>
      </div>

      <div className="panel">
        <div className="sw">
          <div>
            <h3>진짜 같은 부재 위장</h3>
            <div className="sm mut">외출 중 이 집의 실제 리듬대로 조명과 TV를 움직입니다</div>
          </div>
          <Toggle
            checked={awayMode}
            label="외출 모드"
            onChange={on => {
              onAwayModeChange(on);
              toast(on ? '외출 모드를 켰어요' : '외출 모드를 껐어요');
            }}
          />
        </div>
        <div hidden={!awayMode}>
          <div className="simrow"><span>조명</span><SimCells values={LIGHT_PLAN} /></div>
          <div className="simrow" style={{ marginTop: 3 }}><span>TV</span><SimCells values={TV_PLAN} /></div>
          <div className="simrow num" style={{ marginTop: 2 }}>
            <span />
            {HOURS.map((_, i) => <span key={i} style={{ textAlign: 'center', fontSize: 8.5 }}>{i % 6 === 0 ? i : ''}</span>)}
          </div>
          <div className="sm mut" style={{ marginTop: 4 }}>진할수록 켜질 가능성이 높은 시간대 · 매일 조금씩 다르게 재현</div>
        </div>
      </div>
    </section>
  );
}
