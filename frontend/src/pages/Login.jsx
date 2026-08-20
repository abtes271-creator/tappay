import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi, saveSession } from '../api/api';
import Logo from '../components/Logo';
import TapCardArt from '../components/TapCardArt';
import { UserIcon, LockIcon, ShieldCheckIcon } from '../components/AuthIcons';
import Footer from '../components/Footer';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [searchParams] = useSearchParams();
  // Set by api.js when a stored session's token was rejected as expired -
  // shown once, above the normal login form error state.
  const [error, setError] = useState(
    searchParams.get('expired') === '1' ? 'Your session has expired. Please log in again.' : ''
  );
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ username, password });
      saveSession(res);

      if (res.mustChangePassword) {
        navigate('/change-credentials');
        return;
      }
      if (res.role === 'ADMIN') navigate('/admin');
      else if (res.role === 'INSTITUTION') navigate('/institution');
      else navigate('/user');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-hero">
        <div className="auth-hero-brand"><Logo size={34} /></div>
        <div>
          <h1 className="auth-hero-title">Tap. Pay. Done.</h1>
          <p className="auth-hero-subtitle">
            The contactless payments platform connecting customers, institutions 
            in real-time wallet system.
          </p>
        </div>
        <ul className="auth-hero-features">
          <li><span className="icon">⚡</span> Instant NFC tap-to-pay at any counter</li>
          <li><span className="icon">🔒</span> Bank-grade security on every transaction</li>
          <li><span className="icon">📊</span> Real-time balances and activity for institutions</li>
        </ul>

        <TapCardArt />
      </div>

      <div className="auth-form-side">
        <div className="page">
          <div className="card">
            <div className="auth-brand"><Logo size={38} /></div>
            <span className="auth-welcome-eyebrow">Welcome back</span>
            <h2 className="auth-welcome-title">Sign in to your account</h2>
            <p className="auth-welcome-sub">Enter your details to access your wallet.</p>
            {error && <div className="error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field-icon">
                <input
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
                <UserIcon />
              </div>
              <div className="field-icon">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <LockIcon />
              </div>
              <div className="auth-row-between">
                <label className="auth-remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember me
                </label>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
              <button type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <div className="auth-trust-strip">
            </div>
          </div>
          <Footer compact />
        </div>
      </div>
    </div>
  );
}
