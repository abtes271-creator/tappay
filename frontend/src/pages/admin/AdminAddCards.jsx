import React, { useRef, useState } from 'react';
import { adminApi } from '../../api/api';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import { ADMIN_NAV_LINKS } from './navLinks';

export default function AdminAddCards() {
  // Add single card - both cardNo and cardUid are required; the UID is
  // never auto-generated, it must be the real value read off the card.
  const [addCardNo, setAddCardNo] = useState('');
  const [addCardUid, setAddCardUid] = useState('');
  const [addCardMsg, setAddCardMsg] = useState('');
  const [addCardError, setAddCardError] = useState('');
  const [addingCard, setAddingCard] = useState(false);

  // CSV / Excel upload
  const fileInputRef = useRef(null);
  const [csvResult, setCsvResult] = useState(null);
  const [csvError, setCsvError] = useState('');
  const [uploading, setUploading] = useState(false);

  async function handleAddCard(e) {
    e.preventDefault();
    setAddCardMsg(''); setAddCardError('');
    if (!/^\d{12}$/.test(addCardNo.trim())) {
      setAddCardError('Card Number is required and must contain exactly 12 digits.');
      return;
    }
    if (addCardUid.trim().length === 0) {
      setAddCardError('Card UID is required - scan it off the physical card.');
      return;
    }
    if (!/^[0-9A-F]{14}$/.test(addCardUid.trim())) {
      setAddCardError('Card UID must be exactly 14 hexadecimal characters (0-9, A-F).');
      return;
    }
    setAddingCard(true);
    try {
      const card = await adminApi.addCard({ cardNo: addCardNo, cardUid: addCardUid });
      setAddCardMsg(`Card ${card.cardNo} added (UID: ${card.cardUid}). Unregistered - use "Register Customer" to link it to someone.`);
      setAddCardNo(''); setAddCardUid('');
    } catch (err) {
      setAddCardError(err.message);
    } finally {
      setAddingCard(false);
    }
  }

  async function handleUploadFile(e) {
    e.preventDefault();
    setCsvError(''); setCsvResult(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) { setCsvError('Choose a CSV or Excel file first.'); return; }
    setUploading(true);
    try {
      const result = await adminApi.uploadCardsFile(file);
      setCsvResult(result);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setCsvError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="page page-wide">
      <TopNav homePath="/admin" links={ADMIN_NAV_LINKS} />

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Add Cards</h2>
        <div className="add-card-grid">
          <form onSubmit={handleAddCard} className="add-card-form">
            <h4 style={{ marginTop: 0 }}>Add a single card</h4>
            {addCardError && <div className="error">{addCardError}</div>}
            {addCardMsg && <div className="success">{addCardMsg}</div>}
            <label htmlFor="add-card-no">Card Number (12 digits)</label>
            <input id="add-card-no" placeholder="e.g. 452188901123" inputMode="numeric" pattern="\d{12}"
                   maxLength={12} title="Enter exactly 12 digits" value={addCardNo}
                   onChange={(e) => setAddCardNo(e.target.value.replace(/\D/g, '').slice(0, 12))} required />
            <label htmlFor="add-card-uid">Card UID (14 hex characters)</label>
            <input id="add-card-uid" placeholder="e.g. 04A1B2C3D4E5F6 - scan the physical card"
                   pattern="[0-9A-Fa-f]{14}" maxLength={14} title="Enter exactly 14 hexadecimal characters (0-9, A-F)"
                   value={addCardUid}
                   onChange={(e) => setAddCardUid(e.target.value.replace(/[^0-9a-fA-F]/g, '').toUpperCase().slice(0, 14))} required />
            <p className="modal-hint" style={{ marginTop: -8 }}>
              The UID is hexadecimal - a mix of digits (0-9) and capital letters (A-F), not just numbers. It's
              the physical card's real NFC UID and is never auto-generated.
            </p>
            <button type="submit" disabled={addingCard}>{addingCard ? 'Adding...' : 'Add Card'}</button>
          </form>

          <form onSubmit={handleUploadFile} className="add-card-form">
            <h4 style={{ marginTop: 0 }}>Bulk-add via CSV or Excel</h4>
            <p className="modal-hint" style={{ marginTop: -4 }}>
              Header row with <code>CardNo</code> and <code>cardUid</code> columns - both required, one row per
              physical card. <code>cardUid</code> must be 14 hexadecimal characters (0-9, A-F); it's never
              auto-generated. Accepts <code>.csv</code>, <code>.xlsx</code> or <code>.xls</code>.
            </p>
            {csvError && <div className="error">{csvError}</div>}
            {csvResult && (
              <div className="success">
                {csvResult.created} card(s) created out of {csvResult.totalRows} row(s).
                {csvResult.errors?.length > 0 && (
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                    {csvResult.errors.slice(0, 6).map((e, i) => <li key={i} style={{ fontSize: 12 }}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
            <input type="file" accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" ref={fileInputRef} />
            <button type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload File'}</button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
