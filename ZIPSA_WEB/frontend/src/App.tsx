import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ToastProvider } from './components/ToastProvider';
import ConsolePage from './pages/console/ConsolePage';
import HomePage from './pages/home/HomePage';
import StagePage from './pages/stage/StagePage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/home" element={<HomePage />} />
          <Route path="/console" element={<ConsolePage />} />
          <Route path="/stage" element={<StagePage />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
