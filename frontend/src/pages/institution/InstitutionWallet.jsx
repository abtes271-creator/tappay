import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { institutionApi, getSession } from '../../api/api';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import MaskedBalance from '../../components/MaskedBalance';
import { INSTITUTION_NAV_LINKS } from './navLinks';

const SECTION_LINKS = [
  { key: 'items', to: '/institution/items', icon: '🛍️', title: 'Items', desc: 'Manage what customers can pay for at your terminal.' },
  { key: 'activity', to: '/institution/activity', icon: '📊', title: 'Transaction Dashboard', desc: 'View, filter and export every payment and withdrawal.' },
  { key: 'withdraw', to: '/institution/withdraw', icon: '↑', title: 'Withdraw', desc: 'Send your wallet balance out via mobile money.' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function InstitutionWallet() {
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState('');
  const session = getSession();
  const displayName = session.username || 'there';

  async function load() {
    try {
      setWallet(await institutionApi.getWallet());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page page-wide">
      <TopNav homePath="/institution" links={INSTITUTION_NAV_LINKS} />

      <div className="welcome-hero">
        <div>
          <p className="welcome-eyebrow">{greeting()}</p>
          <h1 className="welcome-title">Welcome back, {displayName}</h1>
          <p className="welcome-sub">Here's how your wallet is doing today.</p>
        </div>
      </div>

      <div className="card card-narrow">
        <h2>Institution Wallet</h2>
        <MaskedBalance amount={wallet?.balance} />
        <p className="muted">WALLET2 · payments received</p>
        {error && <div className="error">{error}</div>}
      </div>

      <h3 className="quick-actions-heading">Institution</h3>
      <div className="quick-actions-grid">
        {SECTION_LINKS.map((s) => (
          <Link key={s.key} to={s.to} className="quick-action-tile">
            <span className="quick-action-icon">{s.icon}</span>
            <span className="quick-action-title">{s.title}</span>
            <span className="quick-action-desc">{s.desc}</span>
          </Link>
        ))}
      </div>

      <Footer />
    </div>
  );
}
