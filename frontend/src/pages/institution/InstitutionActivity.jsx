import React, { useEffect, useState } from 'react';
import { institutionApi } from '../../api/api';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import TransactionList from '../../components/TransactionList';
import TransactionFilter from '../../components/TransactionFilter';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { INSTITUTION_NAV_LINKS } from './navLinks';

// An institution's activity feed only ever contains item payments received
// (EXPENDITURE, credited to WALLET2) and their own withdrawals out
// (WITHDRAWAL) - never LOAD, which is a customer-wallet-only transaction.
const FILTER_OPTIONS = [
  { key: 'ALL', label: 'All' },
  { key: 'EXPENDITURE', label: 'Item Payments' },
  { key: 'WITHDRAWAL', label: 'Withdrawals' },
];

export default function InstitutionActivity() {
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(null); // null | 'pdf' | 'excel'
  const [typeFilter, setTypeFilter] = useState('ALL');

  async function load() {
    try {
      setTransactions(await institutionApi.getTransactions());
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleExport(format) {
    setError('');
    setExporting(format);
    try {
      await institutionApi.exportActivityReport(format);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(null);
    }
  }

  // Poll every 5s so a payment made at the terminal shows up here without a manual refresh.
  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredTransactions = typeFilter === 'ALL'
    ? transactions
    : transactions.filter((tx) => tx.type === typeFilter);

  const typeCounts = {
    ALL: transactions.length,
    EXPENDITURE: transactions.filter((tx) => tx.type === 'EXPENDITURE').length,
    WITHDRAWAL: transactions.filter((tx) => tx.type === 'WITHDRAWAL').length,
  };

  // Paginate client-side, 10 per page, same pattern used across the admin
  // list pages (AdminCustomers, AdminInstitutions, etc). The full activity
  // list used to be hard-capped to the first 30 transactions with no way to
  // page through the rest - now the whole history is reachable, page by page.
  const { page, totalPages, totalItems, pageSize, pageItems, nextPage, prevPage, goToPage, resetPage } =
    usePagination(filteredTransactions, 10);

  // If a fresh poll brings in new transactions while sitting on page 1,
  // stay pinned to page 1 (most recent) rather than silently shifting what's
  // on screen. Deeper pages are left untouched so browsing history isn't
  // interrupted by the 5s poll.
  useEffect(() => {
    if (page === 1) goToPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions.length]);

  function handleFilterChange(key) {
    setTypeFilter(key);
    resetPage();
  }

  return (
    <div className="page page-wide">
      <TopNav homePath="/institution" links={INSTITUTION_NAV_LINKS} />

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ margin: 0 }}>Recent Activity</h3>
          <div className="row" style={{ gap: 8, width: 'auto' }}>
            <button
              className="secondary" style={{ width: 'auto' }}
              disabled={exporting !== null}
              onClick={() => handleExport('pdf')}
            >
              {exporting === 'pdf' ? 'Exporting...' : '📄 Export PDF'}
            </button>
            <button
              className="secondary" style={{ width: 'auto' }}
              disabled={exporting !== null}
              onClick={() => handleExport('excel')}
            >
              {exporting === 'excel' ? 'Exporting...' : '📊 Export Excel'}
            </button>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        <TransactionFilter value={typeFilter} onChange={handleFilterChange} options={FILTER_OPTIONS} counts={typeCounts} />
        <TransactionList
          transactions={pageItems}
          perspective="institution"
          emptyMessage={typeFilter === 'ALL' ? 'No payments yet.' : 'No transactions match this filter.'}
        />
        <Pagination
          page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize}
          onPrev={prevPage} onNext={nextPage}
        />
      </div>
      <Footer />
    </div>
  );
}
