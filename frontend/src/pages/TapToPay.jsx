import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentApi } from '../api/api';
import Logo from '../components/Logo';
import BackButton from '../components/BackButton';

// Plays a short beep using the Web Audio API so we don't need an audio asset file.
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Audio not available in this environment - fail silently.
  }
}

function formatMoney(n) {
  return Number(n || 0).toFixed(2);
}

export default function TapToPay() {
  const { institutionId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loadError, setLoadError] = useState('');

  // Multi-select basket with quantities: each tap on an item tile adds one
  // more of that item to the basket, so the seller can ring up several of
  // the same item (or a mix of items) in one card tap. Keyed by item id ->
  // quantity; the full item objects are looked back up from `items` when
  // needed.
  const [quantities, setQuantities] = useState(() => ({}));

  // The items actually being charged on the payment screen - a snapshot
  // taken when "Pay" is pressed (or on a direct double-click checkout), so
  // it stays fixed even if the underlying basket selection changes later.
  const [basketItems, setBasketItems] = useState([]);
  const [screen, setScreen] = useState('select'); // 'select' | 'pay'

  // Payment-screen NFC state machine:
  //   'waiting'  - listening for a tap (idle, ready to scan)
  //   'reading'  - card detected, looking it up / validating
  //   'confirm'  - card is valid, customer found - waiting on Confirm Payment
  //   'charging' - Confirm Payment pressed, processing the transaction
  //   'success'  - payment completed
  //   'error'    - tap failed validation (disabled / not registered / unrecognized)
  const [stage, setStage] = useState('waiting');
  const [message, setMessage] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [cardUid, setCardUid] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [nfcSupported, setNfcSupported] = useState(true);

  // Guards against a lingering NFC reading event firing after we've already
  // moved past the 'waiting'/'error' stages (e.g. right after a successful
  // charge, or while a lookup is already in flight).
  const stageRef = useRef(stage);
  useEffect(() => { stageRef.current = stage; }, [stage]);

  function loadItems() {
    paymentApi.itemsForInstitution(institutionId).then(setItems).catch((e) => setLoadError(e.message));
  }

  useEffect(() => { loadItems(); }, [institutionId]);

  const basketTotal = useMemo(
    () => items.reduce((sum, it) => sum + (quantities[it.id] || 0) * Number(it.price), 0),
    [items, quantities],
  );
  // Total number of item-units in the basket (a quantity of 2 counts as 2),
  // not just the number of distinct items selected.
  const basketCount = useMemo(
    () => Object.values(quantities).reduce((sum, qty) => sum + qty, 0),
    [quantities],
  );

  // Each tap adds one more unit of this item to the basket.
  function incrementItem(item) {
    setQuantities((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
  }

  // Removes one unit; drops the item entirely once it reaches zero.
  function decrementItem(item) {
    setQuantities((prev) => {
      const current = prev[item.id] || 0;
      if (current <= 1) {
        const { [item.id]: _omit, ...rest } = prev;
        return rest;
      }
      return { ...prev, [item.id]: current - 1 };
    });
  }

  function clearSelection() {
    setQuantities({});
  }

  // Moves to the payment screen with a fixed snapshot of items - either the
  // whole current basket ("Pay" button) or a single item from a double-click
  // (instant checkout, bypassing the basket entirely).
  function goToPay(itemsToCharge) {
    if (!itemsToCharge.length) return;
    setBasketItems(itemsToCharge);
    setStage('waiting');
    setMessage('');
    setCustomerName('');
    setCardUid('');
    setReceipt(null);
    setScreen('pay');
  }

  function handlePayBasket() {
    // Expand each selected item into one entry per unit (a quantity of 3
    // becomes three basket entries) so the payment screen's itemized
    // receipt, and the itemIds sent to the backend, both reflect quantity.
    const itemsToCharge = items.flatMap((it) => Array(quantities[it.id] || 0).fill(it));
    goToPay(itemsToCharge);
  }

  function handleDoubleClickItem(item) {
    goToPay([item]);
  }

  // Used to return to a clean item grid without re-triggering a payment.
  function resetToItemGrid() {
    setBasketItems([]);
    clearSelection();
    setStage('waiting');
    setMessage('');
    setCustomerName('');
    setCardUid('');
    setReceipt(null);
    setScreen('select');
    loadItems(); // refresh in case items were added/removed while this screen was open
  }

  // ---- Page-specific NFC flow ----
  // Web NFC is only initialized while this component is showing the payment
  // screen for an active basket - never scanning continuously in the
  // background elsewhere in the app.
  useEffect(() => {
    if (screen !== 'pay') return;
    if (!('NDEFReader' in window)) {
      setNfcSupported(false);
      return;
    }

    setNfcSupported(true);
    let cancelled = false;
    const reader = new window.NDEFReader();

    reader.scan().then(() => {
      reader.onreading = (event) => {
        if (cancelled) return;
        // Only react to a fresh tap while we're actually waiting for one
        // (ignore stray reads mid-lookup, mid-charge, or after success).
        if (stageRef.current !== 'waiting' && stageRef.current !== 'error') return;
        // The Web NFC API hands back the UID as lowercase, colon-separated
        // hex byte pairs (e.g. "04:a1:b2:c3:d4:e5:f6"). Card UIDs are
        // hexadecimal and stored uppercase with no separators (see
        // AdminService), so normalize the same way here - otherwise a real
        // physical tap would never match the card record an admin created.
        const uid = event.serialNumber ? event.serialNumber.replace(/:/g, '').toUpperCase() : '';
        // Handy while wiring up real physical cards: confirms the reader is
        // actually detecting taps and shows the exact UID being sent to the
        // backend, without putting it anywhere a customer would see it.
        console.log('[tap-to-pay] NFC card detected, UID:', uid);
        handleCardDetected(uid);
      };
      reader.onreadingerror = () => {
        if (cancelled) return;
        setStage('error');
        setMessage('Could not read the card. Please try again.');
      };
    }).catch((err) => {
      if (cancelled) return;
      setNfcSupported(false);
      setMessage(`Unable to start the NFC reader: ${err.message}`);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, basketItems]);

  async function handleCardDetected(uid) {
    if (!uid) return;
    setCardUid(uid);
    setStage('reading');
    setMessage('');
    try {
      const result = await paymentApi.lookupCard(uid);
      setCustomerName(result.customerName);
      setStage('confirm');
    } catch (err) {
      setStage('error');
      setMessage(err.message);
    }
  }

  async function handleConfirmPayment() {
    if (!basketItems.length || !cardUid) return;
    setStage('charging');
    setMessage('');
    try {
      const result = await paymentApi.tapToPay({ cardUid, itemIds: basketItems.map((it) => it.id) });
      setReceipt(result);
      setStage('success');
      setMessage('Payment received successfully.');
      playBeep();
    } catch (err) {
      setStage('error');
      setMessage(err.message);
    }
  }

  // Restarts the card-scanning process after a failed tap.
  function handleTryAgain() {
    setStage('waiting');
    setMessage('');
    setCustomerName('');
    setCardUid('');
  }

  if (screen === 'select') {
    return (
      <div className="page terminal-page">
        <div className="terminal-brand"><Logo size={30} /></div>
        <BackButton to="/institution" label="Back to Dashboard" />
        <div className="card">
          <div className="terminal-select-header">
            <div>
              <h2 style={{ margin: 0 }}>Select Items</h2>
              <p className="modal-hint" style={{ margin: '4px 0 0' }}>
                Tap to add to the order (tap again for more of the same item) · double-tap to pay for just one · use − to remove one
              </p>
            </div>
            {items.length > 0 && (
              <span className="terminal-item-count">{items.length} item{items.length === 1 ? '' : 's'}</span>
            )}
          </div>
          {loadError && <div className="error">{loadError}</div>}
          {items.length === 0 && !loadError ? (
            <div className="terminal-empty">
              <span className="terminal-empty-icon" aria-hidden="true">🧾</span>
              <p className="muted-empty">No items available yet.</p>
            </div>
          ) : (
            <div className="item-grid">
              {items.map((it) => {
                const qty = quantities[it.id] || 0;
                const selected = qty > 0;
                return (
                  <button
                    key={it.id}
                    type="button"
                    className={`item-tile${selected ? ' selected' : ''}`}
                    aria-pressed={selected}
                    // Each tap adds one more of this item to the basket -
                    // build up an order of several items (or several of the
                    // same item) before paying. A double-tap/double-click
                    // skips the basket entirely and jumps straight to
                    // paying for just one of this item.
                    onClick={() => incrementItem(it)}
                    onDoubleClick={(e) => { e.preventDefault(); handleDoubleClickItem(it); }}
                  >
                    {selected && (
                      <span className="item-tile-check item-tile-qty" aria-hidden="true">
                        {qty > 1 ? `×${qty}` : '✓'}
                      </span>
                    )}
                    {selected && (
                      <span
                        className="item-tile-decrement"
                        role="button"
                        tabIndex={0}
                        aria-label={`Remove one ${it.name}`}
                        onClick={(e) => { e.stopPropagation(); decrementItem(it); }}
                        onDoubleClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); decrementItem(it); }
                        }}
                      >
                        −
                      </span>
                    )}
                    <span className="item-tile-avatar" aria-hidden="true">
                      {it.name.trim().charAt(0).toUpperCase() || '?'}
                    </span>
                    <div className="item-tile-name">{it.name}</div>
                    <div className="item-tile-price">TSh{formatMoney(it.price)}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {basketCount > 0 && (
          <div className="terminal-checkout-bar">
            <div className="terminal-checkout-summary">
              <span className="terminal-checkout-count">
                {basketCount} item{basketCount === 1 ? '' : 's'} selected
              </span>
              <span className="terminal-checkout-total">TSh{formatMoney(basketTotal)}</span>
            </div>
            <div className="row" style={{ gap: 8, width: 'auto' }}>
              <button type="button" className="secondary" style={{ width: 'auto' }} onClick={clearSelection}>
                Clear
              </button>
              <button type="button" className="btn-primary" style={{ width: 'auto' }} onClick={handlePayBasket}>
                Pay TSh{formatMoney(basketTotal)} →
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // On the payment screen: a single item shows the same simple name + price
  // header as before, while multiple items get an itemized receipt-style
  // breakdown so the seller can double-check what's being charged.
  const isMultiItem = basketItems.length > 1;
  const displayTotal = stage === 'success' && receipt
    ? receipt.totalAmount
    : basketItems.reduce((s, it) => s + Number(it.price), 0);
  const receiptLines = stage === 'success' && receipt
    ? receipt.transactions.map((tx) => ({ id: tx.id, name: tx.itemName, amount: tx.amount }))
    : basketItems.map((it) => ({ id: it.id, name: it.name, amount: it.price }));

  return (
    <div className="page terminal-page">
      <div className="terminal-brand"><Logo size={30} /></div>
      {stage !== 'success' && (
        <button type="button" className="back-button" onClick={() => setScreen('select')} disabled={stage === 'charging'}>
          <span aria-hidden="true">←</span> Back to items
        </button>
      )}
      <div className="card" style={{ textAlign: 'center' }}>
        {isMultiItem || (stage === 'success' && receiptLines.length > 1) ? (
          <>
            <h2 style={{ marginBottom: 10 }}>{receiptLines.length} Items</h2>
            <ul className="terminal-receipt">
              {receiptLines.map((line) => (
                <li key={line.id}>
                  <span>{line.name}</span>
                  <span>TSh{formatMoney(line.amount)}</span>
                </li>
              ))}
            </ul>
            <h1>TSh{formatMoney(displayTotal)}</h1>
          </>
        ) : (
          <>
            <h2>{receiptLines[0]?.name}</h2>
            <h1>TSh{formatMoney(displayTotal)}</h1>
          </>
        )}

        <div className={`tap-circle tap-circle-${stage === 'waiting' ? 'idle' : stage === 'reading' ? 'processing' : stage === 'charging' ? 'processing' : stage}`}>
          {stage === 'reading' || stage === 'charging' ? (
            <>
              <span className="tap-circle-icon">⏳</span>
              <span>{stage === 'reading' ? 'READING CARD' : 'PROCESSING'}</span>
            </>
          ) : stage === 'success' ? (
            <>
              <span className="tap-circle-icon">✓</span>
              <span>PAID</span>
            </>
          ) : stage === 'error' ? (
            <>
              <span className="tap-circle-icon">✕</span>
              <span>TRY AGAIN</span>
            </>
          ) : stage === 'confirm' ? (
            <>
              <span className="tap-circle-icon">✓</span>
              <span>CARD READ</span>
            </>
          ) : (
            <>
              <svg className="tap-circle-icon-svg" width="30" height="42" viewBox="0 0 34 50" fill="none" aria-hidden="true">
                <circle cx="10" cy="30" r="3.4" fill="#f0d6a0" />
                <path d="M 13.50 23.94 A 7 7 0 0 0 13.50 36.06" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M 16.00 19.61 A 12 12 0 0 0 16.00 40.39" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" opacity="0.72" />
                <path d="M 18.50 15.28 A 17 17 0 0 0 18.50 44.72" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" opacity="0.45" />
              </svg>
              <span>TAP TO PAY</span>
            </>
          )}
        </div>

        {stage === 'waiting' && !nfcSupported && (
          <p className="modal-hint">
            This device or browser doesn't support NFC tap payments. Use a supported Android/Chrome device with NFC enabled.
          </p>
        )}

        {message && <div className={stage === 'success' ? 'success' : 'error'}>{message}</div>}

        {stage === 'confirm' && (
          <>
            <p className="modal-hint" style={{ marginTop: 4 }}>
              Card read for <strong>{customerName}</strong>.
            </p>
            <button onClick={handleConfirmPayment}>Confirm Payment</button>
          </>
        )}

        {stage === 'error' && (
          <button onClick={handleTryAgain}>Try Again</button>
        )}

        {stage === 'success' ? (
          // After a successful payment, the customer/staff choose where to go
          // next - never silently dropped back onto the payment/item screen.
          //
          // "Home" here means back to this terminal's own item-selection
          // screen (the payment kiosk's home), not the app's global "/" route.
          // Navigating to "/" would hit the catch-all redirect straight to
          // /login, which was the bug: both buttons ended up on the Login
          // page. "Login" is the intentional staff exit back to the app.
          <div className="row" style={{ gap: 10, marginTop: 14 }}>
            <button className="btn-primary" style={{ width: 'auto' }} onClick={resetToItemGrid}>
              ← Back to Home
            </button>
            <button className="secondary" style={{ width: 'auto' }} onClick={() => navigate('/login')}>
              🔑 Login
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
