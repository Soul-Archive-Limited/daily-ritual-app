import { useEffect, useState, type AnchorHTMLAttributes } from 'react';

/** A tiny client-side router: the site has only a handful of pages. */
export function usePath() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const on = () => setPath(location.pathname);
    addEventListener('popstate', on);
    return () => removeEventListener('popstate', on);
  }, []);
  return path;
}

export function go(to: string) {
  if (to === location.pathname) return;
  history.pushState(null, '', to);
  dispatchEvent(new PopStateEvent('popstate'));
  scrollTo(0, 0);
}

export function Link({ to, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  return (
    <a
      {...rest}
      href={to}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        go(to);
      }}
    />
  );
}
