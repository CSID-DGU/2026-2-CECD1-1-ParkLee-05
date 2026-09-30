import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ThreadMessage } from './Thread';

export type NewMessage = Omit<ThreadMessage, 'id'>;

/** 대화 목록 상태. add는 새 메시지의 id를 돌려주고, update로 본문을 바꿀 수 있다. */
export function useMessages(initial: NewMessage[] = []) {
  const nextId = useRef(initial.length);
  const [messages, setMessages] = useState<ThreadMessage[]>(() => initial.map((m, id) => ({ ...m, id })));

  const add = useCallback((m: NewMessage) => {
    const id = nextId.current++;
    setMessages(ms => [...ms, { ...m, id }]);
    return id;
  }, []);

  const update = useCallback((id: number, body: ReactNode) => {
    setMessages(ms => ms.map(m => (m.id === id ? { ...m, body } : m)));
  }, []);

  return { messages, add, update };
}
