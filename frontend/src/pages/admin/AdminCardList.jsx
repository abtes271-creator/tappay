import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/api';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { ADMIN_NAV_LINKS } from './navLinks';

export default function AdminCardList() {
  const [cards, setCards] = useState([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [cardToDelete, setCardToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function load() {
    try {
      setCards(await adminApi.listCards());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleToggleCard(card) {
    try {
      if (card.enabled) {
        await adminApi.disableCard(card.id);
      } else {
        await adminApi.enableCard(card.id);
      }
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleConfirmDelete() {
    if (!cardToDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await adminApi.deleteCard(cardToDelete.id);
      setCardToDelete(null);
      load();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  // The physical card UID is sensitive and is never shown here - only the
  // printed Card Number and the linked customer's name are displayed.
  const filtered = cards.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [c.cardNo, c.fullName, c.username].filter(Boolean)
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
        <h2 style={{ marginTop: 0 }}>All Cards</h2>
        <input
          placeholder="Search by card number or customer name/username..."
          value={query} onChange={(e) => handleQueryChange(e.target.value)}
        />
        {error && <div className="error">{error}</div>}
        {cards.length === 0 ? (
          <p className="muted-empty">No cards yet. Add one from the Add Cards page.</p>
        ) : filtered.length === 0 ? (
          <p className="muted-empty">No cards match your search.</p>
        ) : (
          <>
            {pageItems.map((c) => (
              <div key={c.id} className="row list-row">
                <div>
                  <strong>{c.cardNo}</strong>
                  <span className={`tx-badge ${c.registered ? 'tx-badge-ok' : 'tx-badge-pending'}`} style={{ marginLeft: 8 }}>
                    {c.registered ? 'Registered' : 'Unregistered'}
                  </span>
                  <div className="row-sub">
                    {c.registered ? `${c.fullName} (@${c.username})` : 'no customer linked yet'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`tx-badge ${c.enabled ? 'tx-badge-ok' : 'tx-badge-fail'}`}>
                    {c.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    style={{ width: 'auto' }}
                    className={c.enabled ? 'danger' : ''}
                    onClick={() => handleToggleCard(c)}
                  >
                    {c.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    style={{ width: 'auto' }}
                    className="danger"
                    onClick={() => { setCardToDelete(c); setDeleteError(''); }}
                  >
                    Delete
                  </button>
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

      {cardToDelete && (
        <Modal title="Delete card" onClose={() => !deleting && setCardToDelete(null)}>
          <p className="modal-hint" style={{ marginTop: -4 }}>
            This permanently deletes card <strong>{cardToDelete.cardNo}</strong>
            {cardToDelete.registered ? <> (currently linked to {cardToDelete.fullName})</> : null}.
            This cannot be undone.
          </p>
          {deleteError && <div className="error">{deleteError}</div>}
          <div className="row" style={{ gap: 10, marginTop: 4 }}>
            <button className="secondary" style={{ width: 'auto' }} onClick={() => setCardToDelete(null)} disabled={deleting}>
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
