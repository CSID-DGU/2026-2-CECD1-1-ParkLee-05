import { useState } from 'react';
import { del, patch, post } from '../../lib/api';
import { useStore } from '../../lib/store';

export default function Members() {
  const { members, robots, user, notify, refreshMembers } = useStore();
  const [f, setF] = useState({ email: '', name: '', robots: [] as string[] }); const [err, setErr] = useState('');
  const owner = user?.role === 'owner';
  const invite = async (e: React.FormEvent) => { e.preventDefault(); setErr(''); try { const r = await post<{ message: string }>('/api/home/members/invite', f); notify(r.message); setF({ email: '', name: '', robots: [] }); refreshMembers(); } catch (ex) { setErr((ex as Error).message); } };
  const toggle = async (userId: string, cur: '*' | string[], serial: string) => { const list = cur === '*' ? robots.map((r) => r.serial) : cur; const next = list.includes(serial) ? list.filter((x) => x !== serial) : [...list, serial]; await patch(`/api/home/members/${userId}`, { robots: next.length === robots.length ? '*' : next }); refreshMembers(); };
  return (
    <>
      <header><div><h1>가족 멤버</h1><div className="sm mut">로봇별로 누가 제어할 수 있는지 정합니다.</div></div></header>
      <div className="grid2">
        <div className="panel"><h3>멤버 {members?.members.length ?? 0}명</h3>
          <div className="tablewrap"><table><thead><tr><th>이름</th><th>역할</th>{robots.map((r) => <th key={r.serial}>{r.nickname}</th>)}<th /></tr></thead><tbody>
            {members?.members.map((m) => <tr key={m.userId}><td><b>{m.user.name}</b><div className="xs mut">{m.user.email}</div></td><td>{m.role === 'owner' ? '관리자' : '멤버'}</td>
              {robots.map((r) => <td key={r.serial}><input type="checkbox" checked={m.robots === '*' || m.robots.includes(r.serial)} disabled={!owner || m.role === 'owner'} onChange={() => toggle(m.userId, m.robots, r.serial)} aria-label={`${m.user.name} ${r.nickname}`} /></td>)}
              <td>{owner && m.role !== 'owner' && <button className="btn sm" onClick={() => del(`/api/home/members/${m.userId}`).then(refreshMembers)}>제외</button>}</td></tr>)}
          </tbody></table></div>
          {!!members?.invites.filter((i) => i.status === 'pending').length && <div><h3>대기 중 초대</h3>{members?.invites.filter((i) => i.status === 'pending').map((i) => <div key={i.code} className="sw sm"><span>{i.name} · {i.email}</span><span className="num">코드 {i.code}</span></div>)}</div>}
        </div>
        <div className="panel"><h3>멤버 초대</h3>{!owner && <div className="sm mut">가정 관리자만 초대할 수 있습니다.</div>}
          <form onSubmit={invite} className="stack"><input placeholder="이름" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required disabled={!owner} /><input type="email" placeholder="이메일" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required disabled={!owner} />
            <div className="sm">제어 허용 로봇 (선택 없음 = 전체)</div><div className="row">{robots.map((r) => <label key={r.serial} className="row sm"><input type="checkbox" checked={f.robots.includes(r.serial)} onChange={(e) => setF({ ...f, robots: e.target.checked ? [...f.robots, r.serial] : f.robots.filter((x) => x !== r.serial) })} disabled={!owner} />{r.nickname}</label>)}</div>
            {err && <div className="err">{err}</div>}<button className="btn pri" disabled={!owner}>초대 코드 만들기</button></form>
          <div className="xs mut">초대받은 가족은 로그인 화면의 "초대 코드" 탭에서 코드를 입력해 합류합니다.</div></div>
      </div>
    </>
  );
}
