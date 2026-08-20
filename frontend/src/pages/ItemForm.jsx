import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { institutionApi } from '../api/api';
import BackButton from '../components/BackButton';
import Logo from '../components/Logo';
import Footer from '../components/Footer';

// Same form doubles as "Add Item" (no :itemId in the URL) and "Edit Item"
// (:itemId present) - the institution's item tiles link here in edit mode.
export default function ItemForm() {
  const { itemId } = useParams();
  const isEdit = Boolean(itemId);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingItem, setLoadingItem] = useState(isEdit);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    institutionApi.getItem(itemId)
      .then((item) => {
        if (cancelled) return;
        setName(item.name);
        setPrice(String(item.price));
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoadingItem(false));
    return () => { cancelled = true; };
  }, [itemId, isEdit]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const numericPrice = parseFloat(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError('Price must be a positive number.');
      return;
    }
    setLoading(true);
    try {
      const payload = { name, price: numericPrice };
      if (isEdit) {
        await institutionApi.updateItem(itemId, payload);
      } else {
        await institutionApi.addItem(payload);
      }
      navigate('/institution');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="form-page-header">
        <BackButton to="/institution" label="Back to Dashboard" />
        <Logo size={26} />
      </div>
      <div className="card">
        <h2>{isEdit ? 'Edit Item' : 'Add Item'}</h2>
        <p className="muted" style={{ marginTop: -8 }}>
          {isEdit ? 'Update this item\'s name or price.' : 'Add a new item customers can pay for at your terminal.'}
        </p>
        {error && <div className="error">{error}</div>}
        {loadingItem ? (
          <div className="skeleton-list">
            <div className="skeleton-row" /><div className="skeleton-row" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="item-name">Item name</label>
            <input id="item-name" placeholder="e.g. Cappuccino" value={name}
                   onChange={(e) => setName(e.target.value)} required />
            <label htmlFor="item-price">Price</label>
            <input id="item-price" type="number" step="0.01" min="0.01" placeholder="0.00"
                   value={price} onChange={(e) => setPrice(e.target.value)} required />
            <button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Save'}
            </button>
            <button type="button" className="secondary" onClick={() => navigate('/institution')}>Cancel</button>
          </form>
        )}
      </div>
      <Footer compact />
    </div>
  );
}
