import React, { useState } from 'react';
import { institutionApi } from '../../api/api';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import Modal from '../../components/Modal';
import MobileMoneyProviders, { MOBILE_MONEY_PROVIDERS } from '../../components/MobileMoneyProviders';
import { INSTITUTION_NAV_LINKS } from './navLinks';

// Matches the backend's wallet amount column precision (NUMERIC(19,4)) with
// headroom subtracted - a single withdrawal above this fails fast with a
// clear message instead of a raw SQL "numeric field overflow" error.
const MAX_TRANSACTION_AMOUNT = 100000;

export default function InstitutionWithdraw() {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState(MOBILE_MONEY_PROVIDERS[0]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password is only asked for in a confirmation step right before the
  // withdrawal is actually processed - not up front with amount/phone.
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  function handleWithdrawClick(e) {
    e.preventDefault();
    setMessage(''); setError('');
    const numericAmount = parseFloat(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Amount must be a positive number.');
      return;
    }
    if (numericAmount > MAX_TRANSACTION_AMOUNT) {
      setError(`Amount cannot exceed TSh${MAX_TRANSACTION_AMOUNT.toLocaleString()} per withdrawal.`);
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    setPassword('');
    setPasswordError('');
    setShowPasswordModal(true);
  }

  async function handleConfirmWithdraw(e) {
    e.preventDefault();
    if (!password) {
      setPasswordError('Enter your password to confirm.');
      return;
    }
    setPasswordError('');
    setLoading(true);
    try {
      await institutionApi.withdraw({
        amount: parseFloat(amount),
        phoneNumber: phone,
        provider,
        password,
      });
      setShowPasswordModal(false);
      setMessage(`Withdrawal initiated to ${provider}.`);
      setAmount('');
      setPhone('');
      setPassword('');
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page page-wide">
      <TopNav homePath="/institution" links={INSTITUTION_NAV_LINKS} />

      <div className="card card-narrow">
        <h3>Withdraw to Mobile Money</h3>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleWithdrawClick}>
          <MobileMoneyProviders value={provider} onChange={setProvider} />

          <label htmlFor="withdraw-amount">Amount</label>
          <input id="withdraw-amount" type="number" step="0.01" min="0.01" max={MAX_TRANSACTION_AMOUNT} placeholder="Amount"
                 value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <p className="modal-hint" style={{ marginTop: -8 }}>
            Maximum TSh{MAX_TRANSACTION_AMOUNT.toLocaleString()} per withdrawal.
          </p>
          <label htmlFor="withdraw-phone">Mobile money phone number</label>
          <input id="withdraw-phone" placeholder="e.g. 09xxxxxxxx" inputMode="numeric" pattern="\d{10}"
                 maxLength={10} title="Enter exactly 10 digits"
                 value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} required />
          <button type="submit">Withdraw</button>
        </form>
      </div>

      {showPasswordModal && (
        <Modal title="Confirm withdrawal" onClose={() => !loading && setShowPasswordModal(false)}>
          <p className="modal-hint" style={{ marginTop: -4 }}>
            Enter your password to confirm sending TSh{Number(amount || 0).toFixed(2)} to {provider} ({phone}).
          </p>
          {passwordError && <div className="error">{passwordError}</div>}
          <form onSubmit={handleConfirmWithdraw}>
            <label htmlFor="withdraw-password">Password</label>
            <input id="withdraw-password" type="password" placeholder="Your account password" autoFocus
                   value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit" disabled={loading}>{loading ? 'Processing...' : 'Confirm Withdrawal'}</button>
          </form>
        </Modal>
      )}
      <Footer />
    </div>
  );
}
