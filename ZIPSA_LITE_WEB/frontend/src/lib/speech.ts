// 브라우저 내장 음성 인식(STT)·합성(TTS). 마이크는 HTTPS 또는 localhost 에서만 동작한다.
type SR = { lang: string; interimResults: boolean; onresult: (e: any) => void; onerror: (e: any) => void; onend: () => void; start: () => void; abort: () => void };
export const sttSupported = () => typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

export function listen(h: { onInterim: (t: string) => void; onFinal: (t: string) => void; onError: (msg: string) => void }) {
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) { h.onError('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Edge를 사용해 주세요.'); return () => {}; }
  const rec: SR = new Ctor();
  rec.lang = 'ko-KR'; rec.interimResults = true;
  rec.onresult = (e) => { const r = e.results[e.results.length - 1]; if (r.isFinal) h.onFinal(r[0].transcript); else h.onInterim(r[0].transcript); };
  rec.onerror = (e) => h.onError(e.error === 'not-allowed' ? '마이크 권한이 필요합니다. 주소창의 마이크 아이콘에서 허용해 주세요.' : e.error === 'no-speech' ? '말소리를 듣지 못했어요.' : `음성 인식 오류 (${e.error})`);
  rec.onend = () => {};
  try { rec.start(); } catch { h.onError('음성 인식을 시작할 수 없습니다.'); }
  return () => { try { rec.abort(); } catch { /* noop */ } };
}

export function speak(text: string) {
  try {
    if (!('speechSynthesis' in window) || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\([^)]*\)/g, ''));
    u.lang = 'ko-KR'; u.rate = 1.03;
    const ko = speechSynthesis.getVoices().find((v) => v.lang.startsWith('ko'));
    if (ko) u.voice = ko;
    speechSynthesis.speak(u);
  } catch { /* noop */ }
}
export const stopSpeaking = () => { try { speechSynthesis.cancel(); } catch { /* noop */ } };
