import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/api';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import { ADMIN_NAV_LINKS } from './admin/navLinks';

const QUICK_ACTIONS = [
  {
    key: 'register-customer', title: 'Register Customer', to: '/admin/register-customer',
    icon: '👤', desc: 'Register a new customer and link them to an unregistered card.',
  },
  {
    key: 'register-institution', title: 'Register Institution', to: '/admin/register-institution',
    icon: '🏢', desc: 'Create a new institution (merchant) account.',
  },
  {
    key: 'add-cards', title: 'Add Cards', to: '/admin/add-cards',
    icon: '💳', desc: 'Provision cards one at a time or in bulk via CSV/Excel.',
  },
  {
    key: 'card-list', title: 'Card List', to: '/admin/card-list',
    icon: '📇', desc: 'View, enable or disable every card in the system.',
  },
  {
    key: 'customers', title: 'Customers', to: '/admin/customers',
    icon: '🧑‍🤝‍🧑', desc: 'Browse every registered customer account.',
  },
  {
    key: 'institutions', title: 'Institutions', to: '/admin/institutions',
    icon: '🏛️', desc: 'Browse every registered institution account.',
  },
  {
    key: 'admins', title: 'Admins', to: '/admin/admins',
    icon: '🛡️', desc: 'Manage administrator accounts.',
  },
  {
    key: 'update-user', title: 'Update Existing User', to: '/admin/update-user',
    icon: '✏️', desc: 'Look up any account by ID and edit its details.',
  },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function AdminDashboard() {
  const [cards, setCards] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.listCards().catch(() => []),
      adminApi.registeredCustomers().catch(() => []),
      adminApi.institutions().catch(() => []),
    ])
      .then(([c, cu, i]) => {
        setCards(c); setCustomers(cu); setInstitutions(i);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const unregisteredCards = cards.filter((c) => !c.registered).length;

  return (
    <div className="page page-wide" id="top">
      <TopNav homePath="/admin" links={ADMIN_NAV_LINKS} />

      <div className="welcome-hero">
        <div>
          <p className="welcome-eyebrow">{greeting()}</p>
          <h1 className="welcome-title">Admin overview</h1>
          <p className="welcome-sub">Everything you need to manage cards, customers and institutions in one place.</p>
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: 18 }}>{error}</div>}

      <div className="stat-grid">
        <div className="stat-tile">
          <span className="stat-tile-value">{loading ? '—' : cards.length}</span>
          <span className="stat-tile-label">Total cards</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-value">{loading ? '—' : unregisteredCards}</span>
          <span className="stat-tile-label">Unregistered cards</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-value">{loading ? '—' : customers.length}</span>
          <span className="stat-tile-label">Customers</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-value">{loading ? '—' : institutions.length}</span>
          <span className="stat-tile-label">Institutions</span>
        </div>
      </div>

      <h3 className="quick-actions-heading">Quick actions</h3>
      <div className="quick-actions-grid">
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.key} to={a.to} className="quick-action-tile">
            <span className="quick-action-icon">{a.icon}</span>
            <span className="quick-action-title">{a.title}</span>
            <span className="quick-action-desc">{a.desc}</span>
          </Link>
        ))}
      </div>

      <Footer />
    </div>
  );
}
