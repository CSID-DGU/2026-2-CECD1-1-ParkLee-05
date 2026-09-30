/** 피어슨 상관계수 */
export function corr(a: number[], b: number[]) {
  const n = a.length;
  const ma = a.reduce((x, y) => x + y) / n;
  const mb = b.reduce((x, y) => x + y) / n;
  let s = 0, sa = 0, sb = 0;
  for (let i = 0; i < n; i++) {
    s += (a[i] - ma) * (b[i] - mb);
    sa += (a[i] - ma) ** 2;
    sb += (b[i] - mb) ** 2;
  }
  return s / Math.sqrt(sa * sb);
}

/** 최댓값의 인덱스 */
export const peak = (v: number[]) => v.indexOf(Math.max(...v));
