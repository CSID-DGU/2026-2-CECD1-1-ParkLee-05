export const pad = (n: number) => String(n).padStart(2, '0');

/** 지금부터 min분 뒤의 시각 (HH:MM) */
export function eta(min: number) {
  const d = new Date(Date.now() + min * 60000);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
