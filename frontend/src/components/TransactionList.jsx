import React from 'react';

const TYPE_META = {
  LOAD: { icon: '↓', label: 'Money Loaded', className: 'tx-load' },
  EXPENDITURE: { icon: '🛒', label: 'Payment', className: 'tx-expenditure' },
  WITHDRAWAL: { icon: '↑', label: 'Withdrawal', className: 'tx-withdrawal' },
};

function formatMoney(amount) {
  return Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// direction: 'user' shows LOAD/EXPENDITURE as -amount from the account holder's
// perspective (money leaving WALLET1); 'institution' shows EXPENDITURE as +amount
// (money arriving in WALLET2). Defaults to 'user'.
export default function TransactionList({ transactions, emptyMessage = 'No transactions yet.', perspective = 'user' }) {
  if (!transactions || transactions.length === 0) {
    return <p className="muted-empty">{emptyMessage}</p>;
  }

  return (
    <div className="tx-list">
      {transactions.map((tx, idx) => {
        const meta = TYPE_META[tx.type] || { icon: '•', label: tx.type, className: '' };
        const isCredit =
          (perspective === 'user' && tx.type === 'LOAD') ||
          (perspective === 'institution' && tx.type === 'EXPENDITURE');

        return (
          <div
            key={tx.id}
            className={`tx-row ${meta.className}`}
            style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
          >
            <div className={`tx-icon ${isCredit ? 'tx-icon-credit' : 'tx-icon-debit'}`}>
              {meta.icon}
            </div>
            <div className="tx-main">
              <strong>{tx.type === 'EXPENDITURE' ? (tx.itemName || 'Payment') : meta.label}</strong>
              <div className="tx-time">{new Date(tx.timestamp).toLocaleString()}</div>
            </div>
            <div className="tx-amount-wrap">
              <div className={`tx-amount ${isCredit ? 'tx-amount-credit' : 'tx-amount-debit'}`}>
                {isCredit ? '+' : '-'}TSh{formatMoney(tx.amount)}
              </div>
              <span className={`tx-badge ${tx.successful ? 'tx-badge-ok' : 'tx-badge-fail'}`}>
                {tx.successful ? 'Completed' : 'Failed'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
