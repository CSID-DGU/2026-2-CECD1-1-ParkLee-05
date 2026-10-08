export type Role = 'owner' | 'member' | 'admin';
export type User = { id: string; email: string; name: string; phone: string; role: Role; homeId: string | null };
export type Robot = { serial: string; model: string; nickname: string | null; homeId: string | null; firmware: string; status: 'idle' | 'run' | 'charge' | 'error' | 'manual' | 'shipped'; battery: number; pos: [number, number]; task: string | null; taskLabel: string | null; joints: Record<string, number>; contract: { type: 'purchase' | 'subscription'; start: string; end: string; plan: string } | null; daysLeft: number | null; buyerName: string | null; buyerPhone: string | null; homeName: string | null; zone: string; errorCode: string | null; registeredAt: string | null; shippedAt: string; lastSeen: string };
export type Task = { id: string; serial: string; type: string; status: 'running' | 'done' | 'stopped'; progress: number; createdAt: string; by: string };
export type Service = { id: string; name: string; kind: 'recipe' | 'skill'; version: string; author: string; status: 'draft' | 'published'; rolloutPct: number; size: string; changelog: string; installed: string[] };
export type Issue = { id: string; serial: string; userId: string; userName?: string; userEmail?: string; contact: string; title: string; status: 'open' | 'in_progress' | 'closed'; severity: 'low' | 'medium' | 'high'; createdAt: string; notes: { at: string; by: string; text: string }[]; homeName?: string; robotStatus?: string };
export type Log = { id: string; serial: string; level: 'info' | 'warn' | 'error'; text: string; t: string; at: string };
export type Home = { id: string; name: string; mapReady: boolean; mapping: number | null };
export type Member = { userId: string; role: 'owner' | 'member'; robots: '*' | string[]; user: User };
export type Invite = { code: string; email: string; name: string; robots: '*' | string[]; status: string };
export type Meta = { taskTypes: Record<string, { label: string; minutes: number }>; joints: string[]; rooms: { id: string; name: string; x: number; y: number; w: number; h: number }[]; robotModel: string };
export type Recipe = { name: string; needs: string[]; have: string[]; missing: string[]; minutes: number; service?: string; serviceInstalled: boolean | null };
export type Card =
  | { type: 'robots'; robots: Robot[]; tasks: Task[] }
  | { type: 'task'; task: Task; robot: Robot }
  | { type: 'recipes'; fridge: string[]; recommendations: Recipe[] }
  | { type: 'map'; robots: Robot[]; mapReady: boolean }
  | { type: 'issue'; issue: Issue };

let token = '';
try { token = localStorage.getItem('zipsa.token') || ''; } catch { /* noop */ }
export const getToken = () => token;
export const setToken = (t: string) => { token = t; try { t ? localStorage.setItem('zipsa.token', t) : localStorage.removeItem('zipsa.token'); } catch { /* noop */ } };

const h = () => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) });
export class ApiError extends Error { status: number; constructor(s: number, m: string) { super(m); this.status = s; } }
async function handle<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error || `오류 ${res.status}`);
  return body as T;
}
export const get = <T,>(url: string) => fetch(url, { headers: h() }).then((r) => handle<T>(r));
export const post = <T,>(url: string, body: unknown = {}) => fetch(url, { method: 'POST', headers: h(), body: JSON.stringify(body) }).then((r) => handle<T>(r));
export const patch = <T,>(url: string, body: unknown = {}) => fetch(url, { method: 'PATCH', headers: h(), body: JSON.stringify(body) }).then((r) => handle<T>(r));
export const del = <T,>(url: string) => fetch(url, { method: 'DELETE', headers: h() }).then((r) => handle<T>(r));

type Handlers = { onDelta?: (t: string) => void; onCard?: (c: Card) => void; onTool?: (name: string) => void };
export async function streamChat(url: string, body: unknown, hs: Handlers): Promise<{ mode: string; text: string }> {
  const res = await fetch(url, { method: 'POST', headers: h(), body: JSON.stringify(body) });
  if (!res.ok || !res.body) throw new Error(`서버 오류 (${res.status})`);
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''; let done = { mode: 'unknown', text: '' };
  for (;;) {
    const { value, done: end } = await reader.read(); if (end) break;
    buf += dec.decode(value, { stream: true });
    let i; while ((i = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
      const ev = /^event: (.+)$/m.exec(chunk)?.[1]; const dl = /^data: (.+)$/m.exec(chunk)?.[1]; if (!ev || !dl) continue;
      const data = JSON.parse(dl);
      if (ev === 'delta') hs.onDelta?.(data.text); else if (ev === 'card') hs.onCard?.(data); else if (ev === 'tool') hs.onTool?.(data.name); else if (ev === 'done') done = data; else if (ev === 'error') throw new Error(data.message);
    }
  }
  return done;
}
export const STATUS: Record<Robot['status'], [string, string]> = { run: ['good', '가동 중'], charge: ['warn', '충전 중'], error: ['crit', '오류'], idle: ['idle', '대기'], manual: ['info', '수동 제어'], shipped: ['idle', '미등록'] };
export const fmtDate = (s: string) => s.slice(0, 10);
