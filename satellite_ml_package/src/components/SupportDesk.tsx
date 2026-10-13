// src/components/SupportDesk.tsx
import React, { useState } from 'react';
import { IconSupport, IconClose } from './Icons';

export const SupportDesk: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [incidentText, setIncidentText] = useState<string>('');
  const [logStatus, setLogStatus] = useState<string | null>(null);

  const handleLogIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentText.trim()) return;
    setLogStatus('Entry registered to flight director mission journal.');
    setIncidentText('');
    setTimeout(() => setLogStatus(null), 3000);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mission-support-btn"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '4.5rem',
          zIndex: 890,
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-strong)',
          color: 'var(--text-primary)',
          borderRadius: '2px',
          padding: '0.45rem 0.85rem',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
        }}
      >
        <IconSupport size={14} color="var(--accent-primary)" />
        <span>OPS DESK</span>
      </button>

      {/* Slide-up Drawer */}
      {isOpen && (
        <div
          className="mission-support-drawer"
          style={{
            position: 'fixed',
            bottom: '4.25rem',
            right: '1.5rem',
            width: '360px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: '2px',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.85)',
            zIndex: 900,
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="live-beacon" />
              <h4 style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                FLIGHT DYNAMICS OPERATIONS DESK
              </h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
            >
              <IconClose size={14} />
            </button>
          </div>

          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>STATION: </span>
              <span>ESOC Darmstadt / Space Debris Office</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>TRACKING: </span>
              <span>ESTRACK Radar + 18th Space Defense Squadron</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>ON-DUTY FDO: </span>
              <span style={{ color: '#10b981' }}>NOMINAL / STANDBY</span>
            </div>
          </div>

          <form onSubmit={handleLogIncident} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>LOG OPERATOR TELEMETRY ANOMALY:</label>
            <textarea
              rows={2}
              value={incidentText}
              onChange={(e) => setIncidentText(e.target.value)}
              placeholder="e.g. Verified tracking vector divergence on Event 1042..."
              style={{
                background: '#0a0d14',
                border: '1px solid var(--border-subtle)',
                borderRadius: '2px',
                color: 'var(--text-primary)',
                padding: '0.45rem',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                resize: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '0.45rem',
                background: 'var(--accent-primary)',
                color: '#000',
                border: 'none',
                borderRadius: '2px',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              RECORD FLIGHT LOG
            </button>
          </form>

          {logStatus && (
            <div style={{ marginTop: '0.65rem', padding: '0.45rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
              [LOGGED] {logStatus}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default SupportDesk;
