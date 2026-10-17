import type { ReactNode } from "react";
import { useProgress } from "../lib/progress";
import { href, type Route } from "../lib/router";

const NAV: { label: string; href: string; active: (r: Route) => boolean }[] = [
  { label: "Dashboard", href: href.home(), active: (r) => r.name === "home" },
  { label: "Requirements", href: href.requirements(), active: (r) => r.name === "requirements" || r.name === "requirement" },
  { label: "Print summary", href: href.print(), active: (r) => r.name === "print" },
  { label: "Backup & data", href: href.data(), active: (r) => r.name === "data" },
  { label: "About", href: href.about(), active: (r) => r.name === "about" },
];

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  const { storageAvailable, saveFailed, loadWarning, dismissLoadWarning } = useProgress();
  const nav = import.meta.env.DEV ? [...NAV, { label: "Dev", href: href.dev(), active: (r: Route) => r.name === "dev" }] : NAV;

  return (
    <>
      <a className="skip-link" href="#main" onClick={(e) => {
        // Hash links are routes here, so move focus manually instead of navigating.
        e.preventDefault();
        document.getElementById("main")?.focus();
      }}>
        Skip to main content
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href={href.home()}>
            NIST 800-171 Tracker
          </a>
          <nav aria-label="Main">
            <ul className="nav-list">
              {nav.map((item) => (
                <li key={item.href}>
                  <a href={item.href} aria-current={item.active(route) ? "page" : undefined}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <div className="container">
        {!storageAvailable && (
          <p className="notice notice-warn" role="status">
            Your browser is blocking local storage, so progress won't be saved between visits. Use{" "}
            <a href={href.data()}>Export backup</a> before you leave.
          </p>
        )}
        {saveFailed && (
          <p className="notice notice-warn" role="alert">
            Your latest change couldn't be saved in this browser (storage may be full). Export a backup to avoid losing work.
          </p>
        )}
        {loadWarning && (
          <div className="notice notice-warn" role="alert">
            <p>{loadWarning}</p>
            <button type="button" className="btn btn-small" onClick={dismissLoadWarning}>
              Dismiss
            </button>
          </div>
        )}
      </div>

      <main id="main" className="container" tabIndex={-1}>
        {children}
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>
            <strong>This is a self-tracking aid, not an assessment, a compliance guarantee, or legal advice.</strong>{" "}
            Your data stays in this browser. Nothing is sent anywhere.{" "}
            <a className="no-print" href={href.about()}>
              About &amp; privacy
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
