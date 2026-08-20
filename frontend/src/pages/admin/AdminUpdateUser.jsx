import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/api';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { ADMIN_NAV_LINKS } from './navLinks';

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'USER', label: 'Customers' },
  { value: 'INSTITUTION', label: 'Institutions' },
  { value: 'ADMIN', label: 'Admins' },
];

export default function AdminUpdateUser() {
  // ---- Search / filter step: find the account by username instead of a raw ID ----
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);

  // ---- Edit step: once an account is picked from the results ----
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  async function runSearch(q, role) {
    setSearching(true);
    setSearchError('');
    try {
      const found = await adminApi.searchUsers(q, role);
      setResults(found);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  // Load the first page of users right away, and re-search (debounced) as the
  // admin types or changes the role filter - this doubles as the "filter the
  // existing users" control.
  useEffect(() => {
    const timer = setTimeout(() => runSearch(query, roleFilter), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, roleFilter]);

  const { page, totalPages, totalItems, pageSize, pageItems, nextPage, prevPage, resetPage } = usePagination(results, 10);

  function handleQueryChange(value) {
    setQuery(value);
    resetPage();
  }
  function handleRoleChange(value) {
    setRoleFilter(value);
    resetPage();
  }

  function updateField(field, value) {
    if (field === 'phone') {
      // Digits only, capped at 10 - keeps the field strictly a 10-digit phone number.
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSelect(candidate) {
    setError(''); setSuccess('');
    setLoadingProfile(true);
    try {
      const found = await adminApi.getUserProfile(candidate.id);
      setUser(found);
      setForm({
        fullName: found.fullName || '',
        email: found.email || '',
        phone: found.phone || '',
        institutionName: found.institutionName || '',
        enabled: found.enabled,
      });
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!/^\d{10}$/.test(form.phone)) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    setSaving(true);
    try {
      const updated = await adminApi.updateUserProfile(user.id, form);
      setUser(updated);
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startOver() {
    setUser(null); setForm(null); setError(''); setSuccess('');
  }

  return (
    <div className="page">
      <TopNav homePath="/admin" links={ADMIN_NAV_LINKS} />

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Update Existing User</h2>
        <p className="modal-hint" style={{ marginTop: -4 }}>
          Search for any account (customer, institution, or admin) by username, name, or email,
          then edit and save its details.
        </p>

        {!user ? (
          <>
            <div className="form-grid" style={{ marginBottom: 4 }}>
              <div className="form-field">
                <label htmlFor="find-user-query">Search by username, name, or email</label>
                <input
                  id="find-user-query" placeholder="e.g. jsmith" value={query}
                  onChange={(e) => handleQueryChange(e.target.value)} autoFocus
                />
              </div>
              <div className="form-field">
                <label htmlFor="find-user-role">Filter by role</label>
                <select id="find-user-role" value={roleFilter} onChange={(e) => handleRoleChange(e.target.value)}>
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {searchError && <div className="error">{searchError}</div>}

            {searching ? (
              <div className="skeleton-list">
                <div className="skeleton-row" /><div className="skeleton-row" /><div className="skeleton-row" />
              </div>
            ) : results.length === 0 ? (
              <p className="muted-empty">No matching accounts found.</p>
            ) : (
              <>
                {pageItems.map((r) => (
                  <div key={r.id} className="row list-row">
                    <div>
                      <strong>{r.fullName}</strong>
                      <div className="row-sub">
                        @{r.username} · {r.email} · {r.role}
                        {!r.enabled && ' · disabled'}
                      </div>
                    </div>
                    <button
                      style={{ width: 'auto' }}
                      onClick={() => handleSelect(r)}
                      disabled={loadingProfile}
                    >
                      {loadingProfile ? 'Loading...' : 'Select'}
                    </button>
                  </div>
                ))}
                <Pagination
                  page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize}
                  onPrev={prevPage} onNext={nextPage}
                />
              </>
            )}
          </>
        ) : (
          <form onSubmit={handleSave}>
            <div className="user-preview-box" style={{ marginBottom: 12 }}>
              <strong>@{user.username}</strong>
              <div className="row-sub">{user.role} · {user.approvalStatus}</div>
            </div>
            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}

            <label htmlFor="upd-fullname">Full name</label>
            <input id="upd-fullname" value={form.fullName}
                   onChange={(e) => updateField('fullName', e.target.value)} required />

            <label htmlFor="upd-email">Email</label>
            <input id="upd-email" type="email" value={form.email}
                   onChange={(e) => updateField('email', e.target.value)} required />

            <label htmlFor="upd-phone">Phone (10 digits)</label>
            <input id="upd-phone" value={form.phone} inputMode="numeric" pattern="\d{10}" maxLength={10}
                   title="Enter exactly 10 digits"
                   onChange={(e) => updateField('phone', e.target.value)} required />

            {user.role === 'INSTITUTION' && (
              <>
                <label htmlFor="upd-institution">Institution name</label>
                <input id="upd-institution" value={form.institutionName}
                       onChange={(e) => updateField('institutionName', e.target.value)} required />
              </>
            )}

            <label className="row" style={{ gap: 8, alignItems: 'center', marginTop: 6 }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={!!form.enabled}
                     onChange={(e) => updateField('enabled', e.target.checked)} />
              Account enabled
            </label>

            <button type="submit" className="btn-primary" style={{ marginTop: 12 }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="secondary" onClick={startOver}>
              Search for a different user
            </button>
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
}
