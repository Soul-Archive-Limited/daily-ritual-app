import type { ReactNode } from 'react';

import { COMPANY, CONTACT_EMAIL } from './config';
import { Link } from './router';

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <span className="brand">Daily Ritual</span>
        <span>
          © {new Date().getFullYear()} {COMPANY}
        </span>
        <Link to="/features">Features</Link>
        <Link to="/how">How it works</Link>
        <Link to="/faq">FAQ</Link>
        <Link to="/support">Support</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/app">Sign in</Link>
      </div>
    </footer>
  );
}

function Prose({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="wrap narrow prose">{children}</div>
      <Footer />
    </>
  );
}

export function Privacy() {
  return (
    <Prose>
      <h1>Privacy policy</h1>
      <p className="muted">Last updated 24 October 2026</p>

      <h2>The short version</h2>
      <p>
        Daily Ritual is made by {COMPANY}. It works without an account and keeps your data on your device. If you choose
        to sign in, we store a copy of your routine and log so it can sync between your devices and this website. We do
        not sell data, show ads or use analytics or tracking.
      </p>

      <h2>What stays on your device</h2>
      <ul>
        <li>Skin check-in photos and product photos. These are never uploaded, not even when you sign in.</li>
        <li>Your precise location. It is used on the device to show sunrise, sunset and UV for where you are.</li>
        <li>
          Questions you ask the AI coach and the weekly reviews it writes. They run on Apple Intelligence on your
          device, so nothing is sent to us or to anyone else.
        </li>
      </ul>

      <h2>What we store if you sign in</h2>
      <ul>
        <li>
          An account id, and the email address Apple or Google shares with us (Apple may give a private relay address).
        </li>
        <li>
          Your settings, routine steps and products, daily log (ticks, water, activity), skin check-in scores and notes
          (not photos), weigh-ins and weekly reviews.
        </li>
      </ul>
      <p>
        This data is stored with Cloudflare (our hosting provider) and is used only to sync your devices. Sign in with
        Apple and Google sign-in are provided by Apple and Google under their own privacy policies.
      </p>

      <h2>Services the app uses</h2>
      <ul>
        <li>Open-Meteo, for today’s UV and sun times. The app sends approximate coordinates, never who you are.</li>
        <li>
          Our server, to guess your city from your internet connection when location is turned off. The address is not
          stored.
        </li>
      </ul>

      <h2>Deleting your data</h2>
      <p>
        In the app, open Profile and tap Delete account. This permanently deletes your account and everything stored on
        our server. Data on your device stays until you delete the app. You can also email us and we will delete it for
        you.
      </p>

      <h2>Children</h2>
      <p>Daily Ritual is not directed at children under 13.</p>

      <h2>Contact</h2>
      <p>
        {COMPANY}, United Kingdom. Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </Prose>
  );
}

export function Support() {
  return (
    <Prose>
      <h1>Support</h1>
      <p className="muted">Questions, bugs or ideas? We read everything.</p>

      <h2>Contact</h2>
      <p>
        Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Include your device and what you were doing, and
        a screenshot if you can.
      </p>

      <h2>Common questions</h2>
      <h3 style={{ marginTop: 14 }}>Do I need an account?</h3>
      <p className="muted">No. Everything works on your device. Signing in only adds backup and sync.</p>
      <h3 style={{ marginTop: 14 }}>How do I move to a new phone?</h3>
      <p className="muted">
        Sign in with the same Apple or Google account on the new phone and your routine and log come back. Or use
        Profile › Backup to export a file and restore it on the new phone. Skin photos are only in the backup of your
        phone itself (iCloud backup).
      </p>
      <h3 style={{ marginTop: 14 }}>Why don’t I see the AI features?</h3>
      <p className="muted">
        They use Apple Intelligence on your device, which needs a supported iPhone or iPad with Apple Intelligence
        turned on in Settings. Everything else works without it.
      </p>
      <h3 style={{ marginTop: 14 }}>How do streaks work?</h3>
      <p className="muted">
        A day counts at 80% of its steps. Every 7 days in a row earns a shield (you can hold 2), which saves the streak
        on a missed day. Skipped steps don’t count against you.
      </p>
      <h3 style={{ marginTop: 14 }}>How do I delete my account?</h3>
      <p className="muted">In the app: Profile › Account and sync › Delete account.</p>
    </Prose>
  );
}
