import React, { useState } from 'react';

/**
 * Hides a wallet balance by default (dots) and only reveals it when the user
 * taps the eye icon - matching the mobile-banking / P2P-app convention of
 * masking balances from anyone glancing at the screen.
 */
export default function MaskedBalance({ amount, className = 'balance-figure', dark = false }) {
  const [visible, setVisible] = useState(false);
  const formatted = `TSh${Number(amount ?? 0).toFixed(2)}`;

  return (
    <div className="masked-balance-row">
      <h1 className={className}>{visible ? formatted : '••••••'}</h1>
      <button
        type="button"
        className={`balance-toggle${dark ? ' balance-toggle-light' : ''}`}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide balance' : 'Show balance'}
        title={visible ? 'Hide balance' : 'Show balance'}
      >
        {visible ? '🙈' : '👁'}
      </button>
    </div>
  );
}
