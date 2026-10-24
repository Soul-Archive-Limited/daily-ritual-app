// Date keys are local calendar days "YYYY-MM-DD" (same as the web app).

const pad = (n: number) => String(n).padStart(2, '0');

export const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const todayKey = () => keyOf(new Date());

export const addDays = (k: string, n: number) => {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return keyOf(d);
};

export const diffDays = (a: string, b: string) => Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 864e5);

export const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
