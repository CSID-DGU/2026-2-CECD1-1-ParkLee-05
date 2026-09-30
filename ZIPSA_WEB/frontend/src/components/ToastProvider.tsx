import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastContext } from './toast';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((t: string) => {
    setText(t);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setText(null), 2600);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {text !== null && <div className="toast" role="status">{text}</div>}
    </ToastContext.Provider>
  );
}
