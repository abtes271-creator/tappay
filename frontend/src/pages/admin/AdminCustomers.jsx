import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/api';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { ADMIN_NAV_LINKS } from './navLinks';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  function load() {
    setLoading(true);
    adminApi.registeredCustomers()
      .then(setCustomers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleConfirmDelete() {
    if (!customerToDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await adminApi.deleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
      load();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const filtered = customers.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [c.fullName, c.username, c.email, c.cardNo].filter(Boolean)
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
        <h2 style={{ marginTop: 0 }}>All Registered Customers</h2>
        <input
          placeholder="Search by name, username, email, or card no..."
          value={query} onChange={(e) => handleQueryChange(e.target.value)}
        />
        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="skeleton-list">
            <div className="skeleton-row" /><div className="skeleton-row" /><div className="skeleton-row" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="muted-empty">No registered customers found.</p>
        ) : (
          <>
            <div className="customer-table-wrap">
              <table className="customer-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Card</th>
                    <th>Wallet Balance</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.fullName}</strong>
                        <div className="row-sub">@{c.username}</div>
                      </td>
                      <td>
                        <div>{c.email}</div>
                        <div className="row-sub">{c.phone || '—'}</div>
                      </td>
                      <td>
                        {c.cardNo ? (
                          <>
                            <div>{c.cardNo}</div>
                            <div className="row-sub">
                              {c.cardEnabled ? 'enabled' : 'disabled'}
                            </div>
                          </>
                        ) : (
                          <span className="muted">No card linked</span>
                        )}
                      </td>
                      <td><strong>TSh{Number(c.walletBalance).toFixed(2)}</strong></td>
                      <td>
                        <span className={`tx-badge ${c.enabled ? 'tx-badge-ok' : 'tx-badge-fail'}`}>
                          {c.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="row-sub">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                      <td>
                        <button
                          style={{ width: 'auto' }}
                          className="danger"
                          onClick={() => { setCustomerToDelete(c); setDeleteError(''); }}
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

      {customerToDelete && (
        <Modal title="Delete customer account" onClose={() => !deleting && setCustomerToDelete(null)}>
          <p className="modal-hint" style={{ marginTop: -4 }}>
            This permanently deletes <strong>{customerToDelete.fullName}</strong>'s account, wallet, and transaction
            history{customerToDelete.cardNo ? <> and unlinks card {customerToDelete.cardNo}</> : null}. This cannot be undone.
          </p>
          {deleteError && <div className="error">{deleteError}</div>}
          <div className="row" style={{ gap: 10, marginTop: 4 }}>
            <button className="secondary" style={{ width: 'auto' }} onClick={() => setCustomerToDelete(null)} disabled={deleting}>
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
