import { useState } from 'react';
import { useNavigate } from 'react-router';
import { post, type User } from '../lib/api';
import { useStore } from '../lib/store';

type Mode = 'login' | 'signup' | 'invite';
export default function Auth() {
  const { login } = useStore(); const nav = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [f, setF] = useState({ email: '', pw: '', name: '', phone: '', code: '' });
  const [err, setErr] = useState('');
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try {
      const r = await post<{ token: string; user: User }>(mode === 'login' ? '/api/auth/login' : mode === 'signup' ? '/api/auth/signup' : '/api/auth/accept-invite', f);
      login(r.user, r.token); nav(r.user.role === 'admin' ? '/admin' : '/app');
    } catch (ex) { setErr((ex as Error).message); }
  };
  const demo = async (email: string) => { setErr(''); const r = await post<{ token: string; user: User }>('/api/auth/login', { email, pw: 'demo' }); login(r.user, r.token); nav(r.user.role === 'admin' ? '/admin' : '/app'); };
  return (
    <div className="auth"><div className="panel">
      <div><div className="brand" style={{ padding: 0 }}>ZIPSA <span>로봇 관리</span></div><div className="sm mut">구매하거나 구독한 홈 휴머노이드를 연결하고 관리합니다.</div></div>
      <div className="tabs" role="group">{([['login', '로그인'], ['signup', '회원가입'], ['invite', '초대 코드']] as [Mode, string][]).map(([k, l]) => <button key={k} aria-pressed={mode === k} onClick={() => { setMode(k); setErr(''); }}>{l}</button>)}</div>
      <form onSubmit={go}>
        {mode === 'invite' && <input placeholder="초대 코드 (6자리)" value={f.code} onChange={up('code')} required />}
        <input type="email" placeholder="이메일" value={f.email} onChange={up('email')} required />
        <input type="password" placeholder="비밀번호" value={f.pw} onChange={up('pw')} required />
        {mode !== 'login' && <><input placeholder="이름" value={f.name} onChange={up('name')} required={mode === 'signup'} /><input placeholder="연락처 (010-0000-0000)" value={f.phone} onChange={up('phone')} required /></>}
        {err && <div className="err">{err}</div>}
        <button className="btn pri">{mode === 'login' ? '로그인' : mode === 'signup' ? '가입하고 시작' : '초대 수락'}</button>
      </form>
      <div className="demo"><div className="xs mut">시연용 계정 (비밀번호 demo)</div>
        <button type="button" onClick={() => demo('owner@demo.kr')}><b>가정 관리자</b> · owner@demo.kr — 로봇 2대 연결, 시리얼 추가 등록 가능</button>
        <button type="button" onClick={() => demo('member@demo.kr')}><b>가족 멤버</b> · member@demo.kr — 허용된 로봇 1대만 제어</button>
        <button type="button" onClick={() => demo('park@demo.kr')}><b>다른 가정</b> · park@demo.kr — 오류 로봇, 계약 만료 12일 전</button>
        <button type="button" onClick={() => demo('admin@demo.kr')}><b>슈퍼어드민</b> · admin@demo.kr — 전체 관제</button></div>
    </div></div>
  );
}
