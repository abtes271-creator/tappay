import { useEffect, useMemo, useState } from 'react';

const DEFAULT_PAGE_SIZE = 10;

// Generic client-side pagination over an already-filtered array. Keeps the
// "current page" state and hands back just the slice of items to render,
// plus next/previous helpers for the pager UI.
export function usePagination(items, pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // If the list shrinks (e.g. a new search term matches fewer rows) and the
  // current page no longer exists, snap back to the last valid page.
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  function goToPage(p) {
    setPage(Math.min(Math.max(1, p), totalPages));
  }
  function nextPage() {
    goToPage(page + 1);
  }
  function prevPage() {
    goToPage(page - 1);
  }
  function resetPage() {
    setPage(1);
  }

  return { page, totalPages, totalItems, pageSize, pageItems, nextPage, prevPage, goToPage, resetPage };
}
