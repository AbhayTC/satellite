// src/components/FaqModal.tsx
import React, { useState } from 'react';
import { IconBook, IconClose } from './Icons';

interface FaqItem {
  id: string;
  q: string;
  a: string;
}

const FAQ_DATA: FaqItem[] = [
  {
    id: 'CDM-01',
    q: 'What is a Conjunction Data Message (CDM)?',
    a: 'A Conjunction Data Message (CCSDS 508.0-B-1 standard) is an orbital tracking message issued by space surveillance networks (such as ESA or US Space Command) conveying state vectors, covariance error ellipsoids, and miss distance at Time to Closest Approach (TCA).',
  },
  {
    id: 'CDM-02',
    q: 'Why do initial radar passes exhibit a >97% false alarm rate?',
    a: 'Observations taken 5–7 days before TCA possess substantial covariance uncertainty along the velocity vector. As additional radar tracks accumulate, the covariance matrix shrinks, and the vast majority of conjunction vectors diverge away from dangerous collision thresholds without propulsion burns.',
  },
  {
    id: 'CDM-03',
    q: 'What is the distinction between Mahalanobis Distance and Euclidean Miss Distance?',
    a: 'Euclidean miss distance is simple Cartesian separation in meters. Mahalanobis distance scales physical separation by the combined covariance uncertainty of both objects. A 250m miss distance with tightly constrained covariance may be safer than a 700m miss distance within a massive uncertainty ellipsoid.',
  },
  {
    id: 'POL-01',
    q: 'How are operational thresholds (NO_ACTION, MONITOR, MANEUVER) determined?',
    a: 'Decision boundaries are calibrated against historical false-alarm tradeoffs: Risk Score < 0.2003 = NO_ACTION (nominal flight); 0.2003 to 0.6575 = MONITOR (heightened tracking readiness); >= 0.6575 = MANEUVER (burn vector computation). Conjunctions >48h out are throttled to MONITOR to avoid premature fuel expenditure.',
  },
  {
    id: 'ML-01',
    q: 'How does the LightGBM model exploit time-series radar updates?',
    a: 'The gradient-boosted decision tree pipeline extracts temporal derivatives: risk rate of change (slopes over 3 and 5 updates), span duration, and covariance trend rates. This provides 0.98+ ROC AUC test accuracy days ahead of closest approach.',
  },
  {
    id: 'ORB-01',
    q: 'What is Kessler Syndrome in Low Earth Orbit (LEO)?',
    a: 'A cascading scenario where orbital debris density reaches critical mass: a single high-velocity impact fragments into thousands of lethal pieces, triggering secondary collisions that can render orbital regimes unusable for decades.',
  },
];

interface FaqModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FaqModal: React.FC<FaqModalProps> = ({ isOpen, onClose }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: '2px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <IconBook size={16} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
              FLIGHT DYNAMICS & ML DECISION REFERENCE MANUAL
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
          >
            <IconClose size={14} />
          </button>
        </div>

        <div style={{ padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {FAQ_DATA.map((item, idx) => {
            const isExpanded = openIdx === idx;
            return (
              <div
                key={item.id}
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '2px',
                  background: isExpanded ? '#0c1018' : '#080b11',
                  borderColor: isExpanded ? 'var(--border-strong)' : 'var(--border-subtle)',
                }}
              >
                <button
                  onClick={() => setOpenIdx(isExpanded ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    color: isExpanded ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>[{item.id}]</span>
                    <span>{item.q}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {isExpanded ? '[-]' : '[+]'}
                  </span>
                </button>
                {isExpanded && (
                  <div style={{ padding: '0 1rem 0.85rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.6' }}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FaqModal;
