import React from 'react';

/** Full-page loading screen shown while the session is being checked. */
export default function SplashScreen({ message = 'Getting your workspace ready' }) {
  return (
    <div className="splash" role="status" aria-live="polite">
      <div className="splash-glow" aria-hidden="true" />
      <div className="splash-card">
        <div className="splash-logo">
          <span className="splash-ring" aria-hidden="true" />
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M16 3 3 26h26z" fill="#F7B267" />
            <path d="M16 9.5 8 24h16z" fill="#F28C28" />
            <path d="M16 15.5 12 23h8z" fill="#E0761A" />
          </svg>
        </div>
        <div className="splash-name">Go Alchemists</div>
        <div className="splash-msg">
          {message}
          <span className="splash-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>
        </div>
        <div className="splash-bar" aria-hidden="true"><i /></div>
      </div>
    </div>
  );
}
