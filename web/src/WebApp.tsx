import { useEffect, useMemo, useRef, useState } from 'react';

import type { Step } from '@/db/types';
import { addDays, parseKey, todayKey } from '@/logic/dates';
import { bmiOf, infoCache, overview, pct, rangeKeys } from '@/logic/progress';
import { greeting } from '@/logic/dates';
import { rewardsFor, LEVELS } from '@/logic/rewards';
import { currentSlot, dayInfo, frac, MILES, motive, nextUp, streakCalc } from '@/logic/scoring';
import { products, shelfState, STATUS_LABEL } from '@/logic/shelf';

import { APPLE_SERVICES_ID, GOOGLE_WEB_CLIENT_ID } from './config';
import { useData } from './data';
import { healthTint, Icon, Lune, Medal, Orb, QuestRing, WaterBody, type LuneMood } from './glow';

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

type Tab = 'today' | 'rewards' | 'progress' | 'routine' | 'shelf' | 'body';
const TABS: [Tab, string][] = [
  ['today', 'Today'],
  ['rewards', 'Rewards'],
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
      <div className="row between app-head" style={{ alignItems: 'flex-end' }}>
        <div>
          <div className="label">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <h1>
            {greeting()},<b>{c?.name ? `${c.name}.` : 'there.'}</b>
          </h1>
        </div>
        <button className="btn ghost small" onClick={s.signOut} title={s.user.email ?? undefined}>
          {s.demo ? 'Leave the demo' : 'Sign out'}
        </button>
      </div>
      {s.demo ? (
        <div className="notice" style={{ marginTop: 14 }}>
          This is a demo with sample data. Changes stay in this tab. Get the app to start your own ritual.
        </div>
      ) : null}
      {s.error ? (
        <div className="notice" style={{ marginTop: 12 }}>
          {s.error}
        </div>
      ) : null}
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
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                className={tab === t ? 'on' : ''}
                onClick={() => setTab(t)}>
                {label}
              </button>
            ))}
          </div>
          {tab === 'today' ? (
            <Today />
          ) : tab === 'rewards' ? (
            <Rewards />
          ) : tab === 'progress' ? (
            <Progress />
          ) : tab === 'routine' ? (
            <Routine />
          ) : tab === 'shelf' ? (
            <Shelf />
          ) : (
            <Body />
          )}
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
      <Lune mood="happy" size={110} id="signin" />
      <h1>
        Welcome <b>back.</b>
      </h1>
      <p className="muted" style={{ marginTop: 8 }}>
        Use the same account you signed in with on your iPhone or iPad. Your routine and log appear here.
      </p>
      <div className="stack">
        <button className="btn" style={{ width: 280 }} onClick={apple}>
          Sign in with Apple
        </button>
        <div ref={google} />
        {err ? <p style={{ color: 'var(--empty)' }}>{err}</p> : null}
        <p className="label">Skin photos never leave your phone, so they don’t show here.</p>
      </div>
    </div>
  );
}

/** How Lune feels about today (same rules as the app). */
function moodFor(p: number, streakCur: number, todayGood: boolean): LuneMood {
  const h = new Date().getHours();
  if (p >= 1) return 'cheer';
  if (streakCur > 0 && !todayGood && h >= 18) return 'worried';
  return 'happy';
}

function Today() {
  const s = useData();
  const { config, steps, days, checkins } = s.data;
  const t = todayKey();
  const [k, setK] = useState(t);
  const [open, setOpen] = useState<'am' | 'pm' | 'health'>(currentSlot());
  const info = useMemo(() => dayInfo(k, config!, steps, days[k], t), [k, config, steps, days, t]);
  const streak = useMemo(() => streakCalc(config!, steps, days, t), [config, steps, days, t]);
  const r = useMemo(
    () =>
      rewardsFor(
        config!,
        steps,
        days,
        checkins.map((x) => x.date),
        t,
      ),
    [config, steps, days, checkins, t],
  );
  const dx = r.byDay[k] ?? r.today;
  const water = steps.find((x) => x.type === 'water');
  const isToday = k === t;
  const label = parseKey(k).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const m = motive(isToday, parseKey(k).toLocaleDateString('en-GB', { weekday: 'long' }), info, streak);
  const nu = isToday ? nextUp(info) : null;
  const list = info.exp.filter((x) => x.slot === open && x.type !== 'water');

  return (
    <div className="today">
      <div className="stack">
        <div className="row">
          <button
            className="btn ghost small"
            aria-label="Previous day"
            onClick={() => setK(addDays(k, -1))}
            disabled={k <= config!.startedAt}>
            ‹
          </button>
          <strong style={{ fontWeight: 500 }}>{isToday ? 'Today' : label}</strong>
          <button
            className="btn ghost small"
            aria-label="Next day"
            onClick={() => setK(addDays(k, 1))}
            disabled={k >= t}>
            ›
          </button>
        </div>
        <div className="row">
          {streak.cur ? (
            <span className="chip ink">
              <Icon name="flame" size={13} /> {streak.cur}-day glow
            </span>
          ) : null}
          <span className="chip">
            <Icon name="sparkles" size={13} /> {dx.total} / {dx.goal} XP
          </span>
          {info.flags.shampoo ? <span className="chip">Wash day</span> : null}
          {info.flags.travel ? <span className="chip">Travel day</span> : null}
        </div>
        <Orb p={info.p} label={isToday ? 'Today’s glow' : 'That day'} />
        <div className="lune-says">
          <Lune mood={moodFor(info.p, streak.cur, streak.todayGood)} size={54} id="says" />
          <div>
            <div className="who">LUNE</div>
            <div>
              {m.before}
              {m.em ? <b>{m.em}</b> : null}
              {m.after ?? ''}
            </div>
          </div>
        </div>
        {nu ? (
          <div className="card">
            <div className="eyebrow">Up next · {SLOTS.find((x) => x.id === nu.slot)!.name}</div>
            <h3 style={{ fontSize: 24, marginTop: 4 }}>{nu.step.name}</h3>
            {nu.step.product ? <p className="muted">{nu.step.product}</p> : null}
            <button
              className="btn"
              style={{ marginTop: 14, width: '100%', background: 'var(--aura)', color: '#fff' }}
              onClick={() => s.tick(k, nu.step.id)}>
              Mark done
            </button>
          </div>
        ) : null}
        {info.total ? (
          <div className="card">
            <div className="row between">
              <h3>Daily quests</h3>
              <span className="label">{dx.quests.filter((q) => q.done).length}/3</span>
            </div>
            <div className="row" style={{ margin: '10px 0 4px', flexWrap: 'nowrap' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                {dx.total}
                <span className="muted" style={{ fontWeight: 500 }}>
                  {' '}
                  / {dx.goal} XP
                </span>
              </span>
              <span className="goal">
                <i style={{ width: `${Math.min(100, (dx.total / dx.goal) * 100)}%` }} />
              </span>
            </div>
            {dx.quests.map((q) => (
              <div key={q.id} className={`quest ${q.done ? 'done' : ''}`}>
                <QuestRing p={q.p} />
                <span className="t">{q.title}</span>
                <span className="xp">+{q.xp} XP</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="stack">
        <div className="rituals" role="tablist">
          {SLOTS.map((sl) => {
            const z = info.slot[sl.id];
            const full = z.n > 0 && z.d === z.n;
            return (
              <button
                key={sl.id}
                role="tab"
                aria-selected={open === sl.id}
                className={`ritual ${sl.id === 'pm' ? 'night' : ''} ${open === sl.id ? 'on' : ''}`}
                onClick={() => setOpen(sl.id)}>
                <div className="head">
                  <span className="ic" style={{ color: sl.id === 'pm' ? '#fff' : sl.color }}>
                    <Icon name={sl.id === 'am' ? 'sun' : sl.id === 'pm' ? 'moon' : 'drop'} />
                  </span>
                  {sl.name}
                </div>
                <div className="k">{!z.n ? 'Nothing today' : full ? 'All done' : `${z.n - z.d} still to do`}</div>
                <div className="row between" style={{ alignItems: 'flex-end', flexWrap: 'nowrap' }}>
                  <div className="n">
                    {z.d}
                    <small>/{z.n}</small>
                  </div>
                  {full ? (
                    <span className="qdone" style={{ width: 30, height: 30 }}>
                      <Icon name="check" size={14} />
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="card">
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
                  <span className="check">{done ? <Icon name="check" size={15} /> : null}</span>
                  <span>
                    <div className="name">{st.name}</div>
                    {st.product || st.note ? (
                      <div className="sub">{[st.product, st.note].filter(Boolean).join(' · ')}</div>
                    ) : null}
                  </span>
                </li>
              );
            })}
            {!list.length ? (
              <li className="muted" style={{ padding: 12 }}>
                Nothing in this ritual today.
              </li>
            ) : null}
          </ul>
        </div>

        {water && info.exp.some((x) => x.type === 'water') ? (
          <div className="card row" style={{ gap: 22, alignItems: 'center', flexWrap: 'nowrap' }}>
            <WaterBody
              p={frac(water, days[k])}
              health={info.slot.health.n ? info.slot.health.f / info.slot.health.n : 0}
              onTap={() => s.setWater(k, info.water + 250)}
            />
            <div style={{ flex: 1 }}>
              <div className="eyebrow">Water</div>
              <div style={{ marginTop: 6 }}>
                <span className="big">{(info.water / 1000).toFixed(1)}</span>
                <span className="unit"> of {((water.goal || 3000) / 1000).toFixed(1)} L</span>
              </div>
              <span className="chip" style={{ marginTop: 8 }}>
                <span
                  className="dot"
                  style={{ background: healthTint(info.slot.health.n ? info.slot.health.f / info.slot.health.n : 0).b }}
                />
                {healthTint(info.slot.health.n ? info.slot.health.f / info.slot.health.n : 0).word} · Health{' '}
                {pct(info.slot.health.n ? info.slot.health.f / info.slot.health.n : 0)}%
              </span>
              <div className="row" style={{ marginTop: 12 }}>
                {[200, 500, 1000].map((ml) => (
                  <button key={ml} className="btn ghost small" onClick={() => s.setWater(k, info.water + ml)}>
                    +{ml >= 1000 ? '1 L' : `${ml} ml`}
                  </button>
                ))}
                <button
                  className="btn ghost small"
                  onClick={() => s.setWater(k, info.water - 200)}
                  disabled={!info.water}>
                  −200
                </button>
              </div>
              <p className="label" style={{ marginTop: 8 }}>
                Tap the body for a glass.
              </p>
            </div>
          </div>
        ) : null}
        {info.skipped.length ? (
          <p className="label">Skipped this day: {info.skipped.map((x) => x.name).join(', ')}</p>
        ) : null}
      </div>
    </div>
  );
}

function Rewards() {
  const { config, steps, days, checkins } = useData().data;
  const t = todayKey();
  const r = useMemo(
    () =>
      rewardsFor(
        config!,
        steps,
        days,
        checkins.map((x) => x.date),
        t,
      ),
    [config, steps, days, checkins, t],
  );
  const R = 32;
  const C = 2 * Math.PI * R;
  const next = LEVELS[r.level.n] ?? `${r.level.name} +1`;
  const you = r.league.find((w) => w.you)!;
  const above = r.league.find((w) => w.rank === you.rank - 1);
  return (
    <div className="stack">
      <div className="dark-card level">
        <div className="lv">
          <svg viewBox="0 0 74 74" width={74} height={74}>
            <defs>
              <linearGradient id="lvg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FFB27A" />
                <stop offset="0.55" stopColor="#F06FA5" />
                <stop offset="1" stopColor="#9B7BF2" />
              </linearGradient>
            </defs>
            <circle cx={37} cy={37} r={R} fill="none" stroke="rgba(128,128,128,0.25)" strokeWidth={5} />
            <circle
              cx={37}
              cy={37}
              r={R}
              fill="none"
              stroke="url(#lvg)"
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={`${C * Math.max(0.02, r.level.p)} ${C}`}
              transform="rotate(-90 37 37)"
            />
          </svg>
          <b>{r.level.n}</b>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 22 }}>
            Level {r.level.n} · {r.level.name}
          </h3>
          <p className="muted">
            {r.total.toLocaleString('en-GB')} XP · {r.level.to - r.total} to {next}
          </p>
          <div className="goal" style={{ marginTop: 10, maxWidth: 360 }}>
            <i style={{ width: `${r.level.p * 100}%` }} />
          </div>
        </div>
        <Lune mood="happy" size={70} id="lvl" />
      </div>
      <div className="grid">
        <div className="card">
          <h3>Glow league</h3>
          <p className="muted">
            {you.rank === 1
              ? 'This week is your best of the last five. Keep it there.'
              : above
                ? `${above.xp - you.xp + 1} XP to pass ${above.label.toLowerCase()}.`
                : 'You against your own past weeks.'}
          </p>
          <div className="league">
            {r.league.map((w) => (
              <div key={w.week} className={`lrow ${w.you ? 'you' : ''}`}>
                <span className="rk">{w.rank}</span>
                <b>{w.label}</b>
                <span>{w.xp} XP</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="row between">
            <h3>Badges</h3>
            <span className="label">
              {r.badges.filter((b) => b.got).length} of {r.badges.length}
            </span>
          </div>
          <div className="badges">
            {r.badges.map((b) => (
              <div key={b.id} className={b.got ? '' : 'off'} title={b.desc}>
                <Medal badge={b} />
                <b>{b.name}</b>
                <small>{b.got ? b.desc : `${b.have}/${b.need}`}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
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
                <strong>{m.step.name}</strong>{' '}
                <span className="muted">
                  missed {m.n} of {m.of}
                </span>
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
                        {[
                          x.product,
                          x.type === 'water' ? `${(x.goal || 3000) / 1000} L a day` : RULE[x.on],
                          x.paused ? 'Paused' : '',
                        ]
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
          {last
            ? parseKey(last.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
            : 'No weigh-ins yet.'}
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
                  <td>
                    {parseKey(w.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
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
