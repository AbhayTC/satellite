// src/components/RiskCalculator.tsx
import React, { useEffect, useState } from 'react';
import { predictRisk, fetchPredictPresets, fetchPredictInfo } from '../api';
import type { CdmInputRow, PredictResult } from '../types';

const defaultRow: CdmInputRow = {
  time_to_tca: 5.0,
  risk: -5.5,
  miss_distance: 10000.0,
  relative_speed: 8000.0,
  mahalanobis_distance: 100.0,
};

const RiskCalculator: React.FC = () => {
  const [rows, setRows] = useState<CdmInputRow[]>([defaultRow]);
  const [presets, setPresets] = useState<Record<string, CdmInputRow[]>>({});
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [result, setResult] = useState<PredictResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<any>(null);

  useEffect(() => {
    fetchPredictPresets()
      .then((data) => setPresets(data || {}))
      .catch(() => {});
    fetchPredictInfo()
      .then((data) => setModelInfo(data))
      .catch(() => {});
  }, []);

  const handleSelectPreset = (name: string) => {
    setSelectedPreset(name);
    if (presets[name]) {
      setRows(presets[name]);
      setResult(null);
      setError(null);
    }
  };

  const handleRowChange = (index: number, field: keyof CdmInputRow, val: any) => {
    const next = [...rows];
    next[index] = { ...next[index], [field]: val === '' ? null : Number(val) };
    setRows(next);
  };

  const addRow = () => {
    if (rows.length < 10) {
      setRows([...rows, { ...defaultRow, time_to_tca: Math.max(0.1, rows[rows.length - 1].time_to_tca - 0.5) }]);
    }
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await predictRisk({ history: rows });
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to compute risk prediction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Live Risk Calculator</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Evaluate custom CDM sequences using the backend's LightGBM risk classifier and operational thresholds.
        </p>
      </div>

      {/* Preset selector bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-surface)', padding: '1rem', borderRadius: '6px', border: '1px solid #21262d' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Load Preset Scenario:</span>
        <select
          value={selectedPreset}
          onChange={(e) => handleSelectPreset(e.target.value)}
          style={{
            background: '#0d1117',
            border: '1px solid #30363d',
            color: 'var(--text-primary)',
            padding: '0.4rem 0.8rem',
            borderRadius: '4px',
            fontSize: '0.85rem'
          }}
        >
          <option value="">-- Choose Preset --</option>
          {Object.keys(presets).map((k) => (
            <option key={k} value={k}>{k.replace(/_/g, ' ').toUpperCase()}</option>
          ))}
        </select>
        {modelInfo && (
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Cutoff: <strong>{modelInfo.tca_cutoff_days} days</strong> | Maneuver Threshold: <strong>{modelInfo.threshold_maneuver}</strong>
          </span>
        )}
      </div>

      {/* CDM Input Table */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid #21262d', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>CDM Sequence ({rows.length}/10 rows)</h3>
          <button
            onClick={addRow}
            disabled={rows.length >= 10}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '4px',
              border: '1px solid #30363d',
              background: '#21262d',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              cursor: rows.length >= 10 ? 'not-allowed' : 'pointer'
            }}
          >
            + Add CDM Row
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#0d1117', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '0.6rem' }}>#</th>
                <th style={{ padding: '0.6rem' }}>Days to TCA (&gt; 0)</th>
                <th style={{ padding: '0.6rem' }}>log10(Pc) [-30, 0]</th>
                <th style={{ padding: '0.6rem' }}>Miss Dist (m)</th>
                <th style={{ padding: '0.6rem' }}>Rel Speed (m/s)</th>
                <th style={{ padding: '0.6rem' }}>Mahalanobis Dist</th>
                <th style={{ padding: '0.6rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #161b22' }}>
                  <td style={{ padding: '0.6rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td style={{ padding: '0.6rem' }}>
                    <input
                      type="number"
                      step="0.1"
                      value={row.time_to_tca ?? ''}
                      onChange={(e) => handleRowChange(idx, 'time_to_tca', e.target.value)}
                      style={{ width: '100px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', padding: '0.3rem', borderRadius: '4px' }}
                    />
                  </td>
                  <td style={{ padding: '0.6rem' }}>
                    <input
                      type="number"
                      step="0.1"
                      value={row.risk ?? ''}
                      onChange={(e) => handleRowChange(idx, 'risk', e.target.value)}
                      style={{ width: '100px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', padding: '0.3rem', borderRadius: '4px' }}
                    />
                  </td>
                  <td style={{ padding: '0.6rem' }}>
                    <input
                      type="number"
                      step="100"
                      value={row.miss_distance ?? ''}
                      onChange={(e) => handleRowChange(idx, 'miss_distance', e.target.value)}
                      style={{ width: '120px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', padding: '0.3rem', borderRadius: '4px' }}
                    />
                  </td>
                  <td style={{ padding: '0.6rem' }}>
                    <input
                      type="number"
                      step="100"
                      value={row.relative_speed ?? ''}
                      onChange={(e) => handleRowChange(idx, 'relative_speed', e.target.value)}
                      style={{ width: '120px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', padding: '0.3rem', borderRadius: '4px' }}
                    />
                  </td>
                  <td style={{ padding: '0.6rem' }}>
                    <input
                      type="number"
                      step="1"
                      value={row.mahalanobis_distance ?? ''}
                      onChange={(e) => handleRowChange(idx, 'mahalanobis_distance', e.target.value)}
                      style={{ width: '110px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', padding: '0.3rem', borderRadius: '4px' }}
                    />
                  </td>
                  <td style={{ padding: '0.6rem' }}>
                    <button
                      onClick={() => removeRow(idx)}
                      disabled={rows.length <= 1}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: rows.length <= 1 ? '#4b5563' : '#ef4444',
                        cursor: rows.length <= 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={handleCalculate}
            disabled={loading}
            style={{
              padding: '0.6rem 1.5rem',
              borderRadius: '4px',
              border: 'none',
              background: 'var(--accent-amber)',
              color: '#000',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Evaluating Model...' : 'Calculate Risk Score'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ padding: '1rem', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div style={{ background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid #21262d', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>Prediction Results</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#0d1117', padding: '1rem', borderRadius: '4px', border: '1px solid #21262d' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RISK SCORE</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-amber)', fontFamily: 'var(--font-number)' }}>
                {result.risk_score !== null ? result.risk_score.toFixed(4) : 'UNSCORED'}
              </div>
            </div>
            <div style={{ background: '#0d1117', padding: '1rem', borderRadius: '4px', border: '1px solid #21262d' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RISK LEVEL</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: result.risk_level === 'HIGH' ? '#f87171' : result.risk_level === 'MEDIUM' ? '#fbbf24' : '#4ade80' }}>
                {result.risk_level ?? '—'}
              </div>
            </div>
            <div style={{ background: '#0d1117', padding: '1rem', borderRadius: '4px', border: '1px solid #21262d' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RECOMMENDED ACTION</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: result.decision_if_final === 'MANEUVER' ? '#dc2626' : '#94a3b8' }}>
                {result.decision_if_final ?? '—'}
              </div>
            </div>
            <div style={{ background: '#0d1117', padding: '1rem', borderRadius: '4px', border: '1px solid #21262d' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CDMS EVALUATED</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e2e8f0', fontFamily: 'var(--font-number)' }}>
                {result.n_cdm_used ?? rows.length}
              </div>
            </div>
          </div>

          {/* Top Drivers */}
          {result.top_drivers && result.top_drivers.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Feature Contributions (Top Drivers):</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {result.top_drivers.map((driver, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#0d1117', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <span style={{ color: '#93c5fd', fontFamily: 'var(--font-number)' }}>{driver.feature}</span>
                    <span style={{ color: 'var(--text-muted)' }}>Value: {driver.value}</span>
                    <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>Contrib: {driver.contribution.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RiskCalculator;
