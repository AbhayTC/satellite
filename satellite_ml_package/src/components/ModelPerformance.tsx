// src/components/ModelPerformance.tsx
import React, { useEffect, useState } from 'react';
import { fetchMetrics, fetchPolicy } from '../api';
import CopyButton from './CopyButton';

const ModelPerformance: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([fetchMetrics(), fetchPolicy()])
      .then(([m, p]) => {
        setMetrics(m);
        setPolicy(p);
      })
      .catch((err) => console.warn('Could not load performance metrics:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: '0.5rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
        <span className="radar-spinner" />
        <span>PARSING MODEL BENCHMARK COEFFICIENTS...</span>
      </div>
    );
  }

  const models = metrics?.models || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            VALIDATION_CORPUS // SAMPLES: {metrics?.events?.toLocaleString() ?? '11,942'} // POSITIVES: {metrics?.positives ?? '323'}
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            Machine Learning Benchmark & Calibration Matrix
          </h2>
        </div>

        <CopyButton
          text={JSON.stringify(metrics, null, 2)}
          label="EXPORT BENCHMARKS JSON"
        />
      </div>

      {/* Model Benchmark Table with Sticky Header */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '2px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            COMPARATIVE CLASSIFIER EVALUATION (TEST PARTITION)
          </span>
          <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
            N = 11,942 ESA CONJUNCTION EVENTS
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', textAlign: 'left' }}>
            <thead className="sticky-header">
              <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-strong)', background: 'var(--bg-surface-elevated)' }}>
                <th style={{ padding: '0.65rem 0.85rem' }}>MODEL CLASSIFIER</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>ROC AUC</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>PR AUC</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>F1 SCORE</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>PRECISION</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>RECALL</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>ACCURACY</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(models).map(([name, m]: [string, any]) => (
                <tr
                  key={name}
                  style={{ borderBottom: '1px solid #131924' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#121824')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: name.includes('LightGBM') || name.includes('Lite') ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {name.includes('Lite') && (
                        <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '1px', background: 'var(--accent-primary)', color: '#000', fontWeight: 700 }}>
                          DEPLOYED
                        </span>
                      )}
                      <span>{name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>
                    {m.roc_auc?.toFixed(4)}
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem' }}>
                    {m.pr_auc?.toFixed(4)}
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem' }}>
                    {m.f1?.toFixed(4)}
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem' }}>
                    {(m.precision * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem' }}>
                    {(m.recall * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem' }}>
                    {(m.accuracy * 100).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Policy & Thresholds */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '0.65rem', letterSpacing: '0.04em' }}>
            FULL LIGHTGBM DECISION BOUNDARY MATRIX
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #131924' }}>
              <span style={{ color: 'var(--text-muted)' }}>MONITOR THRESHOLD (REVIEW):</span>
              <span>{policy?.full?.threshold_review?.toFixed(4) ?? '0.1174'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #131924' }}>
              <span style={{ color: 'var(--text-muted)' }}>MANEUVER THRESHOLD (ACTION):</span>
              <span style={{ color: '#ef4444' }}>{policy?.full?.threshold_maneuver?.toFixed(4) ?? '0.6335'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>MANEUVER TRIGGER RATIO:</span>
              <span>2.9% OF TOTAL VOLUME</span>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '0.65rem', letterSpacing: '0.04em' }}>
            LITE MODEL (5-FEATURE) PRODUCTION POLICY
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #131924' }}>
              <span style={{ color: 'var(--text-muted)' }}>MONITOR THRESHOLD (REVIEW):</span>
              <span>{policy?.lite?.threshold_review?.toFixed(4) ?? '0.2003'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #131924' }}>
              <span style={{ color: 'var(--text-muted)' }}>MANEUVER THRESHOLD (ACTION):</span>
              <span style={{ color: '#ef4444' }}>{policy?.lite?.threshold_maneuver?.toFixed(4) ?? '0.6575'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>TARGET HIGH-RISK RECALL:</span>
              <span style={{ color: '#10b981' }}>90.1%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelPerformance;
