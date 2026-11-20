import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/goml_logo.png';
import logoWhite from '../assets/goml_logo_white.png';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      // AuthContext updates and App re-renders
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lg2">
      <span className="lg2-blob a" aria-hidden="true" />
      <span className="lg2-blob b" aria-hidden="true" />

      <main className="lg2-wrap">
        <div className="lg2-card">
          <div className="lg2-brand">
            <img className="lg2-logo light" src={logo} alt="goML" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <img className="lg2-logo dark" src={logoWhite} alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>

          <h1>Welcome back</h1>
          <p className="lg2-sub">Sign in to continue to Alchemist.</p>

          {error && <div role="alert" className="lg2-error">{error}</div>}

          <form onSubmit={handleSubmit} noValidate={false}>
            <label className="lg2-field">
              <span>Work email</span>
              <div className="lg2-input">
                <Mail size={17} aria-hidden="true" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="username" placeholder="name@goml.io" />
              </div>
            </label>

            <label className="lg2-field">
              <span>Password</span>
              <div className="lg2-input">
                <Lock size={17} aria-hidden="true" />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Enter your password" />
                <button type="button" className="lg2-eye" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <button type="submit" className="lg2-btn" disabled={loading}>
              {loading ? (<><Loader2 size={17} className="lg2-spin" /> Signing in…</>) : (<>Sign in <ArrowRight size={17} /></>)}
            </button>
          </form>

          <p className="lg2-help">Trouble signing in? Contact your goML administrator.</p>
        </div>
      </main>

      <style>{`
        .lg2 { --bg: #FBF7F2; --card: #FFFFFF; --ink: #1F1B17; --muted: #6E6862; --line: #E8E2DA; --field: #FFFFFF; --glow: rgba(242,140,40,.20);
          position: relative; min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; overflow: hidden; background: var(--bg); color: var(--ink);
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }
        .lg2-blob { position: absolute; border-radius: 50%; pointer-events: none; filter: blur(10px); }
        .lg2-blob.a { width: 560px; height: 560px; right: -160px; top: -200px; background: radial-gradient(circle, var(--glow), transparent 66%); }
        .lg2-blob.b { width: 520px; height: 520px; left: -200px; bottom: -220px; background: radial-gradient(circle, rgba(242,140,40,.12), transparent 66%); }
        .lg2-wrap { position: relative; width: 100%; padding: 24px 16px; display: grid; place-items: center; }
        .lg2-card { width: min(420px, 100%); box-sizing: border-box; background: var(--card); border-radius: 28px; padding: 40px 36px 30px;
          box-shadow: 0 1px 2px rgba(31,27,23,.05), 0 24px 60px rgba(31,27,23,.10); animation: lg2-in .4s ease both; }
        .lg2-brand { display: flex; justify-content: center; margin-bottom: 26px; }
        .lg2-logo { height: 34px; display: block; }
        .lg2-logo.dark { display: none; transform: translateX(18px); } /* the white logo asset has blank space on its right */
        .lg2 h1 { margin: 0; text-align: center; font-size: 27px; font-weight: 800; letter-spacing: -.03em; }
        .lg2-sub { margin: 8px 0 26px; text-align: center; font-size: 14.5px; color: var(--muted); }
        .lg2-error { margin-bottom: 18px; padding: 11px 14px; border-radius: 12px; font-size: 13.5px; background: #FFF1E6; color: #B4501A; }
        .lg2-field { display: block; margin-bottom: 16px; }
        .lg2-field > span { display: block; margin-bottom: 7px; font-size: 13px; font-weight: 600; }
        .lg2-input { position: relative; }
        .lg2-input > svg { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
        .lg2-input input { width: 100%; box-sizing: border-box; height: 48px; margin: 0; padding: 0 44px 0 44px; font: inherit; font-size: 14.5px; color: var(--ink);
          background: var(--field); border: 1px solid var(--line); border-radius: 14px; outline: none; transition: border-color .15s, box-shadow .15s; }
        .lg2-input input::placeholder { color: color-mix(in srgb, var(--muted) 75%, transparent); }
        .lg2-input input:focus { border-color: #F28C28; box-shadow: 0 0 0 4px rgba(242,140,40,.16); }
        .lg2-eye { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 36px; height: 36px; border: 0; border-radius: 10px; background: transparent; color: var(--muted); cursor: pointer; display: grid; place-items: center; padding: 0; }
        .lg2-eye:hover { background: color-mix(in srgb, var(--ink) 7%, transparent); color: var(--ink); }
        .lg2-btn { width: 100%; height: 50px; margin-top: 8px; border: 0; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          background: linear-gradient(135deg, #F7992F, #EA7A1E); color: #fff; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer;
          box-shadow: 0 8px 22px rgba(237,125,49,.35); transition: transform .12s, box-shadow .12s, filter .12s; }
        .lg2-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 28px rgba(237,125,49,.42); filter: brightness(1.04); }
        .lg2-btn:active:not(:disabled) { transform: translateY(0); }
        .lg2-btn:disabled { opacity: .7; cursor: not-allowed; }
        .lg2-spin { animation: lg2-spin 1s linear infinite; }
        .lg2-help { margin: 22px 0 0; text-align: center; font-size: 12.5px; color: var(--muted); }
        @keyframes lg2-spin { to { transform: rotate(360deg); } }
        @keyframes lg2-in { from { opacity: 0; transform: translateY(10px); } }

        /* dark theme */
        :root[data-theme="dark"] .lg2 { --bg: #14110F; --card: #1D1916; --ink: #F4EEE8; --muted: #A89F96; --line: #34302C; --field: #14110F; --glow: rgba(242,140,40,.16); }
        :root[data-theme="dark"] .lg2-logo.light { display: none; } :root[data-theme="dark"] .lg2-logo.dark { display: block; }
        :root[data-theme="dark"] .lg2-card { box-shadow: 0 0 0 1px rgba(255,255,255,.05), 0 24px 60px rgba(0,0,0,.45); }
        :root[data-theme="dark"] .lg2-error { background: rgba(242,140,40,.14); color: #FFB067; }
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) .lg2 { --bg: #14110F; --card: #1D1916; --ink: #F4EEE8; --muted: #A89F96; --line: #34302C; --field: #14110F; --glow: rgba(242,140,40,.16); }
          :root:not([data-theme="light"]) .lg2-logo.light { display: none; } :root:not([data-theme="light"]) .lg2-logo.dark { display: block; }
          :root:not([data-theme="light"]) .lg2-card { box-shadow: 0 0 0 1px rgba(255,255,255,.05), 0 24px 60px rgba(0,0,0,.45); }
          :root:not([data-theme="light"]) .lg2-error { background: rgba(242,140,40,.14); color: #FFB067; }
        }
        @media (max-width: 480px) { .lg2-card { padding: 32px 22px 24px; border-radius: 24px; } .lg2 h1 { font-size: 24px; } }
        @media (prefers-reduced-motion: reduce) { .lg2-card, .lg2-spin { animation: none; } }
      `}</style>
    </div>
  );
};

export default LoginPage;
