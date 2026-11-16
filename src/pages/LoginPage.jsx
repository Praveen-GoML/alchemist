import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, ClipboardCheck, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/goml_logo.png';
import logoWhite from '../assets/goml_logo_white.png';

const FEATURES = [
  { icon: ClipboardCheck, title: 'Pre-requisite tracking', text: 'Know exactly what is blocking kick-off, and who owns it.' },
  { icon: Sparkles, title: 'AI-assisted analysis', text: 'Turn a SOW into requirements, risks and a delivery checklist.' },
  { icon: ShieldCheck, title: 'Secure client handover', text: 'Clients share credentials and evidence through an encrypted portal.' },
];

const inputWrap = { position: 'relative' };
const inputStyle = {
  width: '100%', boxSizing: 'border-box', margin: 0, padding: '11px 40px 11px 40px', fontSize: 14, fontFamily: 'inherit',
  border: '1px solid #E6E1DB', borderRadius: 10, background: '#FFFFFF', color: '#1F1B17', outline: 'none',
  transition: 'border-color .15s ease, box-shadow .15s ease',
};
const focusOn = (e) => { e.target.style.borderColor = '#F28C28'; e.target.style.boxShadow = '0 0 0 3px rgba(242,140,40,.15)'; };
const focusOff = (e) => { e.target.style.borderColor = '#E6E1DB'; e.target.style.boxShadow = 'none'; };

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
    <div className="lg-root" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)', background: '#FAF8F5', fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
      {/* Brand panel */}
      <aside className="lg-brand" style={{
        position: 'relative', overflow: 'hidden', padding: '48px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        color: '#fff', background: 'linear-gradient(155deg, #2A211A 0%, #1F1B17 55%, #3A2410 100%)',
      }}>
        <div aria-hidden style={{ position: 'absolute', width: 520, height: 520, right: -180, top: -160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(242,140,40,.35), rgba(242,140,40,0) 70%)' }} />
        <div aria-hidden style={{ position: 'absolute', width: 420, height: 420, left: -160, bottom: -170, borderRadius: '50%', background: 'radial-gradient(circle, rgba(242,140,40,.18), rgba(242,140,40,0) 70%)' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={logoWhite} alt="goML" style={{ height: 30, display: 'block' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', padding: '3px 8px', borderRadius: 6, background: '#F28C28', color: '#fff' }}>ALCHEMIST</span>
        </div>

        <div style={{ position: 'relative', maxWidth: 520 }}>
          <h2 style={{ margin: 0, fontSize: 36, lineHeight: 1.15, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
            From signed SOW to a clear, unblocked kick-off.
          </h2>
          <p style={{ margin: '14px 0 32px', fontSize: 15.5, lineHeight: 1.6, color: 'rgba(255,255,255,.72)' }}>
            Alchemist keeps every pre-requisite, credential and client dependency in one place so delivery starts on day one.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(242,140,40,.16)', border: '1px solid rgba(242,140,40,.35)', color: '#F8A850' }}>
                  <Icon size={18} />
                </span>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 650 }}>{title}</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'rgba(255,255,255,.65)', marginTop: 2 }}>{text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', fontSize: 12.5, color: 'rgba(255,255,255,.5)' }}>goML &middot; Internal tooling</div>
      </aside>

      {/* Form panel */}
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
        <div style={{ width: '100%', maxWidth: 410 }}>
          <img className="lg-mobile-logo" src={logo} alt="goML" style={{ height: 28, marginBottom: 28, display: 'none' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: '#1F1B17' }}>Welcome back</h1>
          <p style={{ margin: '8px 0 26px', fontSize: 14.5, color: '#6E6862' }}>Sign in to your Alchemist account.</p>

          {error && (
            <div role="alert" style={{ background: '#FEF2F2', color: '#B42318', padding: '11px 13px', borderRadius: 10, marginBottom: 18, fontSize: 13.5, border: '1px solid #FECACA' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#1F1B17' }}>Work email</span>
              <div style={inputWrap}>
                <Mail size={16} style={{ position: 'absolute', left: 13, top: 13, color: '#9A928A' }} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="username"
                  placeholder="name@goml.io" style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
              </div>
            </label>

            <label style={{ display: 'block', marginBottom: 22 }}>
              <span style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#1F1B17' }}>Password</span>
              <div style={inputWrap}>
                <Lock size={16} style={{ position: 'absolute', left: 13, top: 13, color: '#9A928A' }} />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
                  placeholder="Enter your password" style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
                <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: 6, top: 5, background: 'transparent', border: 0, padding: 7, cursor: 'pointer', color: '#9A928A', display: 'inline-flex', borderRadius: 8 }}>
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: loading ? '#C9A27A' : '#F28C28', color: '#fff', border: 0, borderRadius: 10, fontWeight: 650, fontSize: 14.5,
                fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background .15s ease, transform .05s ease',
                boxShadow: '0 1px 2px rgba(224,118,26,.35)',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#E0761A'; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#F28C28'; }}
            >
              {loading ? (<><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in...</>) : (<>Sign in <ArrowRight size={16} /></>)}
            </button>
          </form>

          <p style={{ marginTop: 26, textAlign: 'center', fontSize: 12.5, color: '#9A928A' }}>
            Trouble signing in? Contact your goML administrator.
          </p>
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .lg-root { grid-template-columns: 1fr !important; }
          .lg-brand { display: none !important; }
          .lg-mobile-logo { display: block !important; }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
