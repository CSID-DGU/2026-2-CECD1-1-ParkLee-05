import { useEffect, useState } from 'react';
import { get, post, STATUS, type Log } from '../../lib/api';
import { useStore } from '../../lib/store';
import { FloorPlan } from '../../components/FloorPlan';

function Figure({ joints }: { joints: Record<string, number> }) {
  const j = (k: string) => joints[k] || 0;
  return (<svg className="figure" viewBox="0 0 120 160" aria-label="로봇 자세">
    <g style={{ transform: `rotate(${j("허리")}deg)`, transformOrigin: '60px 95px' }}>
      <g style={{ transform: `rotate(${j("머리")}deg)`, transformOrigin: '60px 38px' }}><circle cx="60" cy="24" r="14" /></g>
      <line x1="60" y1="38" x2="60" y2="95" />
      <g style={{ transform: `rotate(${j("왼쪽 어깨")}deg)`, transformOrigin: '60px 48px' }}><line x1="60" y1="48" x2="30" y2="70" /><g style={{ transform: `rotate(${j("왼쪽 팔꿈치")}deg)`, transformOrigin: '30px 70px' }}><line x1="30" y1="70" x2="22" y2="96" /><g style={{ transform: `rotate(${j("왼쪽 손목")}deg)`, transformOrigin: '22px 96px' }}><line x1="22" y1="96" x2="20" y2="106" /></g></g></g>
      <g style={{ transform: `rotate(${j("오른쪽 어깨")}deg)`, transformOrigin: '60px 48px' }}><line x1="60" y1="48" x2="90" y2="70" /><g style={{ transform: `rotate(${j("오른쪽 팔꿈치")}deg)`, transformOrigin: '90px 70px' }}><line x1="90" y1="70" x2="98" y2="96" /><g style={{ transform: `rotate(${j("오른쪽 손목")}deg)`, transformOrigin: '98px 96px' }}><line x1="98" y1="96" x2="100" y2="106" /></g></g></g>
    </g>
    <line x1="60" y1="95" x2="42" y2="150" /><line x1="60" y1="95" x2="78" y2="150" />
  </svg>);
}

export default function Robots() {
  const { robots, tasks, meta, notify, logs, home, user, services } = useStore();
  const [sel, setSel] = useState<string>(''); const [tab, setTab] = useState<'status' | 'control' | 'services'>('status'); const [hist, setHist] = useState<Log[]>([]);
  const r = robots.find((x) => x.serial === sel) || robots[0];
  useEffect(() => { if (r) get<Log[]>(`/api/robots/${r.serial}/logs?limit=30`).then(setHist); }, [r?.serial]);
  const live = [...logs.filter((l) => l.serial === r?.serial), ...hist].filter((l, i, a) => a.findIndex((x) => x.id === l.id) === i).slice(0, 30);
  const act = async (p: Promise<unknown>) => { try { await p; } catch (e) { notify((e as Error).message); } };
  const ctl = (cmd: Record<string, unknown>) => r && act(post(`/api/robots/${r.serial}/control`, cmd));
  const run = (type: string) => r && act(post<{ message: string }>('/api/tasks', { type, serial: r.serial }).then((x) => notify(x.message)));
  if (!r) return <><header><h1>로봇</h1></header><div className="panel"><div className="sm mut">연결된 로봇이 없습니다. 로봇 연결 메뉴에서 시리얼 번호를 등록하세요.</div></div></>;
  const running = tasks.find((t) => t.serial === r.serial && t.status === 'running');
  return (
    <>
      <header><div><h1>로봇별 제어</h1><div className="sm mut">{home?.name} · {meta?.robotModel}</div></div>
        <div className="seg">{robots.map((x) => <button key={x.serial} aria-pressed={x.serial === r.serial} onClick={() => setSel(x.serial)}>{x.nickname} <span className={`pill ${STATUS[x.status][0]}`} style={{ marginLeft: 4 }}>{STATUS[x.status][1]}</span></button>)}</div></header>
      <div className="grid2">
        <div className="stack">
          <div className="panel"><div className="sw"><h3>{r.nickname} <span className="mut num sm">{r.serial}</span></h3><span className={`pill ${STATUS[r.status][0]}`}>{STATUS[r.status][1]}</span></div>
            <div className="kv"><span>배터리</span><span>{r.battery}%</span><span>위치</span><span>{r.zone}</span><span>현재 작업</span><span>{r.taskLabel || '—'}</span><span>펌웨어</span><span>{r.firmware}</span><span>계약</span><span>{r.contract?.plan} · {r.daysLeft}일 남음</span></div>
            <div className="bat"><i style={{ width: `${r.battery}%`, background: r.battery < 20 ? 'var(--crit)' : undefined }} /></div>
            {r.errorCode && <div className="err">오류 {r.errorCode} — 고객센터 접수는 대화에서 "로봇이 고장난 것 같아"라고 말해 주세요.</div>}
            {running && <div><div className="sw sm"><span>{meta?.taskTypes[running.type]?.label} 진행 중</span><button className="btn sm" onClick={() => act(post(`/api/tasks/${running.id}/stop`))}>중지</button></div><div className="pbar"><i style={{ width: `${running.progress}%` }} /></div></div>}
          </div>
          <div className="panel"><div className="seg">{([['status', '작업 지시'], ['control', '기본 제어 테스트'], ['services', '설치된 서비스']] as const).map(([k, l]) => <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
            {tab === 'status' && <div className="row">{Object.entries(meta?.taskTypes || {}).map(([k, v]) => <button key={k} className="btn sm" disabled={r.status === 'error'} onClick={() => run(k)}>{v.label}</button>)}</div>}
            {tab === 'control' && (<div className="grid2">
              <div><Figure joints={r.joints} /><div className="joints">{meta?.joints.map((j) => <label key={j}>{j}<input type="range" min={-90} max={90} value={r.joints[j] || 0} onChange={(e) => ctl({ joint: j, angle: Number(e.target.value) })} disabled={r.status === 'run'} /><span className="num sm">{r.joints[j] || 0}°</span></label>)}</div></div>
              <div className="stack"><div className="dpad"><span /><button onClick={() => ctl({ move: 'forward' })} aria-label="앞으로">↑</button><span /><button onClick={() => ctl({ move: 'left' })} aria-label="왼쪽">←</button><button onClick={() => ctl({ home: true })}>초기화</button><button onClick={() => ctl({ move: 'right' })} aria-label="오른쪽">→</button><span /><button onClick={() => ctl({ move: 'back' })} aria-label="뒤로">↓</button><span /></div>
                <div className="xs mut">작업 중에는 수동 제어가 잠깁니다. 관절은 ±90°로 제한되고, 모든 조작은 로그에 남습니다.</div><FloorPlan unready={!home?.mapReady} marks={[{ id: r.serial, x: r.pos[0], y: r.pos[1], color: 'var(--accent)', label: r.nickname || '' }]} /></div></div>)}
            {tab === 'services' && <div className="stack">{services.map((s) => { const on = s.installed.includes(r.serial); return <div key={s.id} className="sw sm"><span><b>{s.name}</b> <span className="mut">v{s.version} · {s.author}</span></span>{on ? <span className="pill good">설치됨</span> : <button className="btn sm" onClick={() => act(post<{ message: string }>(`/api/services/${s.id}/install`, { serial: r.serial }).then((x) => notify(x.message)))}>설치</button>}</div>; })}</div>}
          </div>
        </div>
        <div className="panel"><h3>로그</h3><div className="logs">{live.map((l) => <div key={l.id} className={l.level}><time>{l.t}</time><span className="mut">{l.level}</span><span>{l.text}</span></div>)}</div>{user?.role === 'member' && <div className="xs mut">멤버 계정은 허용된 로봇만 표시됩니다.</div>}</div>
      </div>
    </>
  );
}
