import { useState } from 'react';
import { useNavigate } from 'react-router';
import { post, type Robot } from '../../lib/api';
import { useStore } from '../../lib/store';

export default function Onboard() {
  const { user, robots, notify, meta } = useStore(); const nav = useNavigate();
  const [serial, setSerial] = useState(''); const [nick, setNick] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const r = await post<{ robot: Robot }>('/api/home/register', { serial, nickname: nick }); notify(`${r.robot.nickname} 연결 완료`); nav('/app/robots'); }
    catch (ex) { setErr((ex as Error).message); } finally { setBusy(false); }
  };
  return (
    <>
      <header><div><h1>로봇 연결</h1><div className="sm mut">판매점에서 받은 시리얼 번호로 {meta?.robotModel}을 우리 집에 연결합니다.</div></div></header>
      <div className="grid2">
        <div className="panel">
          <div className="steps"><div className="done">판매점에서 구매 또는 구독 계약</div><div className="done">로봇 배송 · 시리얼 번호 발급</div><div className="on">앱에서 시리얼 입력 → 연결</div><div>가족 멤버 초대</div></div>
          {!online && <div className="err">스마트폰이 네트워크에 연결되어 있어야 합니다.</div>}
          {user?.role !== 'owner' && <div className="err">로봇 연결은 가정 관리자 계정에서만 할 수 있습니다.</div>}
          <form onSubmit={go} className="stack">
            <label className="sm">시리얼 번호<input placeholder="ZH1-0000-0000" value={serial} onChange={(e) => setSerial(e.target.value.toUpperCase())} pattern="ZH1-\d{4}-\d{4}" required style={{ width: '100%', fontFamily: 'var(--mono)', letterSpacing: '.05em' }} /></label>
            <label className="sm">로봇 이름 (선택)<input placeholder="예: 집사" value={nick} onChange={(e) => setNick(e.target.value)} style={{ width: '100%' }} /></label>
            {err && <div className="err">{err}</div>}
            <button className="btn pri" disabled={busy || !online || user?.role !== 'owner'}>{busy ? '연결 중…' : '연결하기'}</button>
          </form>
          <div className="xs mut">로봇 본체 뒷면 또는 보증서에 적힌 번호입니다. 시연용 미등록 시리얼: <b className="num">ZH1-2606-0042</b> (세호네 집 구매분), <b className="num">ZH1-2606-0043</b> (민수네 집 구매분)</div>
        </div>
        <div className="panel"><h3>연결된 로봇 {robots.length}대</h3>{robots.map((r) => <div key={r.serial} className="kv"><span><b>{r.nickname}</b><div className="xs mut num">{r.serial}</div></span><span>{r.registeredAt} 연결</span></div>)}{!robots.length && <div className="sm mut">추가 구매한 로봇도 같은 방법으로 등록합니다.</div>}</div>
      </div>
    </>
  );
}
