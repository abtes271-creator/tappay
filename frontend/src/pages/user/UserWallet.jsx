import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { walletApi, getSession } from '../../api/api';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import Modal from '../../components/Modal';
import MaskedBalance from '../../components/MaskedBalance';
import MobileMoneyProviders, { MOBILE_MONEY_PROVIDERS } from '../../components/MobileMoneyProviders';
import { USER_NAV_LINKS } from './navLinks';

// Matches the backend's wallet amount column precision (NUMERIC(19,4)) with
// headroom subtracted - keeps a single load/withdrawal comfortably below the
// database's hard ceiling so a mistyped amount fails fast with a clear
// message instead of a raw SQL "numeric field overflow" error.
const MAX_TRANSACTION_AMOUNT = 100000;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function UserWallet() {
  const session = getSession();
  const firstName = (session.username || 'there').split(/[.\s_-]/)[0];

  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState('');

  const [showLoadModal, setShowLoadModal] = useState(false);
  const [provider, setProvider] = useState(MOBILE_MONEY_PROVIDERS[0]);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawProvider, setWithdrawProvider] = useState(MOBILE_MONEY_PROVIDERS[0]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Password is only asked for in a confirmation step right before the
  // withdrawal is actually processed - not up front with amount/phone.
  const [showWithdrawPasswordModal, setShowWithdrawPasswordModal] = useState(false);
  const [withdrawPassword, setWithdrawPassword] = useState('');
  const [withdrawPasswordError, setWithdrawPasswordError] = useState('');

  async function load() {
    try {
      setWallet(await walletApi.getBalance());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  function openLoadModal() {
    setProvider(MOBILE_MONEY_PROVIDERS[0]);
    setAmount('');
    setPhone('');
    setModalError('');
    setShowLoadModal(true);
  }

  async function handleLoadMoney(e) {
    e.preventDefault();
    setModalError('');
    const numericAmount = parseFloat(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setModalError('Amount must be a positive number.');
      return;
    }
    if (numericAmount > MAX_TRANSACTION_AMOUNT) {
      setModalError(`Amount cannot exceed TSh${MAX_TRANSACTION_AMOUNT.toLocaleString()} per load.`);
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      setModalError('Phone number must be exactly 10 digits.');
      return;
    }
    setModalLoading(true);
    try {
      await walletApi.loadMoney({
        amount: numericAmount,
        phoneNumber: phone,
        provider,
        mobileMoneyReference: `MM-${Date.now()}`,
      });
      setShowLoadModal(false);
      setSuccess(`Successfully loaded TSh${amount} into your wallet via ${provider}.`);
      load();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  }

  function openWithdrawModal() {
    setWithdrawProvider(MOBILE_MONEY_PROVIDERS[0]);
    setWithdrawAmount('');
    setWithdrawPhone('');
    setWithdrawError('');
    setShowWithdrawModal(true);
  }

  function handleWithdrawClick(e) {
    e.preventDefault();
    setWithdrawError('');
    const numericAmount = parseFloat(withdrawAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setWithdrawError('Amount must be a positive number.');
      return;
    }
    if (numericAmount > Number(wallet?.balance || 0)) {
      setWithdrawError('Amount cannot exceed your available balance.');
      return;
    }
    if (numericAmount > MAX_TRANSACTION_AMOUNT) {
      setWithdrawError(`Amount cannot exceed TSh${MAX_TRANSACTION_AMOUNT.toLocaleString()} per withdrawal.`);
      return;
    }
    if (!/^\d{10}$/.test(withdrawPhone)) {
      setWithdrawError('Phone number must be exactly 10 digits.');
      return;
    }
    setWithdrawPassword('');
    setWithdrawPasswordError('');
    setShowWithdrawPasswordModal(true);
  }

  async function handleConfirmWithdraw(e) {
    e.preventDefault();
    if (!withdrawPassword) {
      setWithdrawPasswordError('Enter your password to confirm.');
      return;
    }
    setWithdrawPasswordError('');
    setWithdrawLoading(true);
    try {
      await walletApi.withdraw({
        amount: parseFloat(withdrawAmount),
        phoneNumber: withdrawPhone,
        provider: withdrawProvider,
        password: withdrawPassword,
      });
      setShowWithdrawPasswordModal(false);
      setShowWithdrawModal(false);
      setWithdrawPassword('');
      setSuccess(`Successfully withdrew TSh${withdrawAmount} to ${withdrawProvider}.`);
      load();
    } catch (err) {
      setWithdrawPasswordError(err.message);
    } finally {
      setWithdrawLoading(false);
    }
  }

  return (
    <div className="page">
      <TopNav homePath="/user" links={USER_NAV_LINKS} />

      <div className="welcome-hero">
        <div>
          <p className="welcome-eyebrow">{greeting()}</p>
          <h1 className="welcome-title">Welcome back, {firstName}</h1>
          <p className="welcome-sub">Here's your wallet at a glance.</p>
        </div>
      </div>

      <div className="wallet-card">
        <div className="wallet-card-top">
          <div className="wallet-card-chip" aria-hidden="true" />
          <span className="wallet-card-tag">cpay</span>
        </div>
        <p className="wallet-card-label">Available balance</p>
        <MaskedBalance amount={wallet?.balance} className="wallet-balance-figure" dark />
        <div className="wallet-card-footer">
          <div>
            <div className="wallet-card-name">{session.username || 'Cardholder'}</div>
            <div className="wallet-card-sub">WALLET1 · personal spending</div>
          </div>
        </div>
      </div>

      {(success || error) && (
        <div className="card" style={{ marginBottom: 4 }}>
          {success && <div className="success" style={{ marginBottom: 0 }}>{success}</div>}
          {error && <div className="error" style={{ marginBottom: 0 }}>{error}</div>}
        </div>
      )}

      <h3 className="quick-actions-heading">Wallet activities</h3>
      <div className="quick-actions-grid">
        <button type="button" className="quick-action-tile" onClick={openLoadModal}>
          <span className="quick-action-icon">💰</span>
          <span className="quick-action-title">Load Money</span>
          <span className="quick-action-desc">Top up your wallet via mobile money.</span>
        </button>
        <button type="button" className="quick-action-tile" onClick={openWithdrawModal}>
          <span className="quick-action-icon">↑</span>
          <span className="quick-action-title">Withdraw</span>
          <span className="quick-action-desc">Send funds out to a mobile money account.</span>
        </button>
        <Link to="/user/transactions" className="quick-action-tile">
          <span className="quick-action-icon">📊</span>
          <span className="quick-action-title">Activity</span>
          <span className="quick-action-desc">View and filter your load, payment and withdrawal history.</span>
        </Link>
      </div>

      {showLoadModal && (
        <Modal title="Load Money via Mobile Money" onClose={() => setShowLoadModal(false)}>
          <form onSubmit={handleLoadMoney}>
            <p className="modal-hint">Top up your wallet directly from your mobile money account.</p>
            {modalError && <div className="error">{modalError}</div>}
            <MobileMoneyProviders value={provider} onChange={setProvider} />
            <label htmlFor="load-phone">Mobile money phone number</label>
            <input
              id="load-phone"
              placeholder="e.g. 09xxxxxxxx" inputMode="numeric" pattern="\d{10}" maxLength={10}
              title="Enter exactly 10 digits"
              value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} required
            />
            <label htmlFor="load-amount">Amount</label>
            <input
              id="load-amount"
              type="number" step="0.01" min="0.01" max={MAX_TRANSACTION_AMOUNT} placeholder="0.00"
              value={amount} onChange={(e) => setAmount(e.target.value)} required
            />
            <p className="modal-hint" style={{ marginTop: -8 }}>
              Maximum TSh{MAX_TRANSACTION_AMOUNT.toLocaleString()} per load.
            </p>
            <button type="submit" className="btn-primary" disabled={modalLoading}>
              {modalLoading ? 'Processing...' : 'Load Money'}
            </button>
          </form>
        </Modal>
      )}

      {showWithdrawModal && (
        <Modal title="Withdraw to Mobile Money" onClose={() => setShowWithdrawModal(false)}>
          <form onSubmit={handleWithdrawClick}>
            <p className="modal-hint">Send money from your wallet out to a mobile money account.</p>
            {withdrawError && <div className="error">{withdrawError}</div>}
            <MobileMoneyProviders value={withdrawProvider} onChange={setWithdrawProvider} />
            <label htmlFor="withdraw-phone">Mobile money phone number</label>
            <input
              id="withdraw-phone"
              placeholder="e.g. 09xxxxxxxx" inputMode="numeric" pattern="\d{10}" maxLength={10}
              title="Enter exactly 10 digits"
              value={withdrawPhone} onChange={(e) => setWithdrawPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} required
            />
            <label htmlFor="withdraw-amount">Amount</label>
            <input
              id="withdraw-amount"
              type="number" step="0.01" min="0.01"
              max={Math.min(Number(wallet?.balance || 0) || MAX_TRANSACTION_AMOUNT, MAX_TRANSACTION_AMOUNT)}
              placeholder="0.00"
              value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} required
            />
            <p className="modal-hint" style={{ marginTop: -8 }}>
              Available balance: TSh{Number(wallet?.balance || 0).toFixed(2)} · maximum TSh{MAX_TRANSACTION_AMOUNT.toLocaleString()} per withdrawal.
            </p>
            <button type="submit" className="btn-primary">Withdraw</button>
          </form>
        </Modal>
      )}

      {showWithdrawPasswordModal && (
        <Modal title="Confirm withdrawal" onClose={() => !withdrawLoading && setShowWithdrawPasswordModal(false)}>
          <p className="modal-hint" style={{ marginTop: -4 }}>
            Enter your password to confirm sending TSh{Number(withdrawAmount || 0).toFixed(2)} to {withdrawProvider} ({withdrawPhone}).
          </p>
          {withdrawPasswordError && <div className="error">{withdrawPasswordError}</div>}
          <form onSubmit={handleConfirmWithdraw}>
            <label htmlFor="withdraw-password">Password</label>
            <input id="withdraw-password" type="password" placeholder="Your account password" autoFocus
                   value={withdrawPassword} onChange={(e) => setWithdrawPassword(e.target.value)} required />
            <button type="submit" className="btn-primary" disabled={withdrawLoading}>
              {withdrawLoading ? 'Processing...' : 'Confirm Withdrawal'}
            </button>
          </form>
        </Modal>
      )}
      <Footer />
    </div>
  );
}
