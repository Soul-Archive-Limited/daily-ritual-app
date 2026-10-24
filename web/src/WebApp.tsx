import { useEffect, useMemo, useRef, useState } from 'react';

import type { Step } from '@/db/types';
import { addDays, parseKey, todayKey } from '@/logic/dates';
import { bmiOf, infoCache, overview, pct, rangeKeys } from '@/logic/progress';
import { dayInfo, frac, MILES, slotPct, streakCalc } from '@/logic/scoring';
import { products, shelfState, STATUS_LABEL } from '@/logic/shelf';

import { APPLE_SERVICES_ID, GOOGLE_WEB_CLIENT_ID } from './config';
import { useData } from './data';

const SLOTS = [
  { id: 'am', name: 'Morning', color: 'var(--morning)' },
  { id: 'pm', name: 'Night', color: 'var(--night)' },
  { id: 'health', name: 'Health', color: 'var(--health)' },
] as const;

const RULE: Record<Step['on'], string> = {
  every: 'Every day',
  shampoo: 'Wash days',
  noshampoo: 'No-wash days',
  exfoliate: 'Exfoliation days',
  noexfoliate: 'Non-exfoliation days',
  optional: 'Only if needed',
};

type Tab = 'today' | 'progress' | 'routine' | 'shelf' | 'body';
const TABS: [Tab, string][] = [
  ['today', 'Today'],
  ['progress', 'Progress'],
  ['routine', 'Routine'],
  ['shelf', 'Shelf'],
  ['body', 'Body'],
];

export function WebApp() {
  const s = useData();
  const [tab, setTab] = useState<Tab>('today');
  if (s.checking) return <div className="wrap app muted">Loading…</div>;
  if (!s.user) return <SignIn />;
  const c = s.data.config;
  return (
    <div className="wrap app">
      <div className="row between">
        <div>
          <div className="label">Signed in{s.user.email ? ` as ${s.user.email}` : ''}</div>
          <h1 style={{ fontSize: 30 }}>{c?.name ? `Hi, ${c.name}` : 'Your ritual'}</h1>
        </div>
        <button className="btn line small" onClick={s.signOut}>
          Sign out
        </button>
      </div>
      {s.error ? <div className="notice" style={{ marginTop: 12 }}>{s.error}</div> : null}
      {!c && !s.loading ? (
        <div className="card" style={{ marginTop: 18 }}>
          <h2>Nothing synced yet</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Open Daily Ritual on your iPhone or iPad, go to Profile › Account and sync, and sign in with this same
            account. Your routine and log appear here a moment later.
          </p>
        </div>
      ) : c ? (
        <>
          <div className="tabs" role="tablist">
            {TABS.map(([t, label]) => (
              <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
                {label}
              </button>
            ))}
          </div>
          {tab === 'today' ? <Today /> : tab === 'progress' ? <Progress /> : tab === 'routine' ? <Routine /> : tab === 'shelf' ? <Shelf /> : <Body />}
        </>
      ) : (
        <p className="muted" style={{ marginTop: 18 }}>
          Loading your data…
        </p>
      )}
    </div>
  );
}

declare global {
  interface Window {
    AppleID?: { auth: { init: (o: object) => void; signIn: () => Promise<{ authorization: { id_token: string } }> } };
    google?: {
      accounts: {
        id: {
          initialize: (o: object) => void;
          renderButton: (el: HTMLElement, o: object) => void;
        };
      };
    };
  }
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Couldn’t load ${src}`));
    document.head.appendChild(el);
  });
}

function SignIn() {
  const s = useData();
  const google = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;

  useEffect(() => {
    loadScript('https://accounts.google.com/gsi/client')
      .then(() => {
        window.google?.accounts.id.initialize({
          client_id: GOOGLE_WEB_CLIENT_ID,
          callback: (r: { credential: string }) =>
            s.signIn('google', r.credential).catch(() => setErr('Couldn’t sign in with Google. Try again.')),
        });
        if (google.current)
          window.google?.accounts.id.renderButton(google.current, {
            theme: dark ? 'filled_black' : 'outline',
            size: 'large',
            shape: 'pill',
            text: 'signin_with',
            locale: 'en',
            width: 280,
          });
      })
      .catch(() => {});
    loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js')
      .then(() =>
        window.AppleID?.auth.init({
          clientId: APPLE_SERVICES_ID,
          scope: 'email',
          redirectURI: `${location.origin}/app`,
          usePopup: true,
        }),
      )
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apple = async () => {
    setErr(null);
    try {
      const r = await window.AppleID!.auth.signIn();
      await s.signIn('apple', r.authorization.id_token);
    } catch (e) {
      const code = (e as { error?: string }).error;
      if (code !== 'popup_closed_by_user' && code !== 'user_cancelled_authorize')
        setErr('Couldn’t sign in with Apple. Try again.');
    }
  };

  return (
    <div className="wrap signin">
      <img src="/icon.png" alt="" width={72} height={72} style={{ borderRadius: 18 }} />
      <h1 style={{ fontSize: 30, marginTop: 14 }}>Sign in to Daily Ritual</h1>
      <p className="muted" style={{ marginTop: 8 }}>
        Use the same account you signed in with on your iPhone or iPad. Your routine and log appear here.
      </p>
      <div className="stack">
        <button className="btn" style={{ width: 280, background: dark ? '#fff' : '#000', color: dark ? '#000' : '#fff' }} onClick={apple}>
           Sign in with Apple
        </button>
        <div ref={google} />
        {err ? <p style={{ color: 'var(--empty)' }}>{err}</p> : null}
        <p className="label">Skin photos never leave your phone, so they don’t show here.</p>
      </div>
    </div>
  );
}

function Ring({ p, size = 88 }: { p: number; size?: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" role="img" aria-label={`${pct(p)}% done`}>
      <circle cx="44" cy="44" r={r} fill="none" stroke="var(--fill)" strokeWidth="8" />
      <circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        stroke="var(--sage)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${c * p} ${c}`}
        transform="rotate(-90 44 44)"
      />
      <text x="44" y="50" textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--text)">
        {pct(p)}%
      </text>
    </svg>
  );
}

function Today() {
  const s = useData();
  const { config, steps, days } = s.data;
  const t = todayKey();
  const [k, setK] = useState(t);
  const info = useMemo(() => dayInfo(k, config!, steps, days[k], t), [k, config, steps, days, t]);
  const streak = useMemo(() => streakCalc(config!, steps, days, t), [config, steps, days, t]);
  const water = steps.find((x) => x.type === 'water');
  const label = parseKey(k).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="stack">
      <div className="card row between">
        <div className="row">
          <button className="btn line small" aria-label="Previous day" onClick={() => setK(addDays(k, -1))} disabled={k <= config!.startedAt}>
            ‹
          </button>
          <div>
            <div className="label">{k === t ? 'Today' : 'Past day'}</div>
            <strong>{label}</strong>
          </div>
          <button className="btn line small" aria-label="Next day" onClick={() => setK(addDays(k, 1))} disabled={k >= t}>
            ›
          </button>
        </div>
        <div className="row">
          {streak.cur ? <span className="pill on">🔥 {streak.cur}-day streak</span> : null}
          {info.flags.shampoo ? <span className="pill">Wash day</span> : null}
          {info.flags.travel ? <span className="pill">Travel day</span> : null}
          <Ring p={info.p} />
        </div>
      </div>
      <div className="grid">
        {SLOTS.map((sl) => {
          const list = info.exp.filter((x) => x.slot === sl.id && x.type !== 'water');
          const z = info.slot[sl.id];
          if (!z.n) return null;
          return (
            <div key={sl.id} className="card">
              <div className="head">
                <span className="dot" style={{ background: sl.color }} />
                <h2>{sl.name}</h2>
                <span className="muted">
                  {z.d}/{z.n}
                </span>
              </div>
              <div className="meter">
                <i style={{ width: `${pct(slotPct(z))}%`, background: sl.color }} />
              </div>
              <ul className="steps">
                {list.map((st) => {
                  const done = !!info.done[st.id];
                  return (
                    <li
                      key={st.id}
                      className={`step ${done ? 'done' : ''}`}
                      role="checkbox"
                      aria-checked={done}
                      tabIndex={0}
                      onClick={() => s.tick(k, st.id)}
                      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), s.tick(k, st.id))}>
                      <span className="check" style={done ? { background: sl.color } : undefined}>
                        {done ? '✓' : ''}
                      </span>
                      <span>
                        <div className="name">{st.name}</div>
                        {st.product ? <div className="sub">{st.product}</div> : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        {water && info.exp.some((x) => x.type === 'water') ? (
          <div className="card">
            <div className="head">
              <span className="dot" style={{ background: 'var(--health)' }} />
              <h2>Water</h2>
            </div>
            <div style={{ marginTop: 10 }}>
              <span className="big">{(info.water / 1000).toFixed(1)}</span>
              <span className="unit"> of {((water.goal || 3000) / 1000).toFixed(1)} L</span>
            </div>
            <div className="meter">
              <i style={{ width: `${pct(frac(water, days[k]))}%`, background: 'var(--health)' }} />
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              {[200, 500, 1000].map((ml) => (
                <button key={ml} className="btn line small" onClick={() => s.setWater(k, info.water + ml)}>
                  +{ml >= 1000 ? '1 L' : `${ml} ml`}
                </button>
              ))}
              <button className="btn line small" onClick={() => s.setWater(k, info.water - 200)} disabled={!info.water}>
                −200
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {info.skipped.length ? (
        <p className="label">Skipped this day: {info.skipped.map((x) => x.name).join(', ')}</p>
      ) : null}
    </div>
  );
}

function Progress() {
  const { config, steps, days } = useData().data;
  const t = todayKey();
  const info = useMemo(() => infoCache(config!, steps, days, t), [config, steps, days, t]);
  const keys = useMemo(() => rangeKeys(30, config!.startedAt, t), [config, t]);
  const o = useMemo(() => overview(keys, info, days, config!.startedAt), [keys, info, days, config]);
  const sk = useMemo(() => streakCalc(config!, steps, days, t), [config, steps, days, t]);
  const next = MILES.find((m) => m > sk.cur) ?? sk.cur + 30;

  return (
    <div className="stack">
      <div className="grid">
        <div className="card">
          <div className="label">Last {keys.length} days</div>
          <div className="big" style={{ marginTop: 6 }}>
            {pct(o.avg)}
            <span className="unit">% of steps done</span>
          </div>
          <p className="muted" style={{ marginTop: 6 }}>
            {o.delta == null
              ? 'Not enough earlier history to compare yet.'
              : o.delta > 0
                ? `Up ${o.delta} points from the ${keys.length} days before.`
                : o.delta < 0
                  ? `Down ${Math.abs(o.delta)} points from the ${keys.length} days before.`
                  : 'Same as the period before.'}{' '}
            {o.perfect} perfect {o.perfect === 1 ? 'day' : 'days'}.
          </p>
        </div>
        <div className="card">
          <div className="label">Streak</div>
          <div className="big" style={{ marginTop: 6 }}>
            {sk.cur}
            <span className="unit"> {sk.cur === 1 ? 'day' : 'days'}</span>
          </div>
          <p className="muted" style={{ marginTop: 6 }}>
            {next - sk.cur} to {next} days · best {sk.best} · {sk.shields} of 2 shields
          </p>
        </div>
      </div>
      <div className="card">
        <h2 style={{ fontSize: 20 }}>Each day</h2>
        <div className="bars" aria-label="Share of steps done each day">
          {o.vals.map((v, i) => (
            <span
              key={keys[i]}
              title={`${parseKey(keys[i]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: ${v == null ? 'not logged' : `${pct(v)}%`}`}
              className={v == null ? 'none' : v >= 1 ? 'perfect' : ''}
              style={{ height: `${v == null ? 3 : Math.max(3, v * 100)}%` }}
            />
          ))}
        </div>
      </div>
      <div className="grid">
        {o.slots.map((z) => {
          const sl = SLOTS.find((x) => x.id === z.id)!;
          return (
            <div key={z.id} className="card">
              <div className="head">
                <span className="dot" style={{ background: sl.color }} />
                <h2>{sl.name}</h2>
                <strong>{pct(z.p)}%</strong>
              </div>
              <div className="meter">
                <i style={{ width: `${pct(z.p)}%`, background: sl.color }} />
              </div>
              <p className="label" style={{ marginTop: 10 }}>
                {z.missedMost ? `Missed most: ${z.missedMost[0]} (${z.missedMost[1]}×)` : 'Nothing missed'}
              </p>
            </div>
          );
        })}
      </div>
      {o.logged >= 7 && o.top.length ? (
        <div className="card">
          <h2 style={{ fontSize: 20 }}>What you keep missing</h2>
          <ul style={{ margin: '10px 0 0', paddingLeft: 20 }}>
            {o.top.map((m) => (
              <li key={m.step.id}>
                <strong>{m.step.name}</strong> <span className="muted">missed {m.n} of {m.of}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Routine() {
  const { steps, config } = useData().data;
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return (
    <div className="stack">
      <p className="muted">
        Wash days: {config!.shampooDays.map((d) => wd[d]).join(', ') || 'none'}. Edit your routine in the app.
      </p>
      <div className="grid">
        {SLOTS.map((sl) => (
          <div key={sl.id} className="card">
            <div className="head">
              <span className="dot" style={{ background: sl.color }} />
              <h2>{sl.name}</h2>
            </div>
            <ul className="steps">
              {steps
                .filter((x) => x.slot === sl.id)
                .map((x, i) => (
                  <li key={x.id} className="step" style={{ cursor: 'default', opacity: x.paused ? 0.5 : 1 }}>
                    <span className="label" style={{ width: 20 }}>
                      {i + 1}
                    </span>
                    <span>
                      <div className="name">{x.name}</div>
                      <div className="sub">
                        {[x.product, x.type === 'water' ? `${(x.goal || 3000) / 1000} L a day` : RULE[x.on], x.paused ? 'Paused' : '']
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Shelf() {
  const { steps, shelf, config, days } = useData().data;
  const items = useMemo(
    () =>
      products(steps, shelf)
        .map((p) => ({ p, st: shelfState(p, shelf[p.id], config!, days) }))
        .sort((a, b) => (a.st.left ?? 999) - (b.st.left ?? 999)),
    [steps, shelf, config, days],
  );
  const color = (f: number | null) =>
    f == null ? 'var(--dim)' : f <= 0.15 ? 'var(--empty)' : f <= 0.35 ? 'var(--gold)' : 'var(--sage)';
  return (
    <div className="card">
      <h2 style={{ fontSize: 20 }}>What’s running low first</h2>
      <ul className="steps">
        {items.map(({ p, st }) => (
          <li key={p.id} className="step" style={{ cursor: 'default' }}>
            <span style={{ flex: 1 }}>
              <div className="name">{p.name}</div>
              <div className="sub">
                {STATUS_LABEL[st.status]}
                {st.left != null ? ` · about ${st.left} days left` : ''}
              </div>
              <div className="meter" style={{ maxWidth: 260 }}>
                <i style={{ width: `${pct(st.frac ?? 0)}%`, background: color(st.frac) }} />
              </div>
            </span>
            <strong style={{ color: color(st.frac) }}>{st.frac == null ? '–' : `${pct(st.frac)}%`}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Body() {
  const s = useData();
  const { weighins, config } = s.data;
  const [kg, setKg] = useState('');
  const last = weighins[weighins.length - 1];
  const bmi = last ? bmiOf(last.kg, config!.heightCm) : null;
  const log = () => {
    const v = Number(kg.replace(',', '.'));
    if (v >= 30 && v <= 250) {
      s.logWeight(v);
      setKg('');
    }
  };
  return (
    <div className="stack">
      <div className="card">
        <div className="label">Latest weigh-in</div>
        <div className="big" style={{ marginTop: 6 }}>
          {last ? last.kg : '–'}
          <span className="unit"> kg</span>
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          {last ? parseKey(last.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : 'No weigh-ins yet.'}
          {bmi ? ` · BMI ${bmi.toFixed(1)}` : ''}
        </p>
        <div className="row" style={{ marginTop: 14 }}>
          <input
            className="field"
            inputMode="decimal"
            placeholder="kg"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && log()}
            aria-label="Weight in kilograms"
          />
          <button className="btn small" onClick={log} disabled={!kg}>
            Log weight
          </button>
        </div>
        <p className="label" style={{ marginTop: 12 }}>
          BMI is a rough screen from height and weight only. It doesn’t see muscle.
        </p>
      </div>
      {weighins.length ? (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Weight</th>
                {config!.heightCm ? <th>BMI</th> : null}
              </tr>
            </thead>
            <tbody>
              {[...weighins].reverse().map((w) => (
                <tr key={w.id}>
                  <td>{parseKey(w.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                  <td>{w.kg} kg</td>
                  {config!.heightCm ? <td>{bmiOf(w.kg, config!.heightCm)!.toFixed(1)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
