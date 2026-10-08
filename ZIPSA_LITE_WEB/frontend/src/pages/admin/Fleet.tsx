import { useState } from 'react';
import { post, STATUS } from '../../lib/api';
import { useStore } from '../../lib/store';

export default function Fleet() {
  const { robots, notify } = useStore();
  const [q, setQ] = useState(''); const [sel, setSel] = useState('');
  const list = robots.filter((r) => !q || [r.serial, r.buyerName, r.buyerPhone, r.homeName, r.nickname].some((v) => v && v.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => (a.daysLeft ?? 9e9) - (b.daysLeft ?? 9e9));
  const r = robots.find((x) => x.serial === sel);
  const remedy = (action: string) => r && post<{ message: string }>(`/api/admin/robots/${r.serial}/remedy`, { action }).then((x) => notify(x.message)).catch((e) => notify(e.message));
  return (
    <>
      <header><div><h1>로봇 · 계약</h1><div className="sm mut">판매된 로봇 {robots.length}대 · 계약 잔여일 순</div></div><input placeholder="시리얼 · 구매자 · 연락처 검색" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 260 }} /></header>
      <div className="grid2" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)' }}>
        <div className="panel"><div className="tablewrap"><table><thead><tr><th>시리얼</th><th>구매자</th><th>가정 · 별명</th><th>계약</th><th>기간</th><th>잔여</th><th>상태</th></tr></thead><tbody>
          {list.map((x) => <tr key={x.serial} role="button" tabIndex={0} className={x.serial === sel ? 'sel' : ''} onClick={() => setSel(x.serial)} onKeyDown={(e) => e.key === 'Enter' && setSel(x.serial)}><td className="num">{x.serial}</td><td>{x.buyerName}<div className="xs mut">{x.buyerPhone}</div></td><td>{x.homeName || <span className="mut">미등록</span>}<div className="xs mut">{x.nickname}</div></td><td>{x.contract?.type === 'subscription' ? '구독' : '구매'}<div className="xs mut">{x.contract?.plan}</div></td><td className="num xs">{x.contract?.start}<br />~ {x.contract?.end}</td><td><span className={`pill ${x.daysLeft !== null && x.daysLeft <= 30 ? 'crit' : 'idle'}`}>{x.daysLeft}일</span></td><td><span className={`pill ${STATUS[x.status][0]}`}>{STATUS[x.status][1]}</span></td></tr>)}
        </tbody></table></div></div>
        <div className="panel">{r ? (<>
          <div className="sw"><h3 className="num">{r.serial}</h3><span className={`pill ${STATUS[r.status][0]}`}>{STATUS[r.status][1]}</span></div>
          <div className="kv"><span>모델 · 펌웨어</span><span>{r.model} · {r.firmware}</span><span>구매자</span><span>{r.buyerName} {r.buyerPhone}</span><span>판매점</span><span>{(r as unknown as { buyer?: { store: string } }).buyer?.store}</span><span>출하 · 등록</span><span>{r.shippedAt} · {r.registeredAt || '미등록'}</span><span>배터리 · 위치</span><span>{r.battery}% · {r.homeId ? r.zone : '—'}</span><span>오류</span><span>{r.errorCode || '없음'}</span><span>마지막 통신</span><span>{r.lastSeen.slice(11, 19)}</span></div>
          <h3>원격 조치</h3><div className="row"><button className="btn sm" onClick={() => remedy('reboot')}>원격 재부팅</button><button className="btn sm" onClick={() => remedy('recalibrate')}>관절 캘리브레이션</button><button className="btn sm" onClick={() => remedy('clear_error')} disabled={!r.errorCode}>오류 해제</button><button className="btn sm" onClick={() => remedy('firmware')} disabled={r.firmware === '2.4.2'}>펌웨어 2.4.2 푸시</button></div>
          <div className="xs mut">모든 조치는 로봇 로그에 담당자 이름과 함께 기록됩니다.</div>
        </>) : <div className="sm mut">로봇을 선택하면 상세와 원격 조치가 표시됩니다.</div>}</div>
      </div>
    </>
  );
}
