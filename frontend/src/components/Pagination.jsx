import React from 'react';

// Simple Previous/Next pager - pairs with the usePagination hook.
export default function Pagination({ page, totalPages, totalItems, pageSize, onPrev, onNext }) {
  if (!totalItems) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="pagination-bar">
      <span className="pagination-info">
        Showing {start}&ndash;{end} of {totalItems}
      </span>
      <div className="pagination-controls">
        <button type="button" className="secondary" style={{ width: 'auto' }} onClick={onPrev} disabled={page <= 1}>
          ← Previous
        </button>
        <span className="pagination-page">Page {page} of {totalPages}</span>
        <button type="button" className="secondary" style={{ width: 'auto' }} onClick={onNext} disabled={page >= totalPages}>
          Next →
        </button>
      </div>
    </div>
  );
}
