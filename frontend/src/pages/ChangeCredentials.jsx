import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, clearSession, getSession } from '../api/api';
import Logo from '../components/Logo';
import Toast from '../components/Toast';
import Footer from '../components/Footer';
import { ShieldCheckIcon } from '../components/AuthIcons';

const HOME_PATH = { ADMIN: '/admin', INSTITUTION: '/institution', USER: '/user' };

export default function ChangeCredentials() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState(getSession().username || '');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const navigate = useNavigate();
  const session = getSession();

  // A user forced here on first login (mustChangePassword) has no safe
  // "home" to cancel back to yet - bail out to a clean login instead of
  // leaving them on a half-authenticated session. Everyone else lands back
  // on their own dashboard.
  function handleCancel() {
    if (session.role && HOME_PATH[session.role]) {
      navigate(HOME_PATH[session.role]);
    } else {
      clearSession();
      navigate('/login');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.changeCredentials({ currentPassword, newUsername, newPassword });
      // Clear, visible confirmation instead of a native browser alert() -
      // stays on screen while we redirect to a clean re-login.
      setShowToast(true);
      setTimeout(() => navigate('/login'), 1600);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-standalone">
      {showToast && (
        <Toast
          message="Credentials Updated Successfully"
          type="success"
          duration={0}
          onClose={() => setShowToast(false)}
        />
      )}
      <div className="page">
        <div className="card">
          <div className="auth-brand"><Logo size={34} /></div>
          <div className="auth-icon-badge"><ShieldCheckIcon /></div>
          <h2>Set Your Credentials</h2>
          <p>For security, you must set a new username and password before continuing.</p>
          {error && <div className="error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <label htmlFor="cc-current">Current (temporary) password</label>
            <input id="cc-current" type="password" placeholder="Current (temporary) password" value={currentPassword}
                   onChange={(e) => setCurrentPassword(e.target.value)} required />
            <label htmlFor="cc-username">New username</label>
            <input id="cc-username" placeholder="New username" value={newUsername}
                   onChange={(e) => setNewUsername(e.target.value)} required />
            <label htmlFor="cc-newpass">New password</label>
            <input id="cc-newpass" type="password" placeholder="New password (must differ from current)" value={newPassword}
                   onChange={(e) => setNewPassword(e.target.value)} required />
            <div className="row" style={{ gap: 10, marginTop: 4 }}>
              <button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save & Continue'}
              </button>
              <button type="button" className="secondary" onClick={handleCancel} disabled={loading}>
                Cancel
              </button>
            </div>
          </form>
        </div>
        <Footer compact />
      </div>
    </div>
  );
}
