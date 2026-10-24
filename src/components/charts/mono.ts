/** Smooth monotone curve through points (ported from the web app's mono), as an SVG path. */
export function mono(pts: [number, number][]) {
  const n = pts.length;
  if (n < 2) return n ? `M${pts[0][0]},${pts[0][1]}` : '';
  const x = pts.map((p) => p[0]);
  const y = pts.map((p) => p[1]);
  const d: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) d[i] = (y[i + 1] - y[i]) / (x[i + 1] - x[i] || 1);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  let p = `M${x[0].toFixed(1)},${y[0].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = x[i + 1] - x[i];
    p += ` C${(x[i] + h / 3).toFixed(1)},${(y[i] + (m[i] * h) / 3).toFixed(1)} ${(x[i + 1] - h / 3).toFixed(1)},${(y[i + 1] - (m[i + 1] * h) / 3).toFixed(1)} ${x[i + 1].toFixed(1)},${y[i + 1].toFixed(1)}`;
  }
  return p;
}

/** Index of the point nearest an x position. */
export const nearest = (xs: number[], x: number) =>
  xs.reduce((best, v, i) => (Math.abs(v - x) < Math.abs(xs[best] - x) ? i : best), 0);
