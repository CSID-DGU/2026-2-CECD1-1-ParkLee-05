/** 브라우저 TTS로 한국어 문장을 읽는다. 지원하지 않는 환경에서는 아무것도 하지 않는다. */
export function speak(text: string) {
  if (!text || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = 1.02;
    speechSynthesis.speak(u);
  } catch {
    // 음성 합성을 쓸 수 없는 환경
  }
}

export function stopSpeaking() {
  try {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  } catch {
    // 음성 합성을 쓸 수 없는 환경
  }
}
