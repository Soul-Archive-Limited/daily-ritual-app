import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DataProvider } from './data';
import { Landing } from './landing';
import { Privacy, Support } from './pages';
import { Link, usePath } from './router';
import { WebApp } from './WebApp';
import './styles.css';
import './landing.css';

const NAV: [string, string][] = [
  ['/', 'Home'],
  ['/app', 'Web app'],
  ['/support', 'Support'],
  ['/privacy', 'Privacy'],
];

function Site() {
  const path = usePath();
  const page =
    path === '/privacy' ? (
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
            Daily Ritual
          </Link>
          <nav aria-label="Site">
            {NAV.map(([to, label]) => (
              <Link
                key={to}
                to={to}
                className={`${(to === '/' ? path === '/' : path.startsWith(to)) ? 'on' : ''} ${to === '/privacy' ? 'hide-s' : ''}`}>
                {label}
              </Link>
            ))}
          </nav>
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
