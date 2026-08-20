import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/api';
import Logo from '../components/Logo';
import { KeyIcon } from '../components/AuthIcons';
import Footer from '../components/Footer';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, newPassword });
      alert('Password reset successfully. Please log in with your new password.');
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-standalone">
        <div className="page">
          <div className="card">
            <div className="auth-brand"><Logo size={34} /></div>
            <div className="auth-icon-badge"><KeyIcon /></div>
            <h2>Reset Password</h2>
            <div className="error">This link is missing its reset token. Please request a new one.</div>
            <p style={{ marginTop: 16, fontSize: 14 }}>
              <Link to="/forgot-password">Request a new reset link</Link>
            </p>
          </div>
          <Footer compact />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-standalone">
      <div className="page">
        <div className="card">
          <div className="auth-brand"><Logo size={34} /></div>
          <div className="auth-icon-badge"><KeyIcon /></div>
          <h2>Reset Password</h2>
          <p>Choose a new password for your account.</p>
          {error && <div className="error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <input
              type="password" placeholder="New password"
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
            />
            <input
              type="password" placeholder="Confirm new password"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
          <p style={{ marginTop: 16, fontSize: 14 }}>
            <Link to="/login">Back to login</Link>
          </p>
        </div>
        <Footer compact />
      </div>
    </div>
  );
}
