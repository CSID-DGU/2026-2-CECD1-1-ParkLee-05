import { useState } from 'react';
import { post, type Service } from '../../lib/api';
import { useStore } from '../../lib/store';

export default function Services() {
  const { services, robots, notify } = useStore();
  const [f, setF] = useState<Partial<Service>>({ name: '', kind: 'recipe', version: '1.0.0', author: '', size: '', changelog: '' });
  const [pct, setPct] = useState<Record<string, number>>({});
  const save = async (e: React.FormEvent) => { e.preventDefault(); await post('/api/admin/services', f); notify('초안으로 저장했습니다'); setF({ name: '', kind: 'recipe', version: '1.0.0', author: '', size: '', changelog: '' }); };
  const publish = (s: Service) => post<{ message: string }>(`/api/admin/services/${s.id}/publish`, { rolloutPct: pct[s.id] ?? (s.rolloutPct || 20) }).then((r) => notify(r.message));
  const registered = robots.filter((r) => r.homeId).length;
  return (
    <>
      <header><div><h1>서비스 업데이트</h1><div className="sm mut">요리 레시피·스킬을 등록하고 단계적으로 배포합니다. 등록 로봇 {registered}대</div></div></header>
      <div className="grid2" style={{ gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)' }}>
        <div className="stack">{services.map((s) => (<div key={s.id} className="panel"><div className="sw"><div><h3>{s.name} <span className="mut sm">v{s.version}</span></h3><div className="xs mut">{s.kind === 'recipe' ? '요리' : '스킬'} · {s.author} · {s.size}</div></div><span className={`pill ${s.status === 'published' ? 'good' : 'idle'}`}>{s.status === 'published' ? `배포 ${s.rolloutPct}%` : '초안'}</span></div>
          <div className="sm">{s.changelog}</div><div className="pbar"><i style={{ width: `${(s.installed.length / Math.max(1, registered)) * 100}%` }} /></div><div className="xs mut">설치 {s.installed.length}/{registered}대 {s.installed.length ? `· ${s.installed.join(', ')}` : ''}</div>
          <div className="row"><label className="row sm">배포 비율<input type="range" min={0} max={100} step={10} value={pct[s.id] ?? s.rolloutPct} onChange={(e) => setPct({ ...pct, [s.id]: Number(e.target.value) })} /><span className="num">{pct[s.id] ?? s.rolloutPct}%</span></label><button className="btn sm pri" onClick={() => publish(s)}>{s.status === 'published' ? '배포 비율 변경' : '배포 시작'}</button></div></div>))}</div>
        <div className="panel"><h3>새 서비스 등록</h3><form onSubmit={save} className="stack">
          <input placeholder="서비스 이름 (예: 에드워드권의 김치찌개 요리)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          <div className="row"><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Service['kind'] })}><option value="recipe">요리 레시피</option><option value="skill">스킬</option></select><input placeholder="버전" value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} style={{ width: 90 }} /><input placeholder="용량" value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })} style={{ width: 90 }} /></div>
          <input placeholder="제작자 (셰프·팀)" value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} required />
          <textarea placeholder="변경 사항" rows={3} value={f.changelog} onChange={(e) => setF({ ...f, changelog: e.target.value })} />
          <button className="btn pri">초안 저장</button></form>
          <div className="xs mut">초안 → 배포 비율을 정해 단계 배포 → 100%. 사용자는 로봇 화면의 "설치된 서비스"에서 직접 설치할 수도 있습니다.</div></div>
      </div>
    </>
  );
}
