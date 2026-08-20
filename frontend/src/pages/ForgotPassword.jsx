import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/api';
import Logo from '../components/Logo';
import { MailIcon } from '../components/AuthIcons';
import Footer from '../components/Footer';

export default function ForgotPassword() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword({ usernameOrEmail });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-standalone">
      <div className="page">
        <div className="card">
          <div className="auth-brand"><Logo size={34} /></div>
          <div className="auth-icon-badge"><MailIcon /></div>
          <h2>Forgot Password</h2>
          <p>Works for admin, institution and personal accounts alike.</p>
        {error && <div className="error">{error}</div>}
        {sent ? (
          <div className="success">
            If an account matches that username or email, we've sent a reset link.
            Check your inbox the link expires in 30 minutes.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              placeholder="Username or email"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              required
            />
            <div className="row" style={{ gap: 10 }}>
              <button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="secondary" onClick={() => navigate('/login')} disabled={loading}>
                Cancel
              </button>
            </div>
          </form>
        )}
        {/* Deliberately no "Don't have an account?" link here - that only
            belongs on the Login screen, not on the password-recovery flow. */}
          <p style={{ marginTop: 16, fontSize: 14 }}>
            <Link to="/login">Back to login</Link>
          </p>
        </div>
        <Footer compact />
      </div>
    </div>
  );
}
