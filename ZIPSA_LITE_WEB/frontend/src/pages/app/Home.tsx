import { Link } from 'react-router';
import { Chat } from '../../components/Chat';
import { useStore } from '../../lib/store';
import { STATUS } from '../../lib/api';

const CHIPS = ['로봇들 지금 뭐 해?', '물 한 잔 가져다줘', '냉장고 재료로 뭐 만들 수 있어?', '거실 청소해줘', '택배 온 식자재 정리해줘', '세탁 돌려줘', '로봇 어디 있어?', '로봇이 고장난 것 같아'];
export default function Home() {
  const { robots, tasks, meta, user } = useStore();
  return (
    <>
      <header><div><h1>집과 대화</h1><div className="sm mut">{user?.name}님 · {robots.length ? `로봇 ${robots.length}대` : '연결된 로봇 없음'}</div></div>
        {!robots.length && user?.role === 'owner' && <Link className="btn pri" to="/app/onboard">시리얼로 로봇 연결</Link>}</header>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 16, alignItems: 'start' }} className="homegrid">
        <Chat chips={CHIPS} examples={['물 한 잔 가져다줘', '냉장고 재료로 뭐 만들 수 있어?', '로봇 어디 있어?']} />
        <div className="stack">
          <div className="panel"><h3>로봇</h3>{robots.map((r) => (<div key={r.serial} className="kv"><span><b>{r.nickname}</b> <span className={`pill ${STATUS[r.status][0]}`}>{STATUS[r.status][1]}</span><div className="xs mut">{r.taskLabel || r.zone}{r.errorCode ? ` · ${r.errorCode}` : ''}</div></span><span>{r.battery}%</span></div>))}{!robots.length && <div className="sm mut">아직 연결된 로봇이 없습니다.</div>}</div>
          <div className="panel"><h3>진행 중 작업</h3>{tasks.filter((t) => t.status === 'running').map((t) => <div key={t.id}><div className="sw sm"><span>{meta?.taskTypes[t.type]?.label} · {robots.find((r) => r.serial === t.serial)?.nickname}</span><span className="num">{t.progress}%</span></div><div className="pbar"><i style={{ width: `${t.progress}%` }} /></div></div>)}{!tasks.some((t) => t.status === 'running') && <div className="sm mut">없음</div>}</div>
        </div>
      </div>
      <style>{`@media (max-width:1000px){.homegrid{grid-template-columns:1fr!important}}`}</style>
    </>
  );
}
