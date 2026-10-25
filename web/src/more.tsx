// The site's other pages: Features in depth, How it works, and FAQ.
import { useState, type ReactNode } from 'react';

import { Icon, Lune, Medal, Orb, WaterBody } from './glow';
import { CelebrateScreen, NightScreen, Phone, RewardsScreen, TodayScreen } from './landing';
import { Footer } from './pages';
import { Link } from './router';
import { useReveal } from './scroll';

function Row({
  flip,
  art,
  eyebrow,
  title,
  children,
}: {
  flip?: boolean;
  art: ReactNode;
  eyebrow: string;
  title: ReactNode;
  children: ReactNode;
}) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div className={`frow ${flip ? 'flip' : ''}`} ref={ref}>
      <div className="fart">{art}</div>
      <div className="ftext">
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function PageHead({ thin, bold, lead }: { thin: string; bold: string; lead: string }) {
  return (
    <section className="wrap center phead">
      <h1>
        {thin} <b>{bold}</b>
      </h1>
      <p className="lead">{lead}</p>
    </section>
  );
}

export function FeaturesPage() {
  return (
    <div className="lp">
      <PageHead
        thin="Everything in"
        bold="Daily Ritual."
        lead="One calm place for your skin, hair, body and health habits. Here is all of it, step by step."
      />
      <div className="wrap frows">
        <Row
          eyebrow="Today"
          title={
            <>
              Your day, <b>at a glance.</b>
            </>
          }
          art={
            <Phone>
              <TodayScreen />
            </Phone>
          }>
          <p>
            The aura orb fills as you go, Lune tells you what matters right now, and Up next shows the very next step.
            Slide it done without opening anything.
          </p>
          <ul>
            <li>Morning, night and health rituals, one open at a time</li>
            <li>Skip a step for today without losing your streak</li>
            <li>Wash days, no-wash days and long travel days</li>
          </ul>
        </Row>
        <Row
          flip
          eyebrow="Water"
          title={
            <>
              Watch yourself <b>fill up.</b>
            </>
          }
          art={
            <div className="fbody">
              <WaterBody p={0.62} health={0.66} size={1.4} />
            </div>
          }>
          <p>
            Water fills a body from the feet up, with moving water. Tap it for a glass. It turns from red to amber to
            green as you finish your whole health routine.
          </p>
        </Row>
        <Row
          eyebrow="Lune"
          title={
            <>
              A buddy who <b>never nags.</b>
            </>
          }
          art={
            <div className="lune-trio">
              <Lune mood="happy" size={130} id="f1" />
              <Lune mood="cheer" size={150} id="f2" />
              <Lune mood="sleepy" size={130} id="f3" />
            </div>
          }>
          <p>
            Lune breathes, blinks, waves and jumps when you tick a step. She worries a little when your streak is at
            risk and goes to sleep once your night ritual is done. Tap her and she plays.
          </p>
          <p>
            Ask Lune anything about your skin or routine. Answers come from Apple Intelligence on your iPhone, free and
            private.
          </p>
        </Row>
        <Row
          flip
          eyebrow="Rewards"
          title={
            <>
              Earn your glow, <b>like a game.</b>
            </>
          }
          art={
            <Phone>
              <RewardsScreen />
            </Phone>
          }>
          <ul>
            <li>XP for every step, bonuses for finished rituals and perfect days</li>
            <li>Three daily quests and a daily XP goal</li>
            <li>12 named levels, from Seed to Celestial, and the road keeps going</li>
            <li>Each level unlocks something: outfits for Lune and new orb colours</li>
            <li>24 badges, personal records, and a league against your own past weeks</li>
          </ul>
        </Row>
        <Row
          eyebrow="Celebrations"
          title={
            <>
              Every finish <b>feels good.</b>
            </>
          }
          art={
            <Phone>
              <CelebrateScreen />
            </Phone>
          }>
          <p>
            Finish a ritual, reach a level or earn a badge and the screen fills with aura and confetti. Streaks forgive
            the odd miss: every 7 days in a row earns a shield.
          </p>
        </Row>
        <Row
          flip
          eyebrow="Night ritual"
          title={
            <>
              Tick, tick, <b>done.</b>
            </>
          }
          art={
            <Phone>
              <NightScreen />
            </Phone>
          }>
          <p>
            Every step shows the product and how to use it. Actives are flagged, so on an irritated night you can rest
            them with one tap.
          </p>
        </Row>
        <Row
          eyebrow="Sun, skin and shelf"
          title={
            <>
              The details, <b>handled.</b>
            </>
          }
          art={
            <div className="fmini">
              <div className="card">
                <Icon name="sun" size={22} />
                <b>Sun and UV</b>
                <p>Live UV where you are, sunrise and sunset, and when to reapply sunscreen.</p>
              </div>
              <div className="card">
                <Icon name="camera" size={22} />
                <b>Skin check-ins</b>
                <p>A camera guide, scores over time and a time-lapse. Photos never leave your phone.</p>
              </div>
              <div className="card">
                <Icon name="drop" size={22} />
                <b>Shelf</b>
                <p>Each bottle empties a little every time you use it, so you know what to restock.</p>
              </div>
              <div className="card">
                <Orb p={0.8} size={90} label="Week" />
                <b>Progress</b>
                <p>Trends, a month view, weigh-ins and a weekly review.</p>
              </div>
            </div>
          }>
          <p>
            Location and time zone follow your phone, so it works wherever you travel. Reminders arrive in your local
            time, only if that ritual isn’t done.
          </p>
        </Row>
      </div>
      <Footer />
    </div>
  );
}

const STEPS: [string, string, ReactNode][] = [
  [
    'Tell Lune about you',
    'Five quick questions: your name, how your skin feels, your goals, how much time you have, and your wash nights.',
    <Lune key="1" size={110} id="h1" />,
  ],
  [
    'Get your starting ritual',
    'A morning, night and health routine tuned to your skin. Rename, reorder, pause or remove anything later.',
    <Medal key="2" badge={{ icon: 'sparkles', tone: 'aura', got: true }} size={96} />,
  ],
  [
    'Slide through your day',
    'Up next shows the one thing to do now. Tick steps, sip water, and watch the orb glow.',
    <Orb key="3" p={0.62} size={120} />,
  ],
  [
    'Keep the glow going',
    'XP, quests, levels and badges make it a habit. Lune celebrates with you every step of the way.',
    <Lune key="4" mood="cheer" size={120} id="h4" />,
  ],
];

export function HowPage() {
  return (
    <div className="lp">
      <PageHead thin="How it" bold="works." lead="From first open to a daily habit in four steps. No account needed." />
      <div className="wrap howgrid">
        {STEPS.map(([t, p, art], i) => (
          <div key={t} className="card how">
            <div className="howart">{art}</div>
            <div className="eyebrow">Step {i + 1}</div>
            <h3>{t}</h3>
            <p className="muted">{p}</p>
          </div>
        ))}
      </div>
      <section className="wrap section center">
        <div className="actions" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a className="btn" href="/app?demo">
            Try the demo
          </a>
          <Link className="btn line" to="/faq">
            Questions? Read the FAQ
          </Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const FAQ: [string, ReactNode][] = [
  ['Is Daily Ritual free?', 'Yes. No ads, no subscriptions, no paid tiers. The code is open source.'],
  [
    'Do I need an account?',
    'No. Everything works on your phone without one. Sign in with Apple or Google only if you want your routine on your iPad and this website too.',
  ],
  [
    'Where is my data?',
    'On your device. If you sign in, your routine, log, scores and weigh-ins sync. Skin and product photos never leave your phone.',
  ],
  [
    'How does Ask Lune work, and is it really free?',
    'It uses Apple Intelligence, the model that runs on your iPhone. Nothing is sent to us or anyone else, so it costs nothing. It needs an iPhone 15 Pro or newer with Apple Intelligence turned on.',
  ],
  [
    'How do streaks work?',
    'A day counts when 80% of its steps are done. Every 7 days in a row earns a shield (you can hold 2). Miss a day with a shield and the streak carries on.',
  ],
  [
    'What do levels unlock?',
    'Every few levels unlock something new: a bow, a spa headband, a flower crown, sunglasses, a scarf and a golden crown for Lune, plus new colours for your orb.',
  ],
  [
    'I travel a lot. Will it follow me?',
    'Yes. Your city, sun, UV and reminders follow your phone’s location and time zone. For long-haul days, set a Travel day and only your essentials count.',
  ],
  [
    'Is this medical advice?',
    'No. Daily Ritual helps you keep a routine. For anything that worries you about your skin or health, see a dermatologist or doctor.',
  ],
  ['Is it on the App Store?', 'It is in testing now. Until it launches you can try the full web demo.'],
];

export function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="lp">
      <PageHead thin="Questions," bold="answered." lead="Everything people ask about Daily Ritual and Lune." />
      <div className="wrap narrow faq">
        {FAQ.map(([q, a], i) => (
          <div key={q} className={`qa ${open === i ? 'open' : ''}`}>
            <button aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
              {q}
              <span className="pm">{open === i ? '−' : '+'}</span>
            </button>
            {open === i ? <p className="muted">{a}</p> : null}
          </div>
        ))}
        <p className="center muted" style={{ marginTop: 30 }}>
          Still stuck? <Link to="/support">Contact support</Link>.
        </p>
      </div>
      <Footer />
    </div>
  );
}
