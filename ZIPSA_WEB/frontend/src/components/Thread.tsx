import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export interface ThreadMessage {
  id: number;
  me?: boolean;
  who?: string;
  /** 아바타 글자 (기본값: 집) */
  av?: string;
  avStyle?: CSSProperties;
  body: ReactNode;
  /** 말풍선 아래 고정폭 글꼴로 보여 줄 원본 프로토콜 이벤트 */
  proto?: string;
}

/** 대화 목록. 메시지가 바뀌거나 화면에 다시 보이면 맨 아래로 스크롤한다. */
export function Thread({ messages, visible = true }: { messages: ThreadMessage[]; visible?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && visible) el.scrollTop = el.scrollHeight;
  }, [messages, visible]);

  return (
    <div className="thread" ref={ref} aria-live="polite">
      {messages.map(m => (
        <div key={m.id} className={m.me ? 'msg me' : 'msg'}>
          {!m.me && <div className="av" style={m.avStyle}>{m.av ?? '집'}</div>}
          <div className="bub">
            {m.who && <div className="who">{m.who}</div>}
            <div className="body">{m.body}</div>
            {m.proto && <div className="proto">{m.proto}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Typing() {
  return <span className="typing" aria-label="답변 작성 중"><i /><i /><i /></span>;
}
