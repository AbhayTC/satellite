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
      {/* Docked Corner Tab (Never overlaps table rows or chart footers) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mission-support-btn print-hide"
        title="Flight Dynamics Operations Desk"
        style={{
          position: 'fixed',
          bottom: 0,
          right: '1.5rem',
          zIndex: 890,
          background: '#0a0a0a',
          border: '1px solid var(--border-default)',
          borderBottom: 'none',
          color: 'var(--text-secondary)',
          borderTopLeftRadius: '3px',
          borderTopRightRadius: '3px',
          padding: '0.35rem 0.75rem',
          fontSize: '0.72rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          cursor: 'pointer',
          boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.5)',
          transition: 'background 0.15s ease, border-color 0.15s ease',
        }}
      >
        <span className="live-beacon" style={{ width: '5px', height: '5px' }} />
        <span>OPS DESK</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{isOpen ? '▼' : '▲'}</span>
      </button>

      {/* Slide-up Operations Drawer */}
      {isOpen && (
        <div
          className="mission-support-drawer print-hide"
          data-lenis-prevent
          style={{
            position: 'fixed',
            bottom: '2.2rem',
            right: '1.5rem',
            width: '360px',
            background: '#0e0e0e',
            border: '1px solid var(--border-default)',
            borderRadius: '2px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.95)',
            zIndex: 900,
            padding: '1.15rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="live-beacon" />
              <h4 style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
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

          <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.85rem' }}>
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
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>LOG OPERATOR TELEMETRY ANOMALY:</label>
            <textarea
              rows={2}
              value={incidentText}
              onChange={(e) => setIncidentText(e.target.value)}
              placeholder="e.g. Verified tracking vector divergence on Event 1042..."
              style={{
                background: '#050505',
                border: '1px solid var(--border-subtle)',
                borderRadius: '2px',
                color: 'var(--text-primary)',
                padding: '0.45rem',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                resize: 'none',
              }}
            />
            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%' }}
            >
              RECORD FLIGHT LOG
            </button>
          </form>

          {logStatus && (
            <div style={{ marginTop: '0.5rem', padding: '0.4rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
              [LOGGED] {logStatus}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default SupportDesk;
