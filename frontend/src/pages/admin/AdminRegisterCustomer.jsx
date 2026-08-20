import React, { useRef, useState } from 'react';
import { adminApi } from '../../api/api';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import { ADMIN_NAV_LINKS } from './navLinks';

// Registers a brand-new customer account and links it to an unregistered
// card in one step. There used to also be an "Existing User (by ID)" mode
// that linked a card directly to an already-existing account - it was
// causing confusion (admins would land on it by accident and end up
// re-linking/relinking accounts instead of registering a new customer), so
// that path has been removed entirely. This screen now only ever creates a
// new customer.
export default function AdminRegisterCustomer() {
  const [findCardNo, setFindCardNo] = useState('');
  const [step, setStep] = useState('find'); // 'find' | 'form' | 'done'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundCardNo, setFoundCardNo] = useState('');
  const [doneUsername, setDoneUsername] = useState('');
  const [customerForm, setCustomerForm] = useState({ fullName: '', email: '', phone: '', username: '', password: '' });

  // Bulk upload: institution sends a CSV/Excel of their customers, cards
  // already loaded into the system via "Add Cards" get linked all at once.
  const bulkFileInputRef = useRef(null);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkError, setBulkError] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);

  async function handleBulkUpload(e) {
    e.preventDefault();
    setBulkError(''); setBulkResult(null);
    const file = bulkFileInputRef.current?.files?.[0];
    if (!file) { setBulkError('Choose a CSV or Excel file first.'); return; }
    setBulkUploading(true);
    try {
      const result = await adminApi.uploadCustomersFile(file);
      setBulkResult(result);
      if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
    } catch (err) {
      setBulkError(err.message);
    } finally {
      setBulkUploading(false);
    }
  }

  function resetAll() {
    setFindCardNo(''); setStep('find'); setError('');
    setFoundCardNo(''); setDoneUsername('');
    setCustomerForm({ fullName: '', email: '', phone: '', username: '', password: '' });
  }

  function updateCustomerForm(field, value) {
    if (field === 'phone') {
      // Digits only, capped at 10 - keeps the field strictly a 10-digit phone number.
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setCustomerForm((f) => ({ ...f, [field]: value }));
  }

  async function handleFindCard(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const result = await adminApi.lookupCard(findCardNo.trim());
      if (result.registered) {
        setError('This card is already registered to a customer.');
        return;
      }
      if (!result.enabled) {
        setError('This card is disabled. Enable it from the Card List page first.');
        return;
      }
      setFoundCardNo(result.cardNo);
      setStep('form');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterCustomer(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    if (!/^\d{10}$/.test(customerForm.phone)) {
      setError('Phone number must be exactly 10 digits.');
      setLoading(false);
      return;
    }
    try {
      const res = await adminApi.registerCustomer(foundCardNo, customerForm);
      setDoneUsername(res.username);
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <TopNav homePath="/admin" links={ADMIN_NAV_LINKS} />

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Register Customer</h2>
        <p className="muted" style={{ marginTop: -8 }}>
          Find an unregistered card, then create a brand-new customer account linked to it.
        </p>

        {step === 'find' && (
          <form onSubmit={handleFindCard}>
            <p className="modal-hint">Enter the card number to find (format e.g. xxxx-xxxx-xxxx).</p>
            {error && <div className="error">{error}</div>}
            <label htmlFor="find-cardno">Card No</label>
            <input
              id="find-cardno" placeholder="Card No" value={findCardNo}
              onChange={(e) => setFindCardNo(e.target.value)} autoFocus required
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Searching...' : 'Find Card'}
            </button>
          </form>
        )}

        {step === 'form' && (
          <form onSubmit={handleRegisterCustomer}>
            <div className="success" style={{ marginBottom: 12 }}>Card {foundCardNo} found and unregistered ✓</div>
            {error && <div className="error">{error}</div>}
            <label htmlFor="cust-fullname">Full name</label>
            <input id="cust-fullname" placeholder="Full name" value={customerForm.fullName}
                   onChange={(e) => updateCustomerForm('fullName', e.target.value)} required />
            <label htmlFor="cust-email">Email</label>
            <input id="cust-email" type="email" placeholder="Email" value={customerForm.email}
                   onChange={(e) => updateCustomerForm('email', e.target.value)} required />
            <label htmlFor="cust-phone">Phone</label>
            <input id="cust-phone" placeholder="Phone" value={customerForm.phone}
                   onChange={(e) => updateCustomerForm('phone', e.target.value)} required />
            <label htmlFor="cust-username">Username</label>
            <input id="cust-username" placeholder="Username" value={customerForm.username}
                   onChange={(e) => updateCustomerForm('username', e.target.value)} required />
            <label htmlFor="cust-password">Password</label>
            <input id="cust-password" type="password" placeholder="Password" value={customerForm.password}
                   onChange={(e) => updateCustomerForm('password', e.target.value)} required />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save & Register'}
            </button>
            <button type="button" className="secondary" onClick={resetAll}>Start over</button>
          </form>
        )}

        {step === 'done' && (
          <div>
            <div className="success">
              Customer {doneUsername ? `@${doneUsername} ` : ''}registered and linked to card {foundCardNo}. A welcome
              email with their username and password has been sent.
            </div>
            <button className="btn-primary" style={{ marginTop: 14 }} onClick={resetAll}>
              Register Another Customer
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2 style={{ marginTop: 0 }}>Bulk Register via CSV or Excel</h2>
        <p className="muted" style={{ marginTop: -8 }}>
          Have the institution send a spreadsheet of their customers and upload it here to register and link
          them all at once, instead of doing it one by one. Each row's card must already exist in the system
          (via <strong>Add Cards</strong>) and be unregistered.
        </p>
        <form onSubmit={handleBulkUpload} className="add-card-form">
          <p className="modal-hint" style={{ marginTop: -4 }}>
            Header row with <code>CardNo</code>, <code>FullName</code>, <code>Email</code>, <code>Phone</code>
            (10 digits), <code>Username</code> and <code>Password</code> columns - all six are required for
            every row, nothing is auto-generated. Each customer gets their username and password by email;
            the password is never shown here. Accepts <code>.csv</code>, <code>.xlsx</code> or <code>.xls</code>.
          </p>
          {bulkError && <div className="error">{bulkError}</div>}
          {bulkResult && (
            <div className="success">
              {bulkResult.created} customer(s) registered and linked out of {bulkResult.totalRows} row(s).
              Each was emailed their username and password.
              {bulkResult.errors?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <strong>Skipped rows:</strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                    {bulkResult.errors.slice(0, 10).map((e, i) => <li key={i} style={{ fontSize: 12 }}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
          <input type="file" accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" ref={bulkFileInputRef} />
          <button type="submit" disabled={bulkUploading}>{bulkUploading ? 'Uploading...' : 'Upload File'}</button>
        </form>
      </div>

      <Footer />
    </div>
  );
}
