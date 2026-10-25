// The landing page: real app screens in 3D phones, a scroll-lit statement, a bento of live
// illustrations, and Lune as a chat buddy. Everything is drawn in code; there are no photos.
import type { CSSProperties, ReactNode } from 'react';

import { Icon, Lune, Medal, Orb, QuestRing } from './glow';
import { Footer } from './pages';
import { Link } from './router';
import { useReveal, useScrollP, useTilt } from './scroll';

/* ---------- Phone and its screens ---------- */

function Phone({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`phone ${className}`} style={style}>
      <div className="screen">
        <div className="island" />
        <div className="status">
          <span>9:41</span>
          <span className="sig" />
        </div>
        {children}
      </div>
    </div>
  );
}

function TodayScreen() {
  return (
    <div className="scr pearl">
      <div className="s-date">Sunday 25 October</div>
      <div className="s-thin">Good evening,</div>
      <div className="s-bold">Alex.</div>
      <div className="s-chips">
        <span className="chip ink">
          <Icon name="flame" size={11} /> 13-day glow
        </span>
        <span className="chip">
          <Icon name="sparkles" size={11} /> 140 / 200 XP
        </span>
      </div>
      <div className="s-orb">
        <Orb p={0.62} size={168} />
      </div>
      <div className="s-says">
        <Lune size={34} id="ph-says" />
        <div>
          <b>4 more steps</b> keep your 13-day glow.
        </div>
      </div>
      <div className="s-card">
        <div className="eyebrow">
          Up next · <span style={{ color: 'var(--night)' }}>Night</span>
        </div>
        <div className="s-step">Face wash</div>
        <div className="s-slide">
          <span className="knob">
            <Icon name="check" size={13} />
          </span>
          Slide to mark done ›››
        </div>
      </div>
    </div>
  );
}

const NIGHT_STEPS = ['Brush teeth', 'Shower', 'Face wash', 'Face exfoliant', 'Moisturiser', 'Lip balm'];

function NightScreen() {
  return (
    <div className="scr pearl">
      <div className="s-night">
        <div className="row" style={{ gap: 8 }}>
          <span className="s-ic">
            <Icon name="moon" size={14} />
          </span>
          Night ritual
        </div>
        <div className="s-meta">Wash night · 6 steps</div>
        <div className="s-n">
          4<small>/6</small>
        </div>
      </div>
      <div className="s-list">
        {NIGHT_STEPS.map((n, i) => (
          <div key={n} className="s-row" style={{ '--i': i } as CSSProperties}>
            <span className="s-ck">
              <Icon name="check" size={11} />
            </span>
            <span>
              {n}
              <small>{['Marvis', 'Bar soap', 'CeraVe Hydrating', 'AHA 8%', 'Atoderm Crème', 'Vaseline'][i]}</small>
            </span>
            <em>+10</em>
          </div>
        ))}
      </div>
    </div>
  );
}

function RewardsScreen() {
  return (
    <div className="scr pearl">
      <div className="s-bold" style={{ fontSize: 26, marginTop: 6 }}>
        Rewards
      </div>
      <div className="s-level">
        <span className="s-lv">5</span>
        <div>
          <b>Level 5 · Bloom</b>
          <small>3,120 XP · 1,380 to Glow</small>
          <span className="goal" style={{ display: 'block', marginTop: 6 }}>
            <i style={{ width: '42%' }} />
          </span>
        </div>
      </div>
      <div className="s-card" style={{ padding: '6px 12px' }}>
        {[
          ['Finish your night ritual', 1],
          ['Drink 3 L of water', 0.6],
          ['Reapply sunscreen once', 0],
        ].map(([t, p]) => (
          <div key={t as string} className={`quest small ${p === 1 ? 'done' : ''}`}>
            <QuestRing p={p as number} />
            <span className="t">{t}</span>
            <span className="xp">+20</span>
          </div>
        ))}
      </div>
      <div className="s-medals">
        <Medal badge={{ icon: 'flame.fill', tone: 'aura', got: true }} size={44} />
        <Medal badge={{ icon: 'star.fill', tone: 'skin', got: true }} size={44} />
        <Medal badge={{ icon: 'drop.fill', tone: 'health', got: true }} size={44} />
        <Medal badge={{ icon: 'sunrise.fill', tone: 'morning', got: true }} size={44} />
        <Medal badge={{ icon: 'moon.stars.fill', tone: 'night', got: false }} size={44} />
        <Medal badge={{ icon: 'crown.fill', tone: 'gold', got: false }} size={44} />
      </div>
    </div>
  );
}

function CelebrateScreen() {
  return (
    <div className="scr aura">
      <i className="confetti" />
      <div className="s-cel">
        <Lune mood="cheer" size={118} id="ph-cel" />
        <div className="s-flame">13 day glow</div>
        <div className="s-thin" style={{ color: '#fff', textAlign: 'center' }}>
          Night ritual
        </div>
        <div className="s-bold" style={{ color: '#fff', textAlign: 'center' }}>
          done.
        </div>
        <div className="s-tiles">
          <span>
            <b>+70</b>XP
          </span>
          <span>
            <b>2/3</b>quests
          </span>
          <span>
            <b>5</b>Bloom
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- 3D objects used inline in text ---------- */

function Obj({ kind }: { kind: 'orb' | 'check' | 'flame' | 'drop' | 'lune' }) {
  if (kind === 'lune')
    return (
      <span className="obj obj-lune" aria-hidden="true">
        <Lune size={44} id="obj" />
      </span>
    );
  return (
    <span className={`obj obj-${kind}`} aria-hidden="true">
      {kind === 'check' ? <Icon name="check" size={18} /> : kind === 'flame' ? <Icon name="flame" size={18} /> : null}
    </span>
  );
}

/* ---------- Sections ---------- */

function Hero() {
  const stage = useScrollP<HTMLDivElement>('enter');
  return (
    <section className="lp-hero">
      <div className="wrap center">
        <span className="award">
          <Icon name="sparkles" size={15} /> Free, private and open source
        </span>
        <h1>
          Your glow,
          <b>
            <em>every</em> day.
          </b>
        </h1>
        <p className="lead">
          The calm skin, hair and body ritual for iPhone and iPad. Slide each step done, keep your streak, and let Lune
          cheer you on.
        </p>
        <div className="actions">
          <Link className="btn" to="/app">
            Open the web app
          </Link>
          <a className="btn line" href="/app?demo">
            Try the demo
          </a>
        </div>
      </div>
      <div className="stage" ref={stage}>
        <div className="stage-aura" />
        <Phone className="hero-phone">
          <TodayScreen />
        </Phone>
        <div className="hero-lune">
          <Lune size={150} id="hero-lune" />
        </div>
        <span className="fl fl1">
          <span className="qdone" style={{ width: 26, height: 26 }}>
            <Icon name="check" size={12} />
          </span>
          Morning ritual done
        </span>
        <span className="fl fl2">
          <b style={{ color: 'var(--rose)' }}>+10 XP</b>
        </span>
        <span className="fl fl3">
          <Icon name="sun" size={14} /> UV 7 · reapply 14:10
        </span>
      </div>
    </section>
  );
}

const WORDS: (string | ['obj', 'orb' | 'check' | 'flame' | 'drop' | 'lune'])[] = [
  'Daily',
  'Ritual',
  'turns',
  'your',
  'skin,',
  'hair',
  'and',
  'body',
  'care',
  'into',
  'a',
  ['obj', 'orb'],
  'calm',
  'daily',
  'ritual.',
  'Slide',
  'each',
  ['obj', 'check'],
  'step',
  'done,',
  'keep',
  'your',
  ['obj', 'flame'],
  'streak',
  'glowing,',
  'stay',
  ['obj', 'drop'],
  'hydrated,',
  'and',
  'let',
  ['obj', 'lune'],
  'Lune',
  'cheer',
  'you',
  'on.',
];

function Statement() {
  const ref = useScrollP<HTMLDivElement>('pass');
  const n = WORDS.length;
  return (
    <section className="lp-statement" ref={ref}>
      <div className="wrap narrow">
        <p className="lit" style={{ '--n': n } as CSSProperties}>
          {WORDS.map((w, i) =>
            typeof w === 'string' ? (
              <span key={i} className="w" style={{ '--i': i } as CSSProperties}>
                {w}{' '}
              </span>
            ) : (
              <span key={i} className="w" style={{ '--i': i } as CSSProperties}>
                <Obj kind={w[1]} />{' '}
              </span>
            ),
          )}
        </p>
        <p className="lit-after">All private. All free. All yours.</p>
      </div>
    </section>
  );
}

function Fan() {
  const ref = useScrollP<HTMLDivElement>('sticky');
  return (
    <section className="lp-fan" ref={ref}>
      <div className="fan-sticky">
        <div className="fan">
          <Phone className="fp fp-l">
            <NightScreen />
          </Phone>
          <Phone className="fp fp-c">
            <CelebrateScreen />
          </Phone>
          <Phone className="fp fp-r">
            <RewardsScreen />
          </Phone>
        </div>
        <div className="fan-cap">
          <h2>
            Every step, <b>one tap away.</b>
          </h2>
          <p className="muted">
            Tick your night ritual, watch the XP add up, and finish to a little celebration. It never nags; it just
            makes the habit feel good.
          </p>
        </div>
      </div>
    </section>
  );
}

const CHIPS: [string, string][] = [
  ['Brush teeth', 'var(--morning)'],
  ['Face wash', 'var(--morning)'],
  ['Vitamin C', 'var(--morning)'],
  ['Sunscreen SPF 50', 'var(--morning)'],
  ['Shampoo', 'var(--night)'],
  ['Conditioner', 'var(--night)'],
  ['Exfoliant', 'var(--night)'],
  ['Night cream', 'var(--night)'],
  ['Water 3 L', 'var(--health)'],
  ['B-complex', 'var(--health)'],
  ['Hair oil', 'var(--night)'],
  ['Lip balm', 'var(--night)'],
];

function Bento({ wide, title, children }: { wide?: boolean; title: ReactNode; children: ReactNode }) {
  const tilt = useTilt<HTMLDivElement>(4);
  const reveal = useReveal<HTMLDivElement>();
  return (
    <div className={`bento ${wide ? 'wide' : ''}`} ref={reveal}>
      <div className="bento-in" ref={tilt}>
        <div className="bento-art">{children}</div>
        <h3>{title}</h3>
      </div>
    </div>
  );
}

function Features() {
  const days = Array.from({ length: 28 }, (_, i) => i);
  return (
    <section className="wrap lp-bento">
      <h2 className="center">
        Everything your routine needs,
        <br />
        <b>nothing it doesn’t.</b>
      </h2>
      <div className="bentos">
        <Bento wide title="Morning, night and health, built around your wash days">
          <div className="marquee">
            {[0, 1].map((r) => (
              <div key={r} className={`mq ${r ? 'rev' : ''}`}>
                {[...CHIPS, ...CHIPS].map(([t, c], i) => (
                  <span key={i} className="mchip">
                    <span className="dot" style={{ background: c }} />
                    {t}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </Bento>
        <Bento title="A streak that forgives the odd miss">
          <div className="cal">
            {days.map((d) => (
              <i key={d} className={d === 9 ? 'sh' : d < 25 ? 'on' : ''} style={{ '--i': d } as CSSProperties}>
                {d === 9 ? <Icon name="shield" size={12} /> : null}
              </i>
            ))}
          </div>
        </Bento>
        <Bento title="Sun and UV wherever you travel">
          <svg className="uv" viewBox="0 0 300 140" aria-hidden="true">
            <defs>
              <linearGradient id="uvg" x1="0" x2="1">
                <stop offset="0" stopColor="#FFB27A" />
                <stop offset="1" stopColor="#F06FA5" />
              </linearGradient>
            </defs>
            <rect x="92" y="18" width="116" height="104" rx="12" fill="rgba(240,111,165,0.1)" />
            <path
              id="arc"
              d="M20 120 C 90 10, 210 10, 280 120"
              fill="none"
              stroke="url(#uvg)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle r="9" fill="#FFB27A" className="sun-dot">
              <animateMotion dur="7s" repeatCount="indefinite" path="M20 120 C 90 10, 210 10, 280 120" />
            </circle>
            <line x1="10" y1="122" x2="290" y2="122" stroke="var(--line2)" />
          </svg>
          <div className="uv-pill">UV 7 · Very high · reapply 14:10</div>
        </Bento>
        <Bento title="Know what’s running out">
          <div className="bats">
            {[
              ['CeraVe cleanser', 0.18, 'var(--empty)'],
              ['Sunscreen SPF 50', 0.46, 'var(--gold)'],
              ['Night cream', 0.82, 'var(--sage)'],
            ].map(([n, f, c]) => (
              <div key={n as string} className="bat">
                <span>{n}</span>
                <span className="cells">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <i key={i} style={{ background: i < Math.ceil((f as number) * 5) ? (c as string) : undefined }} />
                  ))}
                </span>
                <b>{Math.round((f as number) * 100)}%</b>
              </div>
            ))}
          </div>
        </Bento>
        <Bento title="Watch your skin change. Photos never leave your phone.">
          <svg className="face" viewBox="0 0 200 220" aria-hidden="true">
            <ellipse
              cx="100"
              cy="108"
              rx="62"
              ry="84"
              fill="none"
              stroke="var(--rose)"
              strokeWidth="2.5"
              strokeDasharray="6 7"
            />
            <line x1="100" y1="30" x2="100" y2="190" stroke="var(--line2)" strokeWidth="1.5" />
            <line x1="44" y1="92" x2="156" y2="92" stroke="var(--line2)" strokeWidth="1.5" />
            <line x1="62" y1="168" x2="138" y2="168" stroke="var(--line2)" strokeWidth="1.5" />
            <rect className="scanline" x="34" y="30" width="132" height="3" rx="1.5" fill="url(#uvg)" />
          </svg>
        </Bento>
        <Bento wide title="Earn your glow: XP, daily quests, levels and 24 badges">
          <div className="coins">
            {(['flame.fill', 'star.fill', 'drop.fill', 'sunrise.fill', 'moon.stars.fill', 'crown.fill'] as const).map(
              (ic, i) => (
                <span key={ic} className="coin" style={{ '--i': i } as CSSProperties}>
                  <Medal
                    badge={{
                      icon: ic,
                      tone: (['aura', 'skin', 'health', 'morning', 'night', 'gold'] as const)[i],
                      got: true,
                    }}
                    size={78}
                  />
                </span>
              ),
            )}
          </div>
        </Bento>
      </div>
    </section>
  );
}

const CHAT = [
  'Morning, Alex! 9 steps today, and it’s a wash night.',
  'Strong sun until 15:40 in Lisbon. Reapply around 14:10.',
  'You’re 2 steps from keeping your 13-day glow.',
  'Night ritual done. +70 XP. Sleep well.',
];

function MeetLune() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section className="lp-lune">
      <div className="wrap">
        <h2 className="center">
          Your ritual buddy,
          <br />
          <b>right in your pocket.</b>
        </h2>
        <div className="chat" ref={ref}>
          <div className="chat-lune">
            <Lune mood="happy" size={130} id="chat" />
          </div>
          <div className="bubbles">
            {CHAT.map((t, i) => (
              <div key={t} className="bubble" style={{ '--i': i } as CSSProperties}>
                {t}
              </div>
            ))}
            <div className="bubble ask" style={{ '--i': 4 } as CSSProperties}>
              Ask about your routine… <span className="muted">on-device, private</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Private() {
  return (
    <section className="wrap section">
      <h2 className="center">
        Private <b>by design.</b>
      </h2>
      <div className="grid">
        {[
          [
            'shield',
            'No account needed',
            'Everything lives on your device. Signing in is optional and only syncs your routine and log.',
          ],
          [
            'globe',
            'No ads, no tracking',
            'No analytics, no third-party trackers, nothing sold. The code is public, so you can check.',
          ],
          ['camera', 'Your photos stay yours', 'Skin check-in photos never leave your phone, even when you sync.'],
        ].map(([ic, t, p]) => (
          <div key={t} className="card feature">
            <div className="ic">
              <Icon name={ic} size={20} />
            </div>
            <h3>{t}</h3>
            <p>{p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="wrap section">
      <div className="cta">
        <div className="cta-aura" />
        <Lune mood="cheer" size={140} id="cta" />
        <h2>
          Start your ritual <b>tonight.</b>
        </h2>
        <div className="actions">
          <Link className="btn" to="/app">
            Open the web app
          </Link>
          <a className="btn line" href="https://github.com/Soul-Archive-Limited/daily-ritual-app">
            See the code
          </a>
        </div>
      </div>
    </section>
  );
}

export function Landing() {
  return (
    <div className="lp">
      <Hero />
      <Statement />
      <Fan />
      <Features />
      <MeetLune />
      <Private />
      <Cta />
      <Footer />
    </div>
  );
}
