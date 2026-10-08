import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { get, type Log } from '../../lib/api';
import { useStore } from '../../lib/store';

export default function Logs() {
  const { robots, logs: live } = useStore(); const [sp, setSp] = useSearchParams();
  const serial = sp.get('serial') || ''; const level = sp.get('level') || ''; const q = sp.get('q') || '';
  const [rows, setRows] = useState<Log[]>([]);
  useEffect(() => { get<Log[]>(`/api/admin/logs?serial=${serial}&level=${level}&q=${encodeURIComponent(q)}&limit=300`).then(setRows); }, [serial, level, q, live.length]);
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n); };
  const counts = { error: rows.filter((l) => l.level === 'error').length, warn: rows.filter((l) => l.level === 'warn').length };
  return (
    <>
      <header><div><h1>로봇 로그</h1><div className="sm mut">{rows.length}건 · 오류 {counts.error} · 경고 {counts.warn}</div></div>
        <div className="row"><select value={serial} onChange={(e) => set('serial', e.target.value)}><option value="">전체 로봇</option>{robots.map((r) => <option key={r.serial} value={r.serial}>{r.serial} {r.nickname ? `· ${r.nickname}` : ''}</option>)}</select>
          <select value={level} onChange={(e) => set('level', e.target.value)}><option value="">전체 레벨</option><option value="error">error</option><option value="warn">warn</option><option value="info">info</option></select>
          <input placeholder="내용 검색" value={q} onChange={(e) => set('q', e.target.value)} /></div></header>
      <div className="panel"><div className="logs" style={{ maxHeight: 'calc(100dvh - 200px)' }}>{rows.map((l) => <div key={l.id} className={l.level}><time>{l.t}</time><span className="num">{l.serial}</span><span>{l.text}</span></div>)}{!rows.length && <div className="sm mut">조건에 맞는 로그가 없습니다.</div>}</div></div>
    </>
  );
}
