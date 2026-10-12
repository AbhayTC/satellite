// src/components/ModelPerformance.tsx
import React, { useEffect, useState } from 'react';
import { fetchMetrics, fetchPolicy } from '../api';

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
    return <div style={{ color: 'var(--text-muted)' }}>Loading model performance benchmarks...</div>;
  }

  const models = metrics?.models || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>ML Model Performance & Policy Benchmarks</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Comparative evaluation across ESA challenge test set ({metrics?.events?.toLocaleString() ?? '11,942'} events, {metrics?.positives ?? '323'} high-risk positives).
        </p>
      </div>

      {/* Model Benchmark Table */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid #21262d', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #21262d' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Model Comparison Metrics</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#0d1117', color: 'var(--text-muted)', borderBottom: '1px solid #21262d' }}>
              <th style={{ padding: '0.75rem 1rem' }}>MODEL</th>
              <th style={{ padding: '0.75rem 1rem' }}>ROC AUC</th>
              <th style={{ padding: '0.75rem 1rem' }}>PR AUC</th>
              <th style={{ padding: '0.75rem 1rem' }}>F1 SCORE</th>
              <th style={{ padding: '0.75rem 1rem' }}>PRECISION</th>
              <th style={{ padding: '0.75rem 1rem' }}>RECALL</th>
              <th style={{ padding: '0.75rem 1rem' }}>ACCURACY</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(models).map(([name, m]: [string, any]) => (
              <tr key={name} style={{ borderBottom: '1px solid #161b22' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: name.includes('LightGBM') || name.includes('Lite') ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                  {name}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-number)' }}>
                  {m.roc_auc?.toFixed(4)}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-number)' }}>
                  {m.pr_auc?.toFixed(4)}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-number)' }}>
                  {m.f1?.toFixed(4)}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-number)' }}>
                  {(m.precision * 100).toFixed(1)}%
                </td>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-number)' }}>
                  {(m.recall * 100).toFixed(1)}%
                </td>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-number)' }}>
                  {(m.accuracy * 100).toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Decision Policy & Thresholds */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '6px', border: '1px solid #21262d' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-amber)', marginBottom: '0.75rem' }}>Full Model Operating Policy</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #161b22' }}>
              <span style={{ color: 'var(--text-muted)' }}>Review Threshold (MEDIUM):</span>
              <span style={{ fontFamily: 'var(--font-number)' }}>{policy?.full?.threshold_review?.toFixed(4) ?? '0.1174'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #161b22' }}>
              <span style={{ color: 'var(--text-muted)' }}>Maneuver Threshold (HIGH):</span>
              <span style={{ fontFamily: 'var(--font-number)' }}>{policy?.full?.threshold_maneuver?.toFixed(4) ?? '0.6335'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Maneuver Flagged Share:</span>
              <span style={{ fontFamily: 'var(--font-number)' }}>2.9% of all events</span>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '6px', border: '1px solid #21262d' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.75rem' }}>Lite Model (5-Feature) Operating Policy</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #161b22' }}>
              <span style={{ color: 'var(--text-muted)' }}>Review Threshold (MEDIUM):</span>
              <span style={{ fontFamily: 'var(--font-number)' }}>{policy?.lite?.threshold_review?.toFixed(4) ?? '0.2003'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #161b22' }}>
              <span style={{ color: 'var(--text-muted)' }}>Maneuver Threshold (HIGH):</span>
              <span style={{ fontFamily: 'var(--font-number)' }}>{policy?.lite?.threshold_maneuver?.toFixed(4) ?? '0.6575'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Target Recall:</span>
              <span style={{ fontFamily: 'var(--font-number)' }}>90.1%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Static Analysis Figures */}
      <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '6px', border: '1px solid #21262d' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Pre-computed Model Visualizations</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Visual artifacts served directly from backend static storage (`/figs/*`):
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {['fig1_model_comparison.png', 'fig2_operating_points.png', 'fig3_confusion_matrix.png', 'fig4_risk_paths.png'].map((fig) => (
            <div key={fig} style={{ background: '#0d1117', padding: '0.5rem', borderRadius: '4px', border: '1px solid #21262d' }}>
              <img
                src={`/figs/${fig}`}
                alt={fig}
                style={{ width: '100%', height: 'auto', borderRadius: '4px', display: 'block' }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.4rem' }}>
                {fig.replace(/_/g, ' ').replace('.png', '').toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModelPerformance;
