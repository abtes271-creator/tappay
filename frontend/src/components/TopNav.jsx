import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { clearSession, getSession } from '../api/api';

const ROLE_LABEL = {
  ADMIN: 'Administrator',
  INSTITUTION: 'Institution',
  USER: 'Customer',
};

function initialsOf(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || name[0].toUpperCase();
}

/**
 * A single sidebar entry - either a direct link:
 *   { key, label, to }
 * or a group that expands in place to show its children, indented -
 * mirrors a typical banking back-office nav tree (section > sub-section):
 *   { key, label, children: [{ key, label, to }, ...] }
 */
function SidebarItem({ item, isActive, onNavigate }) {
  const groupActive = item.children?.some((c) => isActive(c.to)) ?? false;
  const [open, setOpen] = useState(groupActive);

  if (!item.children) {
    return (
      <Link
        to={item.to}
        className={`app-sidebar-link ${isActive(item.to) ? 'active' : ''}`}
        onClick={onNavigate}
      >
        <span className="app-sidebar-dot" aria-hidden="true" />
        {item.label}
      </Link>
    );
  }

  return (
    <div className="app-sidebar-group">
      <button
        type="button"
        className={`app-sidebar-link app-sidebar-group-trigger ${groupActive ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="app-sidebar-dot" aria-hidden="true" />
        <span style={{ flex: 1 }}>{item.label}</span>
        <span className={`app-sidebar-caret ${open ? 'open' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="app-sidebar-children">
          {item.children.map((c) => (
            <Link
              key={c.key}
              to={c.to}
              className={`app-sidebar-link ${isActive(c.to) ? 'active' : ''}`}
              onClick={onNavigate}
            >
              <span className="app-sidebar-dot" aria-hidden="true" />
              {c.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Dashboard shell used across every role (User / Institution / Admin):
 * a fixed dark sidebar on the left (brand + section tree) and a slim
 * white top bar (mobile menu toggle + account menu + logout), modeled
 * on a standard banking back-office layout. Both pieces are position:fixed,
 * so this can be dropped in as the first child of any .page/.page-wide
 * container and the CSS (`:has(> .app-sidebar)`) takes care of shifting
 * that page's content clear of them - no other page markup changes needed.
 *
 * links: [{ key, label, to }] or [{ key, label, children: [{key,label,to}] }]
 */
export default function TopNav({ homePath, links = [], displayName }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();
  const name = displayName || session.username || 'Account';

  const isActive = (to) => to && location.pathname === to;

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close the off-canvas sidebar whenever the route changes (mobile).
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  function handleLogout() {
    clearSession();
    navigate('/login');
  }

  return (
    <>
      <aside className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <Link to={homePath} className="app-sidebar-brand" aria-label="cpay home">
          <Logo size={28} />
        </Link>
        <nav className="app-sidebar-nav">
          {links.map((item) => (
            <SidebarItem key={item.key} item={item} isActive={isActive} onNavigate={() => setMobileOpen(false)} />
          ))}
        </nav>
      </aside>

      <div
        className={`app-sidebar-backdrop ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <header className="app-topbar">
        <button
          type="button"
          className="app-topbar-hamburger"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <div className="app-topbar-spacer" />

        <div className="app-nav-right" ref={menuRef}>
          <button
            type="button"
            className="app-nav-account"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
          >
            <span className="app-nav-avatar">{initialsOf(name)}</span>
            <span className="app-nav-account-text">
              <strong>{name}</strong>
              <span>{ROLE_LABEL[session.role] || session.role}</span>
            </span>
            <span className={`app-nav-caret ${menuOpen ? 'open' : ''}`}>▾</span>
          </button>

          {menuOpen && (
            <div className="app-nav-dropdown" role="menu">
              <div className="app-nav-dropdown-header">
                <span className="app-nav-avatar app-nav-avatar-lg">{initialsOf(name)}</span>
                <div>
                  <strong>{name}</strong>
                  <div className="app-nav-dropdown-role">{ROLE_LABEL[session.role] || session.role}</div>
                </div>
              </div>
              <Link to="/change-credentials" className="app-nav-dropdown-item" onClick={() => setMenuOpen(false)}>
                ⚙️ Change username / password
              </Link>
            </div>
          )}
        </div>

        <button type="button" className="app-nav-logout" onClick={handleLogout}>
          ⏻ Log out
        </button>
      </header>
    </>
  );
}
