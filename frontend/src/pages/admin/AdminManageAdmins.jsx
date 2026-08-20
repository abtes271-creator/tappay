import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/api';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { ADMIN_NAV_LINKS } from './navLinks';

export default function AdminManageAdmins() {
  const [admins, setAdmins] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', username: '', password: '' });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [creating, setCreating] = useState(false);

  function load() {
    adminApi.listAdmins()
      .then(setAdmins)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const filtered = admins.filter((a) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [a.fullName, a.username, a.email].filter(Boolean)
      .some((field) => field.toLowerCase().includes(q));
  });

  const { page, totalPages, totalItems, pageSize, pageItems, nextPage, prevPage, resetPage } = usePagination(filtered, 10);

  function handleQueryChange(value) {
    setQuery(value);
    resetPage();
  }

  function update(field, value) {
    if (field === 'phone') {
      // Digits only, capped at 10 - keeps the field strictly a 10-digit phone number.
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError(''); setFormSuccess('');
    if (!/^\d{10}$/.test(form.phone)) {
      setFormError('Phone number must be exactly 10 digits.');
      return;
    }
    setCreating(true);
    try {
      const res = await adminApi.createAdmin(form);
      setFormSuccess(`Admin @${res.username} created.`);
      setForm({ fullName: '', email: '', phone: '', username: '', password: '' });
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page page-wide">
      <TopNav homePath="/admin" links={ADMIN_NAV_LINKS} />

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Manage Admins</h2>
        <p className="muted" style={{ marginTop: -8 }}>
          Only an existing admin can create another admin account - this page (and the
          endpoint behind it) isn't reachable by anyone who isn't already signed in as one.
        </p>

        <form onSubmit={handleCreate} className="add-card-form">
          <h4 className="form-field-full" style={{ marginTop: 0 }}>Add a new admin</h4>
          {formError && <div className="error form-field-full">{formError}</div>}
          {formSuccess && <div className="success form-field-full">{formSuccess}</div>}
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="admin-fullname">Full name</label>
              <input id="admin-fullname" placeholder="Full name" value={form.fullName}
                     onChange={(e) => update('fullName', e.target.value)} required />
            </div>
            <div className="form-field">
              <label htmlFor="admin-email">Email</label>
              <input id="admin-email" type="email" placeholder="Email" value={form.email}
                     onChange={(e) => update('email', e.target.value)} required />
            </div>
            <div className="form-field">
              <label htmlFor="admin-phone">Phone (10 digits)</label>
              <input id="admin-phone" placeholder="Phone" value={form.phone} inputMode="numeric" pattern="\d{10}"
                     maxLength={10} title="Enter exactly 10 digits"
                     onChange={(e) => update('phone', e.target.value)} required />
            </div>
            <div className="form-field">
              <label htmlFor="admin-username">Username</label>
              <input id="admin-username" placeholder="Username" value={form.username}
                     onChange={(e) => update('username', e.target.value)} required />
            </div>
            <div className="form-field">
              <label htmlFor="admin-password">Temporary password</label>
              <input id="admin-password" type="password" placeholder="Temporary password" value={form.password}
                     onChange={(e) => update('password', e.target.value)} required />
            </div>
            <div className="form-field-full">
              <button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create Admin'}</button>
            </div>
          </div>
        </form>

        <h4 style={{ marginTop: 22 }}>Existing Admins</h4>
        <input
          placeholder="Search by name, username, or email..."
          value={query} onChange={(e) => handleQueryChange(e.target.value)}
        />
        {error && <div className="error">{error}</div>}
        {loading ? (
          <div className="skeleton-list">
            <div className="skeleton-row" /><div className="skeleton-row" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="muted-empty">No admins found.</p>
        ) : (
          <>
            {pageItems.map((a) => (
              <div key={a.id} className="row list-row">
                <div>
                  <strong>{a.fullName}</strong>
                  <div className="row-sub">@{a.username} · {a.email}</div>
                </div>
              </div>
            ))}
            <Pagination
              page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize}
              onPrev={prevPage} onNext={nextPage}
            />
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
