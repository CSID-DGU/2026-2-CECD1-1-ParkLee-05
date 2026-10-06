import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ToastProvider } from './components/ToastProvider';
import ConsolePage from './pages/console/ConsolePage';
import HomePage from './pages/home/HomePage';
import { loadTab, tabPath } from './pages/home/homeContext';
import StagePage from './pages/stage/StagePage';

/** /home으로 들어오면 마지막으로 본 탭으로 보낸다 (처음이면 대화) */
function LastHomeTab() {
  return <Navigate to={tabPath(loadTab())} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/home" element={<LastHomeTab />} />
          <Route path="/home/:tab" element={<HomePage />} />
          <Route path="/console" element={<ConsolePage />} />
          <Route path="/stage" element={<StagePage />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
