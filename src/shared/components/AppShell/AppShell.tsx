import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

import './AppShell.css';

export function AppShell({ feedback }: { feedback?: ReactNode }) {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.title = `${pathname === '/' ? 'Explore' : pathname === '/collections' ? 'Collections' : 'Page not found'} | CurioFold`;
    if (previousPath.current !== pathname) {
      mainRef.current?.focus();
    }
    previousPath.current = pathname;
  }, [pathname]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="app-header">
        <div className="content-container app-header__inner">
          <Link className="app-brand" to="/" aria-label="CurioFold home">
            <span className="app-brand__mark" aria-hidden="true" />
            <span>CurioFold</span>
          </Link>

          <nav className="primary-nav" aria-label="Primary">
            <NavLink to="/" end>
              Explore
            </NavLink>
            <NavLink to="/collections">Collections</NavLink>
          </nav>
        </div>
      </header>

      <main id="main-content" ref={mainRef} className="content-container app-main" tabIndex={-1}>
        {feedback}
        <Outlet />
      </main>
    </div>
  );
}
