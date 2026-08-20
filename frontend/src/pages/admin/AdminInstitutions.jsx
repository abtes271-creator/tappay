import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/api';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { ADMIN_NAV_LINKS } from './navLinks';

export default function AdminInstitutions() {
  const [institutions, setInstitutions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [institutionToDelete, setInstitutionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  function load() {
    setLoading(true);
    adminApi.institutions()
      .then(setInstitutions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleConfirmDelete() {
    if (!institutionToDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await adminApi.deleteInstitution(institutionToDelete.id);
      setInstitutionToDelete(null);
      load();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const filtered = institutions.filter((i) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [i.institutionName, i.fullName, i.username, i.email].filter(Boolean)
      .some((field) => field.toLowerCase().includes(q));
  });

  const { page, totalPages, totalItems, pageSize, pageItems, nextPage, prevPage, resetPage } = usePagination(filtered, 10);

  function handleQueryChange(value) {
    setQuery(value);
    resetPage();
  }

  return (
    <div className="page page-wide">
      <TopNav homePath="/admin" links={ADMIN_NAV_LINKS} />

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Institutions</h2>
        <input
          placeholder="Search by institution name, contact, username, or email..."
          value={query} onChange={(e) => handleQueryChange(e.target.value)}
        />
        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="skeleton-list">
            <div className="skeleton-row" /><div className="skeleton-row" /><div className="skeleton-row" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="muted-empty">No institutions found.</p>
        ) : (
          <>
            <div className="customer-table-wrap">
              <table className="customer-table">
                <thead>
                  <tr>
                    <th>Institution</th>
                    <th>Contact</th>
                    <th>Wallet Balance</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <strong>{i.institutionName}</strong>
                        <div className="row-sub">@{i.username}</div>
                      </td>
                      <td>
                        <div>{i.fullName}</div>
                        <div className="row-sub">{i.email} · {i.phone || '—'}</div>
                      </td>
                      <td><strong>TSh{Number(i.walletBalance).toFixed(2)}</strong></td>
                      <td>
                        <span className={`tx-badge ${i.enabled ? 'tx-badge-ok' : 'tx-badge-fail'}`}>
                          {i.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="row-sub">{i.createdAt ? new Date(i.createdAt).toLocaleDateString() : '—'}</td>
                      <td>
                        <button
                          style={{ width: 'auto' }}
                          className="danger"
                          onClick={() => { setInstitutionToDelete(i); setDeleteError(''); }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize}
              onPrev={prevPage} onNext={nextPage}
            />
          </>
        )}
      </div>

      {institutionToDelete && (
        <Modal title="Delete institution account" onClose={() => !deleting && setInstitutionToDelete(null)}>
          <p className="modal-hint" style={{ marginTop: -4 }}>
            This permanently deletes <strong>{institutionToDelete.institutionName}</strong>'s account, wallet, and
            transaction history, and deactivates all of its items. This cannot be undone.
          </p>
          {deleteError && <div className="error">{deleteError}</div>}
          <div className="row" style={{ gap: 10, marginTop: 4 }}>
            <button className="secondary" style={{ width: 'auto' }} onClick={() => setInstitutionToDelete(null)} disabled={deleting}>
              Cancel
            </button>
            <button className="danger" style={{ width: 'auto' }} onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </Modal>
      )}
      <Footer />
    </div>
  );
}
