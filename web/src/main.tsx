import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DataProvider, useData } from './data';
import { Landing } from './landing';
import { FaqPage, FeaturesPage, HowPage } from './more';
import { Privacy, Support } from './pages';
import { Link, usePath } from './router';
import { WebApp } from './WebApp';
import './styles.css';
import './landing.css';

const NAV: [string, string][] = [
  ['/', 'Home'],
  ['/features', 'Features'],
  ['/how', 'How it works'],
  ['/faq', 'FAQ'],
];

function Site() {
  const path = usePath();
  const { user } = useData();
  const page =
    path === '/features' ? (
      <FeaturesPage />
    ) : path === '/how' ? (
      <HowPage />
    ) : path === '/faq' ? (
      <FaqPage />
    ) : path === '/privacy' ? (
      <Privacy />
    ) : path === '/support' ? (
      <Support />
    ) : path.startsWith('/app') ? (
      <WebApp />
    ) : (
      <Landing />
    );
  return (
    <>
      <header className="bar">
        <div className="wrap">
          <Link className="brand" to="/">
            <img src="/icon.png" alt="" width={34} height={34} />
            Daily Ritual
          </Link>
          <nav aria-label="Site">
            {NAV.map(([to, label]) => (
              <Link
                key={to}
                to={to}
                className={`${(to === '/' ? path === '/' : path.startsWith(to)) ? 'on' : ''} ${to === '/how' ? 'hide-s' : ''}`}>
                {label}
              </Link>
            ))}
          </nav>
          <Link className={`signin-btn ${path.startsWith('/app') ? 'on' : ''}`} to="/app">
            {user ? 'Profile' : 'Sign in'}
          </Link>
        </div>
      </header>
      <main>{page}</main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProvider>
      <Site />
    </DataProvider>
  </StrictMode>,
);
