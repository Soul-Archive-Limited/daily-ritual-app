// Sun position, UV and the day's strong-sun window. Live data from Open-Meteo (free, no key);
// falls back to a clear-sky estimate from the sun's position when offline.

export type SunDay = {
  /** Local date at the place, YYYY-MM-DD */
  date: string;
  /** IANA time zone of the place */
  tz: string;
  rise: number | null;
  set: number | null;
  /** Peak UV for the day */
  peak: number;
  peakAt: number | null;
  /** Strong-sun window: UV ≥ 3 */
  strongStart: number | null;
  strongEnd: number | null;
  /** Hourly UV, epoch ms */
  hourly: { t: number; uv: number }[];
  live: boolean;
  fetchedAt: number;
  lat: number;
  lon: number;
};

/** Solar altitude in degrees (ported from the web app). */
export function sunAlt(ms: number, lat: number, lon: number) {
  const r = Math.PI / 180;
  const d = ms / 864e5 + 2440587.5 - 2451545;
  const g = (357.529 + 0.98560028 * d) * r;
  const q = 280.459 + 0.98564736 * d;
  const Ls = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * r;
  const e = (23.439 - 3.6e-7 * d) * r;
  const dec = Math.asin(Math.sin(e) * Math.sin(Ls));
  const RA = Math.atan2(Math.cos(e) * Math.sin(Ls), Math.cos(Ls));
  const gm = (((18.697374558 + 24.06570982441908 * d) % 24) + 24) % 24;
  const H = (gm * 15 + lon) * r - RA;
  return Math.asin(Math.sin(lat * r) * Math.sin(dec) + Math.cos(lat * r) * Math.cos(dec) * Math.cos(H)) / r;
}

const uvOfAlt = (alt: number) => (alt > 0 ? 12.5 * Math.pow(Math.sin((alt * Math.PI) / 180), 2.42) : 0);

/** Word for a UV value, judged on the whole number shown next to it. */
export const uvWord = (raw: number) => {
  const u = Math.round(raw);
  return u < 3 ? 'Low' : u < 6 ? 'Moderate' : u < 8 ? 'High' : u < 11 ? 'Very high' : 'Extreme';
};

/** Start of today (device clock) in epoch ms. */
const startOfToday = () => {
  const m = new Date();
  m.setHours(0, 0, 0, 0);
  return m.getTime();
};

/** Clear-sky estimate for today from the sun's position. */
export function estimateDay(lat: number, lon: number, tz: string): SunDay {
  const t0 = startOfToday();
  let rise: number | null = null;
  let set: number | null = null;
  let prev: number | null = null;
  const hourly: SunDay['hourly'] = [];
  for (let i = 0; i <= 24 * 12; i++) {
    const t = t0 + i * 3e5;
    const a = sunAlt(t, lat, lon);
    if (prev != null) {
      if (prev < -0.83 && a >= -0.83) rise = t;
      if (prev >= -0.83 && a < -0.83) set = t;
    }
    prev = a;
    if (i % 12 === 0) hourly.push({ t, uv: uvOfAlt(a) });
  }
  return { ...summarise(hourly), date: localDate(t0), tz, rise, set, live: false, fetchedAt: Date.now(), lat, lon };
}

/** Peak and strong-sun window from hourly UV. The window is interpolated to the minute. */
function summarise(hourly: SunDay['hourly']) {
  let peak = 0;
  let peakAt: number | null = null;
  let strongStart: number | null = null;
  let strongEnd: number | null = null;
  hourly.forEach((h, i) => {
    if (h.uv > peak) {
      peak = h.uv;
      peakAt = h.t;
    }
    const p = hourly[i - 1];
    if (p && p.uv < 3 && h.uv >= 3 && strongStart == null)
      strongStart = p.t + ((3 - p.uv) / (h.uv - p.uv)) * (h.t - p.t);
    if (p && p.uv >= 3 && h.uv < 3) strongEnd = p.t + ((p.uv - 3) / (p.uv - h.uv)) * (h.t - p.t);
  });
  if (strongStart != null && strongEnd == null) strongEnd = hourly[hourly.length - 1].t;
  return { peak, peakAt, strongStart, strongEnd, hourly };
}

const localDate = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

type OpenMeteo = {
  utc_offset_seconds: number;
  timezone: string;
  hourly: { time: string[]; uv_index: (number | null)[] };
  daily: { time: string[]; uv_index_max: (number | null)[]; sunrise: string[]; sunset: string[] };
};

/** "2026-10-22T07:13" at a place with this UTC offset → epoch ms. */
const atPlace = (iso: string, offsetSec: number) => Date.parse(`${iso}:00Z`) - offsetSec * 1000;

/** Live UV for today at the place (its own local date). */
export async function fetchSunDay(lat: number, lon: number, signal?: AbortSignal): Promise<SunDay> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}` +
    '&hourly=uv_index&daily=uv_index_max,sunrise,sunset&timezone=auto&forecast_days=1';
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const j = (await res.json()) as OpenMeteo;
  const off = j.utc_offset_seconds;
  const hourly = j.hourly.time.map((t, i) => ({ t: atPlace(t, off), uv: j.hourly.uv_index[i] ?? 0 }));
  const s = summarise(hourly);
  const max = j.daily.uv_index_max[0];
  return {
    ...s,
    peak: max != null ? Math.max(max, s.peak) : s.peak,
    date: j.daily.time[0],
    tz: j.timezone,
    rise: j.daily.sunrise[0] ? atPlace(j.daily.sunrise[0], off) : null,
    set: j.daily.sunset[0] ? atPlace(j.daily.sunset[0], off) : null,
    live: true,
    fetchedAt: Date.now(),
    lat,
    lon,
  };
}

/** Hours and minutes at the place. */
export const hmAt = (ms: number | null, tz?: string) =>
  ms == null
    ? '–'
    : new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', ...(tz ? { timeZone: tz } : {}) });

/** Distance in km between two points (haversine). */
export function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLon = (b.lon - a.lon) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export type SunAdvice = { line: string; reapplyAt: number | null };

/**
 * The one advice line under the arc (web sunCard wording).
 * `spfAt` is when today's face sunscreen was ticked; `reapplied` are logged reapply times.
 */
export function sunAdvice(day: SunDay, spfAt: number | null, reapplied: number[], now = Date.now()): SunAdvice {
  const pk = Math.round(day.peak);
  const end = day.strongEnd ?? 0;
  if (pk < 3) return { line: 'UV stays low today. Morning SPF is still worth it.', reapplyAt: null };
  if (!spfAt && now < end)
    return {
      line: `Put on SPF before ${hmAt(day.strongStart, day.tz)}. UV is ${uvWord(pk).toLowerCase()} at midday.`,
      reapplyAt: null,
    };
  if (spfAt && now < end) {
    const last = Math.max(spfAt, ...reapplied);
    const re = Math.max(last + 2 * 36e5, day.strongStart ?? 0);
    return re < end
      ? { line: `Outside? Reapply face and body SPF around ${hmAt(re, day.tz)}.`, reapplyAt: re }
      : { line: 'If you’re outside late, reapply before heading out.', reapplyAt: null };
  }
  return { line: 'Strong-sun hours are over for today.', reapplyAt: null };
}
