import React, { useEffect, useState } from 'react';
import { walletApi } from '../../api/api';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import TransactionList from '../../components/TransactionList';
import TransactionFilter from '../../components/TransactionFilter';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { USER_NAV_LINKS } from './navLinks';

// A customer's own wallet activity can be any of the three transaction
// types: money loaded in, item payments made, and withdrawals sent out.
const FILTER_OPTIONS = [
  { key: 'ALL', label: 'All' },
  { key: 'LOAD', label: 'Loaded' },
  { key: 'EXPENDITURE', label: 'Payments' },
  { key: 'WITHDRAWAL', label: 'Withdrawals' },
];

export default function UserTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    walletApi.getTransactions()
      .then(setTransactions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredTransactions = typeFilter === 'ALL'
    ? transactions
    : transactions.filter((tx) => tx.type === typeFilter);

  const typeCounts = {
    ALL: transactions.length,
    LOAD: transactions.filter((tx) => tx.type === 'LOAD').length,
    EXPENDITURE: transactions.filter((tx) => tx.type === 'EXPENDITURE').length,
    WITHDRAWAL: transactions.filter((tx) => tx.type === 'WITHDRAWAL').length,
  };

  const { page, totalPages, totalItems, pageSize, pageItems, nextPage, prevPage, resetPage } =
    usePagination(filteredTransactions, 10);

  function handleFilterChange(key) {
    setTypeFilter(key);
    resetPage();
  }

  return (
    <div className="page">
      <TopNav homePath="/user" links={USER_NAV_LINKS} />

      <div className="card">
        <h3>Transaction History</h3>
        {error && <div className="error">{error}</div>}
        {loading ? (
          <div className="skeleton-list">
            <div className="skeleton-row" /><div className="skeleton-row" /><div className="skeleton-row" />
          </div>
        ) : (
          <>
            <TransactionFilter value={typeFilter} onChange={handleFilterChange} options={FILTER_OPTIONS} counts={typeCounts} />
            <TransactionList
              transactions={pageItems}
              perspective="user"
              emptyMessage={
                typeFilter === 'ALL' ? 'No transactions yet. Load money to get started.' : 'No transactions match this filter.'
              }
            />
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
