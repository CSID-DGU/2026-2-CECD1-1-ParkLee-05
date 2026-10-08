import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router';
import { useStore } from './lib/store';
import Auth from './pages/Auth';
import Home from './pages/app/Home'; import Onboard from './pages/app/Onboard'; import Robots from './pages/app/Robots'; import MapPage from './pages/app/Map'; import Members from './pages/app/Members';
import Dashboard from './pages/admin/Dashboard'; import Fleet from './pages/admin/Fleet'; import Issues from './pages/admin/Issues'; import Logs from './pages/admin/Logs'; import Services from './pages/admin/Services';

function Shell({ admin }: { admin: boolean }) {
  const { user, logout, connected, robots, issues } = useStore();
  if (!user) return <Navigate to="/login" replace />;
  if (admin !== (user.role === 'admin')) return <Navigate to={user.role === 'admin' ? '/admin' : '/app'} replace />;
  const bad = robots.filter((r) => r.status === 'error').length; const open = issues.filter((i) => i.status !== 'closed').length;
  const links = admin
    ? [['/admin', '종합 관제', 0], ['/admin/fleet', '로봇 · 계약', bad], ['/admin/issues', '이슈', open], ['/admin/logs', '로그', 0], ['/admin/services', '서비스 업데이트', 0]]
    : [['/app', '대화', 0], ['/app/robots', '로봇 제어', bad], ['/app/map', '실내 맵', 0], ['/app/members', '가족 멤버', 0], ['/app/onboard', '로봇 연결', 0]];
  return (
    <div className="shell">
      <nav className="side" aria-label="메뉴"><div className="brand">ZIPSA <span>{admin ? '슈퍼어드민' : '로봇 관리'}</span></div>
        {links.map(([to, l, n]) => <NavLink key={String(to)} to={String(to)} end={to === '/admin' || to === '/app'}>{l}{!!n && <span className="pill crit">{n}</span>}</NavLink>)}
        <div className="me"><b>{user.name}</b> <span className="mut">{user.role === 'owner' ? '관리자' : user.role === 'member' ? '멤버' : '어드민'}</span><div className="row" style={{ marginTop: 4 }}><span className={`pill ${connected ? 'good' : 'crit'}`}>{connected ? '실시간' : '끊김'}</span><button className="btn sm" onClick={logout}>로그아웃</button></div></div></nav>
      <main className="main"><Outlet /></main>
    </div>
  );
}

export default function App() {
  const { toast, user, restoring } = useStore();
  // 새로고침 직후에는 로그인 상태를 되살린 뒤에 화면을 정한다 (먼저 그리면 로그인 화면으로 튕긴다)
  if (restoring) return null;
  return (<>
    <Routes>
      <Route path="/login" element={<Auth />} />
      <Route path="/app" element={<Shell admin={false} />}><Route index element={<Home />} /><Route path="onboard" element={<Onboard />} /><Route path="robots" element={<Robots />} /><Route path="map" element={<MapPage />} /><Route path="members" element={<Members />} /></Route>
      <Route path="/admin" element={<Shell admin />}><Route index element={<Dashboard />} /><Route path="fleet" element={<Fleet />} /><Route path="issues" element={<Issues />} /><Route path="logs" element={<Logs />} /><Route path="services" element={<Services />} /></Route>
      <Route path="*" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/app') : '/login'} replace />} />
    </Routes>
    {toast && <div className="toast" role="status">{toast}</div>}
  </>);
}
