/** 시연용 가짜 서명 문자열 (seed가 같으면 항상 같은 값) */
export function fakeSignature(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let s = '';
  for (let i = 0; i < 5; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    s += (h >>> 0).toString(16).padStart(8, '0');
  }
  return s;
}
