import React from 'react';

/**
 * A row of chip-style toggle buttons for narrowing a transaction list down
 * to one type at a time (e.g. just withdrawals, or just item payments).
 * `options` is an ordered list of { key, label } - `key` should match the
 * `type` field on a transaction ('LOAD' | 'EXPENDITURE' | 'WITHDRAWAL'), or
 * 'ALL' for no filter.
 */
export default function TransactionFilter({ value, onChange, options, counts }) {
  return (
    <div className="tx-filter-group" role="tablist" aria-label="Filter transactions by type">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="tab"
          aria-selected={value === o.key}
          className={`tx-filter-chip ${value === o.key ? 'active' : ''}`}
          onClick={() => onChange(o.key)}
        >
          {o.label}
          {counts && typeof counts[o.key] === 'number' && (
            <span className="tx-filter-count">{counts[o.key]}</span>
          )}
        </button>
      ))}
    </div>
  );
}
