import { Chat } from '../../components/Chat';
import { useStore } from '../../lib/store';
import { STATUS } from '../../lib/api';

export default function Dashboard() {
  const { robots, issues, services, logs } = useStore();
  const by = (s: string) => robots.filter((r) => r.status === s).length;
  const expiring = robots.filter((r) => r.daysLeft !== null && r.daysLeft <= 30);
  const open = issues.filter((i) => i.status !== 'closed');
  return (
    <>
      <header><div><h1>종합 관제</h1><div className="sm mut">판매된 로봇 전체 · 실시간</div></div></header>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 16, alignItems: 'start' }} className="homegrid">
        <div className="stack">
          <div className="kpis">{[[robots.length, '판매 로봇'], [robots.filter((r) => r.homeId).length, '연결(등록) 완료'], [by('run'), '가동 중'], [by('error'), '오류'], [expiring.length, '계약 만료 30일 이내'], [open.length, '미처리 이슈']].map(([v, l]) => <div key={String(l)}><b>{v}</b><span>{l}</span></div>)}</div>
          <div className="panel"><h3>주의가 필요한 로봇</h3><div className="tablewrap"><table><thead><tr><th>시리얼</th><th>상태</th><th>구매자</th><th>사유</th></tr></thead><tbody>
            {robots.filter((r) => r.status === 'error' || r.status === 'shipped' || (r.daysLeft !== null && r.daysLeft <= 30) || r.battery < 20).map((r) => <tr key={r.serial}><td className="num">{r.serial}</td><td><span className={`pill ${STATUS[r.status][0]}`}>{STATUS[r.status][1]}</span></td><td>{r.buyerName}<div className="xs mut">{r.buyerPhone}</div></td><td className="sm">{[r.errorCode, r.status === 'shipped' && '출하 후 미등록', r.daysLeft !== null && r.daysLeft <= 30 && `계약 ${r.daysLeft}일 남음`, r.battery < 20 && `배터리 ${r.battery}%`].filter(Boolean).join(' · ')}</td></tr>)}
          </tbody></table></div></div>
          <div className="grid2">
            <div className="panel"><h3>서비스 배포 현황</h3>{services.map((s) => <div key={s.id}><div className="sw sm"><span><b>{s.name}</b> v{s.version}</span><span className="num">{s.status === 'published' ? `${s.rolloutPct}% · ${s.installed.length}대` : '초안'}</span></div><div className="pbar"><i style={{ width: `${s.rolloutPct}%` }} /></div></div>)}</div>
            <div className="panel"><h3>실시간 로그</h3><div className="logs" style={{ maxHeight: 220 }}>{logs.slice(0, 40).map((l) => <div key={l.id} className={l.level}><time>{l.t}</time><span className="num">{l.serial}</span><span>{l.text}</span></div>)}{!logs.length && <div className="sm mut">이벤트를 기다리는 중…</div>}</div></div>
          </div>
        </div>
        <div className="copilot"><Chat admin chips={['지금 가장 급한 로봇은?', '만료 임박 계약은?', '미처리 이슈 알려줘', 'ZH1-2605-0017 로그 보여줘']} /></div>
      </div>
      <style>{`@media (max-width:1100px){.homegrid{grid-template-columns:1fr!important}.copilot{position:static}}`}</style>
    </>
  );
}
