import React, { useState } from 'react';
import { adminApi } from '../../api/api';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import { ADMIN_NAV_LINKS } from './navLinks';

export default function AdminRegisterInstitution() {
  const [form, setForm] = useState({ institutionName: '', fullName: '', email: '', phone: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    if (field === 'phone') {
      // Digits only, capped at 10 - keeps the field strictly a 10-digit phone number.
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setForm((f) => ({ ...f, [field]: value }));
  }

  function resetForm() {
    setForm({ institutionName: '', fullName: '', email: '', phone: '', username: '', password: '' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!/^\d{10}$/.test(form.phone)) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    setLoading(true);
    try {
      const res = await adminApi.createInstitution(form);
      setSuccess(`Institution account @${res.username} created and active. A welcome email has been sent.`);
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <TopNav homePath="/admin" links={ADMIN_NAV_LINKS} />

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Register Institution</h2>
        <p className="muted" style={{ marginTop: -8 }}>
          Institution accounts are created directly here - there's no separate
          approval step, and no public application form anymore.
        </p>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        <form onSubmit={handleSubmit}>
          <label htmlFor="inst-name">Institution name</label>
          <input id="inst-name" placeholder="Institution name" value={form.institutionName}
                 onChange={(e) => update('institutionName', e.target.value)} required />

          <label htmlFor="inst-fullname">Contact full name</label>
          <input id="inst-fullname" placeholder="Full name" value={form.fullName}
                 onChange={(e) => update('fullName', e.target.value)} required />

          <label htmlFor="inst-email">Email</label>
          <input id="inst-email" type="email" placeholder="Email" value={form.email}
                 onChange={(e) => update('email', e.target.value)} required />

          <label htmlFor="inst-phone">Phone (10 digits)</label>
          <input id="inst-phone" placeholder="Phone" value={form.phone} inputMode="numeric" pattern="\d{10}"
                 maxLength={10} title="Enter exactly 10 digits"
                 onChange={(e) => update('phone', e.target.value)} required />

          <label htmlFor="inst-username">Username</label>
          <input id="inst-username" placeholder="Username" value={form.username}
                 onChange={(e) => update('username', e.target.value)} required />

          <label htmlFor="inst-password">Temporary password</label>
          <input id="inst-password" type="password" placeholder="Temporary password" value={form.password}
                 onChange={(e) => update('password', e.target.value)} required />

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Institution Account'}
          </button>
        </form>
      </div>
      <Footer />
    </div>
  );
}
