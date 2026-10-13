// src/components/CookieBanner.tsx
import React, { useState, useEffect } from 'react';
import { IconDatabase } from './Icons';

export const CookieBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState<boolean>(true);

  useEffect(() => {
    const isAck = localStorage.getItem('esa_local_storage_ack');
    if (!isAck) {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('esa_local_storage_ack', 'true');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      className="cookie-banner"
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '1rem',
        right: '1rem',
        maxWidth: '560px',
        margin: '0 auto',
        background: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: '2px',
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        zIndex: 9000,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <IconDatabase size={16} color="var(--accent-primary)" />
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          <strong style={{ color: 'var(--text-primary)' }}>LOCAL TELEMETRY CACHE:</strong> Console session state and stream parameters are cached in your browser. No tracking cookies are stored.
        </div>
      </div>
      <button
        onClick={handleDismiss}
        style={{
          padding: '0.35rem 0.75rem',
          fontSize: '0.72rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          background: 'var(--accent-primary)',
          color: '#000',
          border: 'none',
          borderRadius: '2px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        ACKNOWLEDGE
      </button>
    </div>
  );
};

export default CookieBanner;
