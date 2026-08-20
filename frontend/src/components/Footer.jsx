import React from 'react';
import Logo from './Logo';

/**
 * Global app footer - shown at the bottom of every real page (dashboards,
 * forms, auth screens). Not shown on the tap-to-pay kiosk terminal, which
 * is a dedicated full-screen device UI.
 *
 * `compact` renders a slimmer single-line version for the auth/standalone
 * screens (Login, Forgot/Reset Password, Change Credentials) where a full
 * multi-column footer would compete with the form for attention.
 */
export default function Footer({ compact = false }) {
  const year = new Date().getFullYear();

  if (compact) {
    return (
      <footer className="app-footer app-footer-compact">
        <div className="app-footer-compact-inner">
          <Logo size={18} />
          <span className="app-footer-dot" aria-hidden="true">·</span>
          <span>© {year} cpay. All rights reserved.</span>
          <span className="app-footer-dot" aria-hidden="true">·</span>
          <a href="mailto:support@cpay.app">Support</a>
        </div>
      </footer>
    );
  }

  return (
    <footer className="app-footer">
      <div className="app-footer-top">
        <div className="app-footer-brand">
          <Logo size={22} />
          <p>Contactless payments connecting customers and institutions.</p>
        </div>

        <nav className="app-footer-links" aria-label="Footer">
          <a href="mailto:hello@cpay.app">About</a>
          <a href="mailto:support@cpay.app">Help center</a>
          <a href="tel:+251115000000">+251 11 500 0000</a>
          <span>Privacy</span>
          <span>Terms</span>
        </nav>
      </div>

      <div className="app-footer-bottom">
        <span>© {year} cpay. All rights reserved.</span>
      </div>
    </footer>
  );
}
