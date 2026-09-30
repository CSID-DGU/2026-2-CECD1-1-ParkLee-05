import { useCallback, useEffect, useRef, useState } from 'react';

/* Web Speech API 음성 인식 (TypeScript DOM 타입에 없어 필요한 부분만 정의) */
interface RecognitionResultList {
  length: number;
  [index: number]: { isFinal: boolean; 0: { transcript: string } };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: RecognitionResultList }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  abort: () => void;
}
type RecognitionConstructor = new () => Recognition;

function getRecognition(): RecognitionConstructor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const EXAMPLES = ['D4 왜 멈췄어?', '어머니 오늘 어떠셔?', '주말에 집 비울 거야'];
const IDENTIFIED = '화자: 보호자 1 · 권한 전체';
const UNSUPPORTED = '이 브라우저에서는 마이크 인식을 쓸 수 없어 예시 발화로 시연합니다.';
const UNAVAILABLE = '마이크를 쓸 수 없는 환경이에요. 예시 발화로 시연합니다.';

interface VoiceOverlayProps {
  onClose: () => void;
  /** 최종 인식 문장 (또는 누른 예시 발화) */
  onFinish: (text: string) => void;
}

export function VoiceOverlay({ onClose, onFinish }: VoiceOverlayProps) {
  const [heard, setHeard] = useState('듣고 있어요…');
  const [speaker, setSpeaker] = useState('화자 인식 대기 중');
  const [note, setNote] = useState(() => (getRecognition() ? '' : UNSUPPORTED));
  const finished = useRef(false);
  const onFinishRef = useRef(onFinish);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);

  const finish = useCallback((text: string) => {
    if (finished.current) return;
    finished.current = true;
    setHeard(text);
    setSpeaker(IDENTIFIED);
    setTimeout(() => onFinishRef.current(text), 550);
  }, []);

  useEffect(() => {
    const SR = getRecognition();
    if (!SR) return;
    let rec: Recognition | null = null;
    try {
      rec = new SR();
      rec.lang = 'ko-KR';
      rec.interimResults = true;
      rec.onresult = ev => {
        const r = ev.results[ev.results.length - 1];
        setHeard(r[0].transcript);
        setSpeaker(IDENTIFIED);
        if (r.isFinal) finish(r[0].transcript);
      };
      rec.onerror = () => setNote(UNAVAILABLE);
      rec.start();
    } catch {
      setNote(UNAVAILABLE);
    }
    return () => {
      try { rec?.abort(); } catch { /* 이미 종료됨 */ }
    };
  }, [finish]);

  return (
    <div className="voice" role="dialog" aria-label="음성 입력">
      <div className="idrow">{speaker}</div>
      <div className="orb" aria-hidden="true" />
      <div className="heard">{heard}</div>
      <div className="idrow">{note}</div>
      <div className="ex">
        <div className="idrow" style={{ textAlign: 'left' }}>또는 예시 발화를 눌러 보세요</div>
        {EXAMPLES.map(t => <button key={t} type="button" onClick={() => finish(t)}>{t}</button>)}
      </div>
      <button type="button" className="btn close" onClick={onClose}>닫기</button>
    </div>
  );
}
