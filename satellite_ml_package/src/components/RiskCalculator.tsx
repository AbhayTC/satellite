// src/components/RiskCalculator.tsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { predictRisk, fetchPredictPresets, fetchPredictInfo } from '../api';
import type { CdmInputRow, PredictResult } from '../types';
import CopyButton from './CopyButton';
import { IconCalculator, IconAlert, IconCheck } from './Icons';

const defaultRow: CdmInputRow = {
  time_to_tca: 5.0,
  risk: -5.5,
  miss_distance: 10000.0,
  relative_speed: 8000.0,
  mahalanobis_distance: 100.0,
};

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

const RiskCalculator: React.FC = () => {
  const [rows, setRows] = useState<CdmInputRow[]>([defaultRow]);
  const [presets, setPresets] = useState<Record<string, CdmInputRow[]>>({});
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [result, setResult] = useState<PredictResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [, setModelInfo] = useState<any>(null);

  useEffect(() => {
    fetchPredictPresets()
      .then((data) => setPresets(data || {}))
      .catch(() => {});
    fetchPredictInfo()
      .then((data) => setModelInfo(data))
      .catch(() => {});
  }, []);

  const validateRows = (): ValidationError[] => {
    const errs: ValidationError[] = [];
    rows.forEach((r, idx) => {
      if (r.time_to_tca === null || r.time_to_tca === undefined || isNaN(r.time_to_tca)) {
        errs.push({ row: idx, field: 'time_to_tca', message: 'Time to TCA is required' });
      } else if (r.time_to_tca <= 0) {
        errs.push({ row: idx, field: 'time_to_tca', message: 'Time to TCA must be > 0.0 days' });
      }

      if (r.miss_distance !== null && r.miss_distance !== undefined && r.miss_distance < 0) {
        errs.push({ row: idx, field: 'miss_distance', message: 'Miss distance must be >= 0 m' });
      }

      if (r.relative_speed !== null && r.relative_speed !== undefined && r.relative_speed < 0) {
        errs.push({ row: idx, field: 'relative_speed', message: 'Relative speed must be >= 0 m/s' });
      }

      if (r.risk !== null && r.risk !== undefined && r.risk > 0) {
        errs.push({ row: idx, field: 'risk', message: 'Log10(Pc) must be <= 0.0' });
      }
    });
    return errs;
  };

  const handleSelectPreset = (name: string) => {
    setSelectedPreset(name);
    if (presets[name]) {
      setRows(presets[name]);
      setResult(null);
      setError(null);
      setValidationErrors([]);
      setSuccessNotice(`Loaded scenario preset: ${name.replace(/_/g, ' ').toUpperCase()}`);
      setTimeout(() => setSuccessNotice(null), 3000);
    }
  };

  const handleRowChange = (index: number, field: keyof CdmInputRow, val: any) => {
    const next = [...rows];
    next[index] = { ...next[index], [field]: val === '' ? null : Number(val) };
    setRows(next);
    setValidationErrors((prev) => prev.filter((e) => !(e.row === index && e.field === field)));
  };

  const addRow = () => {
    if (rows.length < 10) {
      setRows([...rows, { ...defaultRow, time_to_tca: Math.max(0.1, rows[rows.length - 1].time_to_tca - 0.5) }]);
      setValidationErrors([]);
    }
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
      setValidationErrors([]);
    }
  };

  const hasFieldError = (rowIdx: number, fieldName: string) => {
    return validationErrors.some((e) => e.row === rowIdx && e.field === fieldName);
  };

  const handleCalculate = async () => {
    const errs = validateRows();
    if (errs.length > 0) {
      setValidationErrors(errs);
      setError('Input parameter validation failed. Correct identified fields.');
      return;
    }

    setLoading(true);
    setError(null);
    setValidationErrors([]);
    setSuccessNotice(null);

    try {
      const res = await predictRisk({ history: rows });
      setResult(res);
      setSuccessNotice(`Model evaluation completed. Action recommendation: ${res.decision_if_final ?? 'EVALUATED'}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to compute risk prediction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1200px' }}>
      {/* Subsystem Header */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              SUBSYSTEM: FLIGHT_DYNAMICS // MODULE: CDM_RULE_ENGINE_CALCULATOR
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginTop: '0.2rem' }}>
              Conjunction Risk Prediction Evaluator
            </h2>
          </div>
          <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            CUTOFF: 2.0d | REVIEW &ge; 3 PTS | MANEUVER &ge; 6 PTS
          </div>
        </div>
      </div>

      {/* Preset Scenario Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', background: 'var(--bg-surface)', padding: '0.85rem 1.25rem', borderRadius: '2px', border: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontWeight: 600 }}>
          SELECT INCIDENT ARCHIVE:
        </span>
        <select
          value={selectedPreset}
          onChange={(e) => handleSelectPreset(e.target.value)}
          style={{
            background: '#040404',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            padding: '0.4rem 0.85rem',
            borderRadius: '2px',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease',
          }}
        >
          <option value="">-- ARCHIVED SCENARIOS --</option>
          {Object.keys(presets).map((k) => (
            <option key={k} value={k}>{k.replace(/_/g, ' ').toUpperCase()}</option>
          ))}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
          TRANSPARENT RULE ENGINE (12-POINT SCALE) + ML BENCHMARK
        </span>
      </div>

      {/* Input Vectors Table */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '2px', border: '1px solid var(--border-subtle)', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
            TIME-SERIES CDM TRACKS ({rows.length}/10 ENTRIES)
          </span>
          <button
            onClick={addRow}
            disabled={rows.length >= 10}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '2px',
              border: '1px solid var(--border-default)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-primary)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              cursor: rows.length >= 10 ? 'not-allowed' : 'pointer',
              opacity: rows.length >= 10 ? 0.4 : 1,
              transition: 'background 0.15s ease',
            }}
          >
            [+] APPEND RADAR STEP
          </button>
        </div>

        <div style={{ overflowX: 'auto' }} data-lenis-prevent>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr style={{ background: '#040404', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>STEP</th>
                <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>TIME TO TCA (DAYS)</th>
                <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>LOG10(Pc) [≤ 0]</th>
                <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>MISS DIST (M)</th>
                <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>REL SPEED (M/S)</th>
                <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>MAHALANOBIS DIST</th>
                <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const tcaErr = hasFieldError(idx, 'time_to_tca');
                const riskErr = hasFieldError(idx, 'risk');
                const distErr = hasFieldError(idx, 'miss_distance');
                const speedErr = hasFieldError(idx, 'relative_speed');

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      0{idx + 1}
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem' }}>
                      <input
                        type="number"
                        step="0.1"
                        value={row.time_to_tca ?? ''}
                        onChange={(e) => handleRowChange(idx, 'time_to_tca', e.target.value)}
                        style={{
                          width: '110px',
                          background: '#040404',
                          border: `1px solid ${tcaErr ? 'var(--risk-high)' : 'var(--border-default)'}`,
                          color: '#ffffff',
                          padding: '0.35rem 0.55rem',
                          borderRadius: '2px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.78rem',
                        }}
                      />
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem' }}>
                      <input
                        type="number"
                        step="0.1"
                        value={row.risk ?? ''}
                        onChange={(e) => handleRowChange(idx, 'risk', e.target.value)}
                        style={{
                          width: '110px',
                          background: '#040404',
                          border: `1px solid ${riskErr ? 'var(--risk-high)' : 'var(--border-default)'}`,
                          color: '#ffffff',
                          padding: '0.35rem 0.55rem',
                          borderRadius: '2px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.78rem',
                        }}
                      />
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem' }}>
                      <input
                        type="number"
                        step="100"
                        value={row.miss_distance ?? ''}
                        onChange={(e) => handleRowChange(idx, 'miss_distance', e.target.value)}
                        style={{
                          width: '120px',
                          background: '#040404',
                          border: `1px solid ${distErr ? 'var(--risk-high)' : 'var(--border-default)'}`,
                          color: '#ffffff',
                          padding: '0.35rem 0.55rem',
                          borderRadius: '2px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.78rem',
                        }}
                      />
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem' }}>
                      <input
                        type="number"
                        step="100"
                        value={row.relative_speed ?? ''}
                        onChange={(e) => handleRowChange(idx, 'relative_speed', e.target.value)}
                        style={{
                          width: '120px',
                          background: '#040404',
                          border: `1px solid ${speedErr ? 'var(--risk-high)' : 'var(--border-default)'}`,
                          color: '#ffffff',
                          padding: '0.35rem 0.55rem',
                          borderRadius: '2px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.78rem',
                        }}
                      />
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem' }}>
                      <input
                        type="number"
                        step="1"
                        value={row.mahalanobis_distance ?? ''}
                        onChange={(e) => handleRowChange(idx, 'mahalanobis_distance', e.target.value)}
                        style={{
                          width: '115px',
                          background: '#040404',
                          border: '1px solid var(--border-default)',
                          color: '#ffffff',
                          padding: '0.35rem 0.55rem',
                          borderRadius: '2px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.78rem',
                        }}
                      />
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right' }}>
                      <button
                        onClick={() => removeRow(idx)}
                        disabled={rows.length <= 1}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: rows.length <= 1 ? 'rgba(255, 255, 255, 0.2)' : 'var(--risk-high)',
                          cursor: rows.length <= 1 ? 'not-allowed' : 'pointer',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                        }}
                      >
                        [DEL]
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Validation Errors Box */}
        {validationErrors.length > 0 && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--risk-high)', color: '#fca5a5', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem', fontWeight: 600 }}>
              <IconAlert size={14} color="#ef4444" />
              <span>PARAMETER RANGE VIOLATIONS:</span>
            </div>
            <ul style={{ paddingLeft: '1.25rem' }}>
              {validationErrors.map((err, i) => (
                <li key={i}>Track #{err.row + 1}: {err.message}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="btn-primary"
            style={{
              padding: '0.55rem 1.5rem',
              fontWeight: 700,
              fontSize: '0.78rem',
            }}
          >
            {loading ? <span className="radar-spinner" style={{ width: '12px', height: '12px' }} /> : <IconCalculator size={13} color="#000" />}
            <span>{loading ? 'COMPUTING INFERENCE...' : 'RUN RISK EVALUATION'}</span>
          </button>
        </div>
      </div>

      {/* Error Callout */}
      {error && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--risk-high)', color: '#fca5a5', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <IconAlert size={14} color="#ef4444" />
          <span>[SYSTEM_ERROR] {error}</span>
        </div>
      )}

      {/* Success Callout */}
      {successNotice && !error && (
        <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--risk-low)', color: 'var(--risk-low)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconCheck size={14} color="#10b981" />
            <span>[STATUS_OK] {successNotice}</span>
          </div>
          {result && (
            <CopyButton
              text={JSON.stringify(result, null, 2)}
              label="COPY JSON"
            />
          )}
        </div>
      )}

      {/* Results Telemetry Panel or Clean Empty State */}
      <AnimatePresence mode="wait">
        {result ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: 'var(--bg-surface)', borderRadius: '2px', border: '1px solid var(--border-subtle)', padding: '1.25rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff', letterSpacing: '0.06em' }}>
                PRIMARY DECISION READOUT (TRANSPARENT RULE ENGINE)
              </span>
              <CopyButton
                text={`Rule Points: ${result.points ?? 'N/A'}/12, Decision: ${result.decision_if_final}, Level: ${result.risk_level}, ML Benchmark: ${result.ml_score ?? 'N/A'}`}
                label="COPY SUMMARY"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ background: '#040404', padding: '1rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>RULE POINTS ACCUMULATED</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: (result.points ?? 0) >= 6 ? 'var(--risk-high)' : (result.points ?? 0) >= 3 ? 'var(--risk-med)' : 'var(--risk-low)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', marginTop: '0.25rem' }}>
                  {result.points !== null && result.points !== undefined ? `${result.points} / ${result.max_points ?? 12} PTS` : 'UNSCORED'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
                  Score: {result.risk_score !== null && result.risk_score !== undefined ? result.risk_score.toFixed(4) : '—'}
                </div>
              </div>

              <div style={{ background: '#040404', padding: '1rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>RECOMMENDED ACTION</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '0.25rem', color: result.decision_if_final === 'MANEUVER' ? 'var(--risk-high)' : result.decision_if_final === 'MONITOR' ? 'var(--risk-med)' : 'var(--risk-low)' }}>
                  {result.decision_if_final ?? 'N/A'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
                  Thresholds: &ge;3 Monitor, &ge;6 Maneuver
                </div>
              </div>

              <div style={{ background: '#040404', padding: '1rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>RISK CLASSIFICATION</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '0.25rem', color: result.risk_level === 'HIGH' ? 'var(--risk-high)' : result.risk_level === 'MEDIUM' ? 'var(--risk-med)' : 'var(--risk-low)' }}>
                  {result.risk_level ?? 'N/A'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
                  Calibrated Operational Tier
                </div>
              </div>

              <div style={{ background: '#040404', padding: '1rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>VALIDATED CDMs (&ge;2.0 DAYS)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', marginTop: '0.25rem' }}>
                  {result.n_cdm_used ?? rows.length}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
                  Decision-Point Horizon
                </div>
              </div>
            </div>

            {/* Rule Drivers Points Breakdown */}
            {result.drivers && result.drivers.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '0.6rem', fontWeight: 600 }}>
                  TRANSPARENT RULE POINTS CONTRIBUTION:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {result.drivers.map((driver, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.55rem 0.85rem',
                        background: '#040404',
                        borderRadius: '2px',
                        fontSize: '0.78rem',
                        fontFamily: 'var(--font-mono)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{driver.label || driver.feature}</span>
                        {driver.value !== null && driver.value !== undefined && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginLeft: '0.6rem' }}>
                            (Value: {typeof driver.value === 'number' ? driver.value.toFixed(2) : driver.value})
                          </span>
                        )}
                      </div>
                      <span style={{ color: driver.contribution >= 2 ? 'var(--risk-high)' : driver.contribution > 0 ? 'var(--risk-med)' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>
                        +{driver.contribution} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Secondary LightGBM Benchmark Card */}
            <div style={{ background: '#040404', borderRadius: '2px', border: '1px solid var(--border-default)', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.45rem' }}>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>
                  LIGHTGBM BENCHMARK COMPARISON (INFORMATIONAL ONLY)
                </span>
                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '1px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  BENCHMARK
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>BENCHMARK SCORE: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{result.ml_score !== null && result.ml_score !== undefined ? result.ml_score.toFixed(4) : '—'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>BENCHMARK LEVEL: </span>
                  <strong style={{ color: result.ml_risk_level === 'HIGH' ? 'var(--risk-high)' : result.ml_risk_level === 'MEDIUM' ? 'var(--risk-med)' : 'var(--risk-low)' }}>
                    {result.ml_risk_level ?? '—'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>BENCHMARK ACTION: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{result.ml_decision ?? '—'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>ML THRESHOLDS: </span>
                  <span style={{ color: 'var(--text-dim)' }}>Rev: 0.2003 / Man: 0.6575</span>
                </div>
              </div>

              {result.ml_benchmark?.top_drivers && result.ml_benchmark.top_drivers.length > 0 && (
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    ML SHAP DRIVERS (BENCHMARK): {result.ml_benchmark.top_drivers.map((d: any) => `${d.feature} (SHAP: ${d.contribution > 0 ? '+' : ''}${typeof d.contribution === 'number' ? d.contribution.toFixed(3) : d.contribution})`).join('; ')}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'var(--bg-surface)',
              borderRadius: '2px',
              border: '1px dashed var(--border-default)',
              padding: '3rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
            }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <IconCalculator size={18} color="var(--text-muted)" />
            </div>
            <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
              AWAITING INFERENCE RUN
            </div>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', maxWidth: '480px', lineHeight: '1.5' }}>
              Select an archived scenario above or configure time-series CDM vectors in the table, then click [RUN RISK EVALUATION] to compute the transparent 12-point rule breakdown.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RiskCalculator;
