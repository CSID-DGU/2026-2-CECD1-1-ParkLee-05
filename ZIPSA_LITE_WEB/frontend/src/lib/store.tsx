import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { get, getToken, setToken, streamChat, type Card, type Home, type Issue, type Log, type Member, type Invite, type Meta, type Robot, type Service, type Task, type User } from './api';
import { speak } from './speech';

export type ChatMsg = { id: number; role: 'user' | 'assistant'; text: string; cards: Card[]; tool?: string; pending?: boolean; viaVoice?: boolean; note?: string };
const TOOL_LABEL: Record<string, string> = { get_robots: '로봇 상태 확인 중', run_task: '작업 지시 중', stop_task: '작업 중지 중', fridge_inventory: '냉장고 확인 중', recommend_recipe: '요리 추천 중', get_map: '지도 확인 중', report_issue: '이슈 접수 중', list_services: '서비스 확인 중', fleet_summary: '전체 현황 집계 중', search_user: '사용자 검색 중', robot_logs: '로그 조회 중', list_issues: '이슈 조회 중' };

type Snap = { home?: Home; robots: Robot[]; tasks?: Task[]; services: Service[]; issues?: Issue[] };
type Store = {
  user: User | null; restoring: boolean; meta: Meta | null; llm: { llm: boolean; model: string | null; robotModel: string } | null; connected: boolean;
  login: (u: User, token: string) => void; logout: () => void;
  home: Home | null; robots: Robot[]; tasks: Task[]; services: Service[]; issues: Issue[]; logs: Log[];
  members: { members: Member[]; invites: Invite[] } | null; refreshMembers: () => Promise<void>;
  chat: ChatMsg[]; busy: boolean; send: (text: string, o?: { viaVoice?: boolean; admin?: boolean }) => Promise<void>; tts: boolean; setTts: (v: boolean) => void;
  toast: string | null; notify: (t: string) => void;
};
const Ctx = createContext<Store | null>(null);
export const useStore = () => { const s = useContext(Ctx); if (!s) throw new Error('StoreProvider'); return s; };
let mid = 1;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // 저장된 토큰으로 로그인 상태를 되살리는 중 (새로고침 직후)
  const [restoring, setRestoring] = useState(() => !!getToken());
  const [meta, setMeta] = useState<Meta | null>(null);
  const [llm, setLlm] = useState<Store['llm']>(null);
  const [connected, setConnected] = useState(false);
  const [snap, setSnap] = useState<Snap>({ robots: [], services: [] });
  const [logs, setLogs] = useState<Log[]>([]);
  const [members, setMembers] = useState<Store['members']>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [busy, setBusy] = useState(false);
  const [tts, setTts] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastT = useRef<number>(0); const ttsRef = useRef(tts); ttsRef.current = tts; const chatRef = useRef(chat); chatRef.current = chat;
  const notify = useCallback((t: string) => { setToast(t); window.clearTimeout(toastT.current); toastT.current = window.setTimeout(() => setToast(null), 3200); }, []);

  useEffect(() => { get<Meta>('/api/meta').then(setMeta); get<Store['llm']>('/api/health').then(setLlm); if (getToken()) get<User>('/api/auth/me').then(setUser).catch(() => setToken('')).finally(() => setRestoring(false)); }, []);
  const login = (u: User, token: string) => { setToken(token); setUser(u); setChat([]); };
  const logout = () => { setToken(''); setUser(null); setSnap({ robots: [], services: [] }); setChat([]); setMembers(null); };
  const refreshMembers = useCallback(async () => { if (user && user.role !== 'admin') setMembers(await get('/api/home/members')); }, [user]);

  useEffect(() => {
    if (!user) return;
    setChat([{ id: 0, role: 'assistant', cards: [], text: user.role === 'admin' ? '관제 코파일럿입니다. 급한 로봇, 만료 임박 계약, 이슈, 시리얼별 로그를 물어보세요.' : `${user.name}님, 안녕하세요. 로봇에게 일을 시키거나 상태를 물어보세요. 예: "물 한 잔 가져다줘", "냉장고 재료로 뭐 만들 수 있어?"` }]);
    refreshMembers();
    let ws: WebSocket | null = null; let closed = false; let retry = 0;
    const open = () => {
      ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?token=${encodeURIComponent(getToken())}`);
      ws.onopen = () => setConnected(true);
      ws.onclose = (e) => { setConnected(false); if (!closed && e.code !== 4001) retry = window.setTimeout(open, 1500); };
      ws.onmessage = (m) => { const { type, data } = JSON.parse(m.data); if (type === 'snapshot') setSnap(data); else if (type === 'members') setMembers(data); else if (type === 'log') setLogs((l) => [data, ...l].slice(0, 300)); };
    };
    open();
    return () => { closed = true; window.clearTimeout(retry); ws?.close(); };
  }, [user, refreshMembers]);

  const send = useCallback(async (text: string, o: { viaVoice?: boolean; admin?: boolean } = {}) => {
    text = text.trim(); if (!text) return;
    const history = chatRef.current.filter((m) => m.id > 0 && m.text && !m.pending).map((m) => ({ role: m.role, content: m.text }));
    const aid = mid + 1; mid += 2;
    setChat((l) => [...l, { id: aid - 1, role: 'user', text, cards: [], viaVoice: o.viaVoice }, { id: aid, role: 'assistant', text: '', cards: [], pending: true }]);
    const p = (f: (m: ChatMsg) => ChatMsg) => setChat((l) => l.map((m) => (m.id === aid ? f(m) : m)));
    setBusy(true);
    try {
      const done = await streamChat(o.admin ? '/api/admin/chat' : '/api/chat', { messages: [...history, { role: 'user', content: text }] }, {
        onDelta: (t) => p((m) => ({ ...m, text: m.text + t, tool: undefined })), onCard: (c) => p((m) => ({ ...m, cards: [...m.cards, c] })), onTool: (n) => p((m) => ({ ...m, tool: TOOL_LABEL[n] || n })) });
      p((m) => ({ ...m, pending: false, tool: undefined, text: m.text.trim() || done.text, note: done.mode === 'scripted' ? '준비된 답변' : undefined }));
      if (!o.admin && (ttsRef.current || o.viaVoice)) speak(done.text);
    } catch (e) { p((m) => ({ ...m, pending: false, tool: undefined, text: `답변을 가져오지 못했어요. (${(e as Error).message})` })); }
    finally { setBusy(false); }
  }, []);

  const value = useMemo<Store>(() => ({ user, restoring, meta, llm, connected, login, logout, home: snap.home || null, robots: snap.robots, tasks: snap.tasks || [], services: snap.services, issues: snap.issues || [], logs, members, refreshMembers, chat, busy, send, tts, setTts, toast, notify }),
    [user, restoring, meta, llm, connected, snap, logs, members, refreshMembers, chat, busy, send, tts, toast, notify]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
