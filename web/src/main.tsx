import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DataProvider } from './data';
import { Landing, Privacy, Support } from './pages';
import { Link, usePath } from './router';
import { WebApp } from './WebApp';
import './styles.css';

const NAV: [string, string][] = [
  ['/', 'Home'],
  ['/app', 'Web app'],
  ['/support', 'Support'],
  ['/privacy', 'Privacy'],
];

function Site() {
  const path = usePath();
  const page =
    path === '/privacy' ? <Privacy /> : path === '/support' ? <Support /> : path.startsWith('/app') ? <WebApp /> : <Landing />;
  return (
    <>
      <header className="bar">
        <div className="wrap">
          <Link className="brand" to="/">
            <img src="/icon.png" alt="" />
            Daily Ritual
          </Link>
          <nav aria-label="Site">
            {NAV.slice(1).map(([to, label]) => (
              <Link key={to} to={to} className={path === to ? 'on' : ''}>
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
