import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Chips, Composer } from '../../components/Composer';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { Thread, Typing } from '../../components/Thread';
import { useToast } from '../../components/toast';
import { useMessages } from '../../components/useMessages';
import { FEATURE_MAP, INCIDENTS, OFFLINE_UNITS, SEVERITY_LABEL, SEVERITY_TONE } from '../../data/console';
import type { IncidentSeverity } from '../../data/console';
import { pad } from '../../lib/format';
import '../../styles/console.css';

const UNIT_COUNT = 53;

const KPI_STATIC: [string, string][] = [
  ['53', '연결 세대'], ['131 / 148', '가동 중 로봇'], ['1,204', '오늘 작업'], ['94.1%', '작업 성공률 (목표 96%)'],
];

const COPILOT_SUGGESTIONS = ['지금 가장 급한 건?', '로봇청소기 알람율은?', '성공률이 왜 떨어졌어?'];
const COPILOT_FALLBACK = '이 시연에서는 급한 사건, 로봇청소기 알람율, 작업 성공률, CO₂, 가디언에 대해 답할 수 있어요.';

/** 코파일럿 준비된 답변 [질문 패턴, 답변] */
const COPILOT_REPLIES: [RegExp, ReactNode][] = [
  [/급한|우선|먼저/, <p key="0">가장 급한 건 <b>세대 41</b>입니다. 시니어 1인 세대인데 5시간 넘게 가전 사용이 없고 로봇의 말 걸기에도 응답이 없습니다. 보호자 연결을 먼저 하세요. 나머지 3건은 30분 안에 처리해도 됩니다.</p>],
  [/알람|청소기|끼임|신뢰/, <p key="1">963일 실측 기준으로 로봇청소 시작 <span className="num">13,928</span>건 중 알람이 <span className="num">4,462</span>건, <b>3.1회에 1회</b>꼴입니다. 세대별 중앙값은 30.6%, 최악 세대는 74.9%입니다. 같은 평면이어도 살림 배치에 따라 난이도가 크게 갈리므로, 알람율 상위 세대부터 "자주 막히는 곳" 지도를 만드는 걸 권합니다.</p>],
  [/성공률|실패|떨어/, <p key="2">오늘 성공률은 94.1%로 목표보다 1.9%p 낮습니다. 실패의 절반이 <b>저조도 구간 이동</b>에서 나왔습니다. 실내 조도는 하루 최대값의 중앙값이 20lux에 불과하므로, 이동 전에 조명을 먼저 켜는 규칙을 적용해 보세요.</p>],
  [/co2|co₂|환기|공기/i, <p key="3">지금 CO₂ 2,000ppm을 넘은 세대는 4곳이고, 90분 이상 지속된 곳은 세대 24 한 곳입니다. 단지 전체로는 2,000ppm을 넘는 날이 52.5%여서, 취침 시간대 자동 환기를 기본값으로 제안할 만합니다.</p>],
  [/가디언|침입|보안/, <p key="4">현재 가디언 발동은 0건입니다. 이번 달 관찰 단계 진입은 7건이었고 모두 가족 확인으로 해제됐습니다. 발동 시에는 이 콘솔에 출동자 링크와 같은 화면이 뜹니다.</p>],
];

/** 세대 상세에 쓰는 시연용 의사 난수 (세대 번호가 같으면 항상 같은 값) */
function seeded(i: number) {
  const x = Math.sin(i * 99.13) * 10000;
  return x - Math.floor(x);
}

function unitType(n: number) {
  return n <= 35 ? '일반' : n <= 47 ? '특별(시니어·1인·장애인·신혼)' : '관리';
}

/** 관제 콘솔 (/console) */
export default function ConsolePage() {
  const toast = useToast();
  const [view, setView] = useState<'live' | 'map'>('live');
  const [resolved, setResolved] = useState<number[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const copilot = useMessages([
    { av: 'AI', body: <p>미처리 사건 4건 중 <b>즉시 확인 1건</b>이 있습니다. 세대 41의 활동 단절입니다.</p> },
  ]);

  useEffect(() => { document.title = 'ZIPSA · 관제 콘솔'; }, []);

  const unitState: Record<number, IncidentSeverity> = {};
  INCIDENTS.forEach(i => { if (!resolved.includes(i.id)) unitState[i.unit] = i.severity; });
  OFFLINE_UNITS.forEach(u => { unitState[u] = 'idle'; });
  const openCount = INCIDENTS.length - resolved.length;
  const kpis = [...KPI_STATIC, [String(openCount), '미처리 사건'], ['0', '가디언 발동']];

  function sendCopilot(question: string) {
    copilot.add({ me: true, body: question });
    const hit = COPILOT_REPLIES.find(([pattern]) => pattern.test(question));
    const id = copilot.add({ av: 'AI', body: <Typing /> });
    setTimeout(() => copilot.update(id, hit ? hit[1] : COPILOT_FALLBACK), hit ? 600 : 50);
  }

  const selectedState = selectedUnit !== null ? unitState[selectedUnit] : undefined;

  return (
    <div className="wrap">
      <PageHeader />
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div><div className="eyebrow">단지 운영자용 웹 콘솔</div><h2>에코델타 스마트빌리지 · 53세대</h2></div>
        <div className="seg" role="group" aria-label="콘솔 화면">
          <button type="button" aria-pressed={view === 'live'} onClick={() => setView('live')}>단지 현황</button>
          <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>기능 맵</button>
        </div>
      </div>

      <div className="cgrid">
        <div style={{ display: 'grid', gap: 16 }} hidden={view !== 'live'}>
          <div className="kpis">
            {kpis.map(([value, label]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}
          </div>

          <div className="panel">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3>세대 현황</h3>
              <div className="row sm"><Pill tone="good">정상</Pill><Pill tone="warn">주의</Pill><Pill tone="crit">즉시 확인</Pill><Pill tone="idle">연결 끊김</Pill></div>
            </div>
            <div className="units">
              {Array.from({ length: UNIT_COUNT }, (_, i) => {
                const n = i + 1, s = unitState[n];
                return (
                  <button key={n} type="button" className={'u ' + (s === 'idle' ? 'off' : s ?? '')} aria-pressed={selectedUnit === n}
                    aria-label={`세대 ${n} ${s ? SEVERITY_LABEL[s] : '정상'}`} onClick={() => setSelectedUnit(n)}>
                    {pad(n)}
                  </button>
                );
              })}
            </div>
            <div className="sm mut">
              {selectedUnit === null ? '세대를 누르면 상세가 표시됩니다.' : (
                <>
                  <b style={{ color: 'var(--ink)' }}>세대 {pad(selectedUnit)}</b>
                  {` · ${unitType(selectedUnit)} · 로봇 ${2 + Math.floor(seeded(selectedUnit) * 3)}대 · 오늘 작업 ${12 + Math.floor(seeded(selectedUnit + 7) * 20)}건 · 로봇청소 알람율 ${Math.round(seeded(selectedUnit + 3) * 75)}% · 상태 ${selectedState ? SEVERITY_LABEL[selectedState] : '정상'}`}
                </>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3>사건 대기열</h3>
              <span className="sm mut">AI가 심각도순으로 정렬하고 조치를 제안합니다</span>
            </div>
            <div className="q">
              {INCIDENTS.map(inc => {
                const done = resolved.includes(inc.id);
                return (
                  <div key={inc.id} className={done ? 'qi done' : 'qi'}>
                    <header>
                      <b>세대 {pad(inc.unit)} · {inc.title}</b>
                      <Pill tone={done ? 'good' : SEVERITY_TONE[inc.severity]}>{done ? '처리됨' : SEVERITY_LABEL[inc.severity]}</Pill>
                    </header>
                    <div className="ai"><b>AI 요약</b> · {inc.summary}</div>
                    <div className="row">
                      <button type="button" className="btn pri" disabled={done} onClick={() => {
                        setResolved(r => [...r, inc.id]);
                        toast(`세대 ${pad(inc.unit)} · ${inc.action} 완료`);
                      }}>
                        {inc.action}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="panel" hidden={view !== 'map'}>
          <h3>기존 기능(F-01~F-19)이 대화 도구로 연결되는 방식</h3>
          <p className="sm mut" style={{ margin: 0 }}>기존 관제 플랫폼은 그대로 백엔드로 남고, 대화 에이전트가 각 기능을 도구로 호출합니다.</p>
          <div className="tablewrap">
            <table className="fmap">
              <thead><tr><th>기존 기능</th><th>대화 도구</th><th>이렇게 묻습니다</th></tr></thead>
              <tbody>
                {FEATURE_MAP.map(([feature, tool, ask]) => <tr key={feature}><td>{feature}</td><td><code>{tool}</code></td><td>{ask}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel copilot">
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
            <h3>관제 코파일럿</h3>
            <div className="sm mut">단지 전체 데이터에 대해 물어보세요</div>
          </div>
          <Thread messages={copilot.messages} />
          <Chips items={COPILOT_SUGGESTIONS} onPick={sendCopilot} />
          <Composer placeholder="예: 지금 가장 급한 건?" label="코파일럿 메시지" onSend={sendCopilot} />
        </div>
      </div>
    </div>
  );
}
