import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { institutionApi, getUserIdFromToken } from '../../api/api';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import { INSTITUTION_NAV_LINKS } from './navLinks';

export default function InstitutionItems() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const institutionId = getUserIdFromToken();
  const terminalPath = institutionId ? `/pay/${institutionId}` : null;
  const terminalUrl = terminalPath ? `${window.location.origin}${terminalPath}` : null;

  async function load() {
    try {
      setItems(await institutionApi.myItems());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleRemoveItem(itemId) {
    await institutionApi.deactivateItem(itemId);
    load();
  }

  async function handleCopyLink() {
    if (!terminalUrl) return;
    try {
      await navigator.clipboard.writeText(terminalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) - the link is
      // still visible and selectable in the code chip, so fail silently.
    }
  }

  return (
    <div className="page page-wide">
      <TopNav homePath="/institution" links={INSTITUTION_NAV_LINKS} />

      {terminalPath && (
        <div className="card payment-terminal-card">
          <span className="payment-terminal-live">● LIVE</span>
          <div className="payment-terminal-icon" aria-hidden="true">📟</div>
          <div className="payment-terminal-copy">
            <h3 style={{ margin: 0 }}>Payment Terminal</h3>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              Open this on the tap-to-pay kiosk device, or share it with your counter staff.
            </p>
            <div className="payment-terminal-link-row">
              <code className="payment-terminal-path">{terminalPath}</code>
              <button
                type="button"
                className="secondary payment-terminal-copy-btn"
                onClick={handleCopyLink}
              >
                {copied ? '✓ Copied' : '⧉ Copy link'}
              </button>
            </div>
          </div>
          <Link to={terminalPath} className="payment-terminal-btn-link">
            <button className="btn-primary payment-terminal-btn">Open Payment Terminal →</button>
          </Link>
        </div>
      )}

      <div className="card">
        <div className="row">
          <h3 style={{ margin: 0 }}>Items</h3>
          <Link to="/institution/add-item"><button style={{ width: 'auto' }}>+ Add Item</button></Link>
        </div>
        {error && <div className="error">{error}</div>}
        {items.length === 0 && <p className="muted-empty">No items yet. Add your first item to get started.</p>}
        <div className="item-grid">
          {items.map((it) => (
            <div key={it.id} className="item-tile">
              <div><strong>{it.name}</strong></div>
              <div>TSh{Number(it.price).toFixed(2)}</div>
              <div className="item-tile-actions">
                <Link to={`/institution/edit-item/${it.id}`}>
                  <button className="secondary" style={{ fontSize: 12, padding: 6 }}>✎ Edit</button>
                </Link>
                <button className="danger" style={{ fontSize: 12, padding: 6 }}
                        onClick={() => handleRemoveItem(it.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
