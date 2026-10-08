import { post, STATUS } from '../../lib/api';
import { useStore } from '../../lib/store';
import { FloorPlan } from '../../components/FloorPlan';

export default function Map() {
  const { home, robots, notify } = useStore();
  const mapping = home?.mapping;
  return (
    <>
      <header><div><h1>실내 맵 · 실시간 위치</h1><div className="sm mut">{home?.mapReady ? '로봇이 생성한 지도 위에 위치를 4초마다 갱신합니다.' : '아직 지도가 없습니다. 로봇이 집을 한 바퀴 돌며 지도를 만듭니다.'}</div></div>
        <button className="btn pri" disabled={mapping != null} onClick={() => post('/api/home/map/scan').then(() => notify('맵 생성을 시작했습니다'))}>{home?.mapReady ? '지도 다시 생성' : '맵 생성 시작'}</button></header>
      {mapping != null && <div className="panel" style={{ marginBottom: 12 }}><div className="sw sm"><span>로봇이 공간을 스캔하는 중…</span><span className="num">{mapping}%</span></div><div className="pbar"><i style={{ width: `${mapping}%` }} /></div></div>}
      <div className="grid2">
        <div className="panel"><FloorPlan unready={!home?.mapReady} marks={robots.map((r) => ({ id: r.serial, x: r.pos[0], y: r.pos[1], color: r.status === 'error' ? 'var(--crit)' : r.status === 'charge' ? 'var(--warn)' : 'var(--accent)', label: r.nickname || '' }))} /></div>
        <div className="panel"><h3>로봇 위치</h3><div className="kv">{robots.map((r) => <span key={r.serial} style={{ display: 'contents' }}><span><b>{r.nickname}</b> <span className={`pill ${STATUS[r.status][0]}`}>{STATUS[r.status][1]}</span></span><span>{r.zone}</span></span>)}</div><div className="xs mut">좌표는 로봇 SLAM 결과를 평면도(320×200cm 기준)에 투영한 값입니다.</div></div>
      </div>
    </>
  );
}
