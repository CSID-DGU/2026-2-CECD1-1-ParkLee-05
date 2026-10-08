import { useState } from 'react';
import { get, patch, post, type Issue, type User } from '../../lib/api';
import { useStore } from '../../lib/store';

type Found = User & { homeName: string; robots: string[] };
const SEV: Record<string, [string, string]> = { high: ['crit', '높음'], medium: ['warn', '보통'], low: ['idle', '낮음'] };
const ST: Record<string, [string, string]> = { open: ['crit', '접수'], in_progress: ['warn', '처리 중'], closed: ['good', '완료'] };

export default function Issues() {
  const { issues, notify } = useStore();
  const [q, setQ] = useState(''); const [found, setFound] = useState<Found[]>([]); const [pick, setPick] = useState<Found | null>(null);
  const [f, setF] = useState({ serial: '', title: '', severity: 'medium' }); const [sel, setSel] = useState<string>(''); const [note, setNote] = useState('');
  const search = async (e: React.FormEvent) => { e.preventDefault(); setFound(await get<Found[]>(`/api/admin/users?q=${encodeURIComponent(q)}`)); setPick(null); };
  const create = async (e: React.FormEvent) => { e.preventDefault(); if (!pick) return; try { await post('/api/admin/issues', { userId: pick.id, ...f }); notify('이슈를 접수했습니다'); setF({ serial: '', title: '', severity: 'medium' }); } catch (ex) { notify((ex as Error).message); } };
  const i = issues.find((x) => x.id === sel);
  const upd = async (body: Partial<Issue> & { note?: string }) => { if (!i) return; await patch(`/api/admin/issues/${i.id}`, body); setNote(''); };
  return (
    <>
      <header><div><h1>이슈 접수 · 처리</h1><div className="sm mut">사용자 ID·연락처로 검색해 접수하고, 로그와 원격 조치로 대응합니다.</div></div></header>
      <div className="grid2" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.4fr)' }}>
        <div className="stack">
          <div className="panel"><h3>1. 사용자 확인</h3><form onSubmit={search} className="row"><input placeholder="ID · 이름 · 이메일 · 연락처" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} /><button className="btn">검색</button></form>
            {found.map((u) => <button key={u.id} className="btn" style={{ justifyContent: 'space-between', width: '100%', borderColor: pick?.id === u.id ? 'var(--accent)' : undefined }} onClick={() => { setPick(u); setF({ ...f, serial: u.robots[0] || '' }); }}><span><b>{u.name}</b> <span className="mut sm">{u.id}</span></span><span className="sm mut">{u.phone} · {u.homeName} · 로봇 {u.robots.length}</span></button>)}
            {found.length === 0 && q && <div className="sm mut">검색 결과가 없습니다. 예: 박민수, 010-9876, u_owner</div>}</div>
          <div className="panel"><h3>2. 접수</h3><form onSubmit={create} className="stack"><div className="sm">{pick ? <>사용자 <b>{pick.name}</b> · {pick.phone}</> : <span className="mut">먼저 사용자를 선택하세요</span>}</div>
            <select value={f.serial} onChange={(e) => setF({ ...f, serial: e.target.value })} required disabled={!pick}>{(pick?.robots || []).map((s) => <option key={s}>{s}</option>)}</select>
            <input placeholder="증상" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required disabled={!pick} />
            <select value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value })}><option value="high">심각도 높음</option><option value="medium">보통</option><option value="low">낮음</option></select>
            <button className="btn pri" disabled={!pick}>접수</button></form></div>
        </div>
        <div className="stack">
          <div className="panel"><h3>이슈 목록</h3><div className="tablewrap"><table><thead><tr><th>접수</th><th>사용자</th><th>로봇</th><th>증상</th><th>심각도</th><th>상태</th></tr></thead><tbody>
            {issues.map((x) => <tr key={x.id} role="button" tabIndex={0} className={x.id === sel ? 'sel' : ''} onClick={() => setSel(x.id)} onKeyDown={(e) => e.key === 'Enter' && setSel(x.id)}><td className="xs num">{x.createdAt.slice(5, 16).replace('T', ' ')}</td><td>{x.userName}<div className="xs mut">{x.contact}</div></td><td className="num xs">{x.serial}</td><td>{x.title}</td><td><span className={`pill ${SEV[x.severity][0]}`}>{SEV[x.severity][1]}</span></td><td><span className={`pill ${ST[x.status][0]}`}>{ST[x.status][1]}</span></td></tr>)}
          </tbody></table></div></div>
          {i && <div className="panel"><div className="sw"><h3>{i.title}</h3><span className={`pill ${ST[i.status][0]}`}>{ST[i.status][1]}</span></div>
            <div className="kv"><span>사용자</span><span>{i.userName} · {i.userEmail}</span><span>연락처</span><span>{i.contact}</span><span>로봇</span><span>{i.serial} · {i.robotStatus}</span><span>가정</span><span>{i.homeName}</span></div>
            <div className="notes">{i.notes.map((n, k) => <div key={k}><span className="xs mut">{n.at.slice(5, 16).replace('T', ' ')} · {n.by}</span><br />{n.text}</div>)}</div>
            <form className="row" onSubmit={(e) => { e.preventDefault(); if (note.trim()) upd({ note }); }}><input placeholder="처리 메모" value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: 1 }} /><button className="btn">메모 추가</button></form>
            <div className="row"><button className="btn sm" onClick={() => upd({ status: 'in_progress' })}>처리 중</button><button className="btn sm pri" onClick={() => upd({ status: 'closed', note: '처리 완료' })}>완료</button><a className="btn sm" href={`/admin/logs?serial=${i.serial}`}>로그 보기</a><a className="btn sm" href="/admin/fleet">원격 조치</a></div></div>}
        </div>
      </div>
    </>
  );
}
