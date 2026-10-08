import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { STATUS, type Card } from '../lib/api';
import { useStore, type ChatMsg } from '../lib/store';
import { FloorPlan } from './FloorPlan';
import { listen, stopSpeaking, sttSupported } from '../lib/speech';

const SendIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>);
const MicIcon = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>);

function CardView({ card }: { card: Card }) {
  const { send, busy, meta } = useStore();
  switch (card.type) {
    case 'robots': return (<div className="card"><h4>로봇 {card.robots.length}대</h4><div className="kv">{card.robots.map((r) => <span key={r.serial} style={{ display: 'contents' }}><span>{r.nickname} <span className={`pill ${STATUS[r.status][0]}`}>{STATUS[r.status][1]}</span> <span className="mut sm">{r.taskLabel || r.zone}</span></span><span>{r.battery}%</span></span>)}</div></div>);
    case 'task': return (<div className="card"><h4>{card.robot.nickname} · {meta?.taskTypes[card.task.type]?.label} <span className="pill good">시작됨</span></h4><div className="pbar"><i style={{ width: `${card.task.progress}%` }} /></div><div className="row"><Link className="btn sm" to="/app/robots">진행 상황 보기</Link></div></div>);
    case 'recipes': return (<div className="card"><h4>냉장고 재료로 만들 수 있는 요리</h4><div className="sm mut">재료: {card.fridge.join(', ')}</div>
      {card.recommendations.map((r) => (<div key={r.name} className="sw" style={{ borderTop: '1px solid var(--line)', paddingTop: 6 }}><div><b>{r.name}</b> <span className="mut sm">{r.minutes}분</span>{r.missing.length ? <div className="xs" style={{ color: 'var(--warn)' }}>부족: {r.missing.join(', ')}</div> : <div className="xs" style={{ color: 'var(--good)' }}>재료 모두 있음</div>}{r.service && <div className="xs mut">{r.serviceInstalled ? '요리 서비스 설치됨' : '요리 서비스 미설치'}</div>}</div>
        <button className="btn sm pri" disabled={busy} onClick={() => send(`${r.name} 재료 꺼내서 요리대에 세팅해줘`)}>재료 세팅</button></div>))}</div>);
    case 'map': return (<div className="card"><h4>로봇 위치 {!card.mapReady && <span className="pill warn">지도 없음</span>}</h4><FloorPlan unready={!card.mapReady} marks={card.robots.map((r) => ({ id: r.serial, x: r.pos[0], y: r.pos[1], color: r.status === 'error' ? 'var(--crit)' : 'var(--accent)', label: r.nickname || '' }))} /></div>);
    case 'issue': return (<div className="card"><h4>고객센터 접수 <span className="pill info">접수번호 {card.issue.id}</span></h4><div className="sm">{card.issue.serial} · {card.issue.title}</div><div className="xs mut">연락처 {card.issue.contact}로 담당자가 연락드립니다.</div></div>);
  }
}

function Bubble({ m, avatar }: { m: ChatMsg; avatar: string }) {
  const me = m.role === 'user';
  return (<div className={`msg${me ? ' me' : ''}`}>{!me && <div className="av">{avatar}</div>}<div className="bub">{m.viaVoice && <div style={{ opacity: .75, fontSize: 11 }}>음성 입력</div>}{m.pending && !m.text && <span className="row sm mut"><span className="typing"><i /><i /><i /></span>{m.tool}</span>}{m.text}{m.cards.map((c, i) => <CardView key={i} card={c} />)}{m.note && <div className="proto">{m.note}</div>}</div></div>);
}

function VoiceOverlay({ onClose, examples }: { onClose: () => void; examples: string[] }) {
  const { send } = useStore();
  const [heard, setHeard] = useState('듣고 있어요…');
  const [note, setNote] = useState(sttSupported() ? '' : '이 브라우저는 음성 인식을 지원하지 않아 예시 발화로 시연합니다.');
  const stop = useRef<() => void>(() => {});
  const finish = (t: string) => { setHeard(t); stop.current(); window.setTimeout(() => { onClose(); send(t, { viaVoice: true }); }, 450); };
  useEffect(() => { stopSpeaking(); if (sttSupported()) stop.current = listen({ onInterim: setHeard, onFinal: finish, onError: setNote }); return () => stop.current(); /* eslint-disable-next-line */ }, []);
  return (<div className="voice"><div className="sm" style={{ opacity: .7 }}>음성으로 말씀하세요</div><div className="orb" /><div className="heard">{heard}</div><div className="sm" style={{ opacity: .7 }}>{note}</div>
    <div className="ex"><div className="xs" style={{ opacity: .7, textAlign: 'left' }}>또는 예시 발화를 눌러 보세요</div>{examples.map((t) => <button key={t} onClick={() => finish(t)}>{t}</button>)}</div><button className="btn" style={{ background: 'transparent', color: '#E7ECF3', borderColor: 'rgba(231,236,243,.3)' }} onClick={onClose}>닫기</button></div>);
}

export function Chat({ admin = false, chips, examples }: { admin?: boolean; chips: string[]; examples?: string[] }) {
  const { chat, send, busy, tts, setTts, llm } = useStore();
  const [text, setText] = useState(''); const [voice, setVoice] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = box.current; if (el) el.scrollTop = el.scrollHeight; }, [chat]);
  const submit = (t: string) => { if (busy || !t.trim()) return; send(t, { admin }); setText(''); };
  return (
    <div className="chat">
      <div className="thread" ref={box} aria-live="polite">
        <div className="sw xs mut" style={{ marginBottom: 4 }}><span>{llm ? (llm.llm ? `LLM 연결됨 · ${llm.model}` : '준비된 답변 모드 (API 키 없음)') : ''}</span>{!admin && <label className="row">음성 답변<input type="checkbox" checked={tts} onChange={(e) => { if (!e.target.checked) stopSpeaking(); setTts(e.target.checked); }} /></label>}</div>
        {chat.map((m) => <Bubble key={m.id} m={m} avatar={admin ? 'AI' : '집'} />)}
      </div>
      <div className="chips">{chips.map((c) => <button key={c} type="button" disabled={busy} onClick={() => submit(c)}>{c}</button>)}</div>
      <form className="composer" onSubmit={(e) => { e.preventDefault(); submit(text); }}>
        {!admin && <button type="button" className="mic" aria-label="음성으로 말하기" onClick={() => setVoice(true)}><MicIcon /></button>}
        <input id={admin ? 'adminChat' : 'homeChat'} autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} placeholder={admin ? '예: 만료 임박 계약은?' : '로봇에게 말해 보세요'} aria-label="메시지" />
        <button className="send" aria-label="보내기" disabled={busy || !text.trim()}><SendIcon /></button>
      </form>
      {voice && <VoiceOverlay onClose={() => setVoice(false)} examples={examples || chips.slice(0, 3)} />}
    </div>
  );
}
