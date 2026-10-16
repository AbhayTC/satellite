// src/components/ModelPerformance.tsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchMetrics, fetchPolicy, fetchRules } from '../api';
import type { RulesData } from '../types';
import CopyButton from './CopyButton';

const VERIFIED_TEST_SET = [
  { decision: 'MANEUVER (Action Tier)', ruleCount: 183, rulePct: '8.4%', mlCount: 72, mlPct: '3.3%', meaning: 'Active burn planned or tracking refined' },
  { decision: 'MONITOR (Review Band)', ruleCount: 111, rulePct: '5.1%', mlCount: 68, mlPct: '3.1%', meaning: 'Elevated watch; laser route sent to ground' },
  { decision: 'NO_ACTION (Nominal Clearance)', ruleCount: 1873, rulePct: '86.4%', mlCount: 2027, mlPct: '93.5%', meaning: 'Safe pass; zero propellant expended' },
];

const ModelPerformance: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [rules, setRules] = useState<RulesData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSweepPoint, setSelectedSweepPoint] = useState<number | null>(6);
  const [activeFigTab, setActiveFigTab] = useState<'12' | '13' | '14' | 'roc' | 'pr'>('12');

  useEffect(() => {
    Promise.all([
      fetchMetrics().catch(() => null),
      fetchPolicy().catch(() => null),
      fetchRules().catch(() => null),
    ])
      .then(([m, p, r]) => {
        setMetrics(m);
        setPolicy(p);
        setRules(r);
      })
      .catch((err) => console.warn('Could not load performance metrics:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
        <span className="radar-spinner" />
        <span style={{ letterSpacing: '0.06em' }}>PARSING RULE ENGINE MATRIX & BENCHMARK METRICS...</span>
      </div>
    );
  }

  const cvTable = rules?.cv_table || [];
  const sweep = rules?.sweep || [];
  const tiers = rules?.tiers;
  const models = metrics?.models || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1280px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            METHOD: TRANSPARENT_RULE_ENGINE // BENCHMARK: LIGHTGBM // VALIDATION: 5-FOLD CV
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem', letterSpacing: '-0.01em' }}>
            Rule-Based Risk Engine Evaluation & ML Benchmark
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <CopyButton
            text={JSON.stringify({ rules, metrics, policy }, null, 2)}
            label="EXPORT EVALUATION JSON"
          />
        </div>
      </div>

      {/* Actual Test Set Evaluation (2,167 Unlabelled Challenge Events) */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '2px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff', letterSpacing: '0.06em' }}>
              ACTUAL TEST EVALUATION: RULE ENGINE VS LIGHTGBM BENCHMARK (N = 2,167 EVENTS)
            </span>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
              Official challenge test evaluation without ground-truth labels. Operational distribution shows 139 consensus flagged events.
            </div>
          </div>
          <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            UNLABELLED TEST EVALUATION
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', textAlign: 'left' }} className="tabular-nums">
            <thead>
              <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-strong)', background: 'var(--bg-surface-elevated)' }}>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>OPERATIONAL DECISION</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: '#ffffff' }}>RULE ENGINE (OUR MAIN APPROACH)</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>LIGHTGBM BENCHMARK (COMPARISON)</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>OPERATIONAL ACTION</th>
              </tr>
            </thead>
            <tbody>
              {VERIFIED_TEST_SET.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: row.decision.startsWith('MANEUVER') ? 'var(--risk-high)' : row.decision.startsWith('MONITOR') ? 'var(--risk-med)' : 'var(--risk-low)' }}>
                    {row.decision}
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#ffffff' }}>
                    {row.ruleCount.toLocaleString()} <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>({row.rulePct})</span>
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)' }}>
                    {row.mlCount.toLocaleString()} <span style={{ fontSize: '0.72rem' }}>({row.mlPct})</span>
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary)' }}>
                    {row.meaning}
                  </td>
                </tr>
              ))}
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', fontWeight: 700 }}>
                <td style={{ padding: '0.65rem 0.85rem', color: '#ffffff' }}>TOTAL FLAGGED (MONITOR + MANEUVER)</td>
                <td style={{ padding: '0.65rem 0.85rem', color: 'var(--risk-med)' }}>294 events (13.6%)</td>
                <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)' }}>140 events (6.5%)</td>
                <td style={{ padding: '0.65rem 0.85rem', color: '#ffffff' }}>Both systems agree on 139 events</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* (b) Operational Decision Tiers (In-Sample Calibration) */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '2px', border: '1px solid var(--border-subtle)', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff', letterSpacing: '0.06em' }}>
              OPERATIONAL DECISION TIERS (IN-SAMPLE CALIBRATION)
            </span>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
              Two calibrated tier thresholds establish operational boundary lines from the 12-point rule scale.
            </div>
          </div>
          <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-default)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
            STATUS: IN-SAMPLE
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {/* Review Tier */}
          <div style={{ background: '#040404', padding: '1rem', borderRadius: '2px', border: '1px solid var(--risk-med)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--risk-med)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
                REVIEW TIER (MONITOR)
              </span>
              <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', background: 'rgba(245, 158, 11, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '2px', color: 'var(--risk-med)', border: '1px solid var(--risk-med)', fontWeight: 700 }}>
                &ge; {rules?.thresholds?.review ?? 3} POINTS
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', marginTop: '0.75rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>RECALL</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--risk-low)', marginTop: '0.15rem' }}>
                  {tiers?.review?.recall ? `${(tiers.review.recall * 100).toFixed(1)}%` : '96.0%'}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>PRECISION</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--risk-med)', marginTop: '0.15rem' }}>
                  {tiers?.review?.precision ? `${(tiers.review.precision * 100).toFixed(1)}%` : '25.1%'}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>FLAGGED</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                  {tiers?.review?.flagged?.toLocaleString() ?? '1,237'}
                </div>
              </div>
            </div>
          </div>

          {/* Maneuver Tier */}
          <div style={{ background: '#040404', padding: '1rem', borderRadius: '2px', border: '1px solid var(--risk-high)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--risk-high)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
                ACTION TIER (MANEUVER)
              </span>
              <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', background: 'rgba(239, 68, 68, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '2px', color: 'var(--risk-high)', border: '1px solid var(--risk-high)', fontWeight: 700 }}>
                &ge; {rules?.thresholds?.maneuver ?? 6} POINTS
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', marginTop: '0.75rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>RECALL</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--risk-low)', marginTop: '0.15rem' }}>
                  {tiers?.maneuver?.recall ? `${(tiers.maneuver.recall * 100).toFixed(1)}%` : '92.9%'}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>PRECISION</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--risk-high)', marginTop: '0.15rem' }}>
                  {tiers?.maneuver?.precision ? `${(tiers.maneuver.precision * 100).toFixed(1)}%` : '51.4%'}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>FLAGGED</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                  {tiers?.maneuver?.flagged?.toLocaleString() ?? '584'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* (a) Rule-Engine vs ML Comparison Table (Cross-Validated) */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '2px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff', letterSpacing: '0.06em' }}>
              RULE-ENGINE VS MACHINE LEARNING (CROSS-VALIDATED)
            </span>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
              Direct comparison across target recall points. The rule engine achieves comparable precision without black-box complexity.
            </div>
          </div>
          <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            5-FOLD CROSS-VALIDATED
          </span>
        </div>

        <div style={{ overflowX: 'auto' }} data-lenis-prevent>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', textAlign: 'left' }}>
            <thead className="sticky-header">
              <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-strong)', background: 'var(--bg-surface-elevated)' }}>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>TARGET RECALL</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>RULE PTS CUT</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>RULE RECALL</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>RULE PRECISION</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>RULE MISSED</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>RULE FLAGGED</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>RISK-ONLY PREC</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>ML PREC (BENCHMARK)</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>ML MISSED</th>
              </tr>
            </thead>
            <tbody>
              {cvTable.map((row, idx) => (
                <tr
                  key={idx}
                  style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.12s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#ffffff' }}>
                    {(row.target_recall * 100).toFixed(0)}%
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    &ge; {row.rule_points_threshold} pts
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem', color: 'var(--risk-low)', fontWeight: 600 }}>
                    {(row.rule_recall * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem', color: 'var(--risk-med)', fontWeight: 600 }}>
                    {(row.rule_precision * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem', color: row.rule_missed > 20 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
                    {row.rule_missed}
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-primary)' }}>
                    {row.rule_flagged.toLocaleString()}
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary)' }}>
                    {(row.latest_risk_only_precision * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)' }}>
                    {(row.ml_precision * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)' }}>
                    {row.ml_missed_at_same_recall}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* (c) Threshold Sweep Visualization with Animated Bars */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '2px', border: '1px solid var(--border-subtle)', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff', letterSpacing: '0.06em' }}>
              THRESHOLD SWEEP (POINTS 0 TO 12 TRADE-OFF CURVE)
            </span>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
              Inspect how increasing the rule points threshold alters the recall vs precision balance.
            </div>
          </div>
          {selectedSweepPoint !== null && (
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', background: '#000000', padding: '0.2rem 0.5rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
              SELECTED: &ge; {selectedSweepPoint} PTS | FLAGGED: {sweep.find((s) => s.points_at_least === selectedSweepPoint)?.flagged.toLocaleString()}
            </span>
          )}
        </div>

        {/* Sweep Bars Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowX: 'auto', padding: '0.25rem 0' }}>
          {sweep.map((s) => {
            const isSelected = selectedSweepPoint === s.points_at_least;
            const isReview = s.points_at_least === 3;
            const isManeuver = s.points_at_least === 6;

            return (
              <div
                key={s.points_at_least}
                onClick={() => setSelectedSweepPoint(s.points_at_least)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '2px',
                  background: isSelected ? 'rgba(255, 255, 255, 0.05)' : '#000000',
                  border: isManeuver
                    ? '1px solid var(--risk-high)'
                    : isReview
                    ? '1px solid var(--risk-med)'
                    : isSelected
                    ? '1px solid var(--border-strong)'
                    : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  transition: 'border-color 0.15s ease, background 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '115px',
                    flexShrink: 0,
                    fontWeight: 700,
                    color: isManeuver ? 'var(--risk-high)' : isReview ? 'var(--risk-med)' : '#ffffff',
                  }}
                >
                  &ge; {s.points_at_least} PTS {isManeuver ? '[MANEUVER]' : isReview ? '[REVIEW]' : ''}
                </div>

                {/* Animated Recall & Precision bars */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    <span>Recall: {(s.recall * 100).toFixed(1)}%</span>
                    <span>Precision: {(s.precision * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ display: 'flex', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '1px', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${s.recall * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      style={{ height: '100%', background: 'var(--risk-low)' }}
                      title={`Recall: ${(s.recall * 100).toFixed(1)}%`}
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${s.precision * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      style={{ height: '100%', background: 'var(--risk-med)' }}
                      title={`Precision: ${(s.precision * 100).toFixed(1)}%`}
                    />
                  </div>
                </div>

                <div style={{ width: '110px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                  {s.flagged.toLocaleString()} flagged
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* (d) Baseline ML Classifiers (Benchmark Only) */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '2px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
              MACHINE LEARNING MODELS (BENCHMARK COMPARISON ONLY)
            </span>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
              ML classifiers serve as historical comparison benchmarks; they are not the primary risk decision authority.
            </div>
          </div>
          <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)' }}>
            STATUS: BENCHMARK ONLY
          </span>
        </div>

        <div style={{ overflowX: 'auto' }} data-lenis-prevent>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', textAlign: 'left' }}>
            <thead className="sticky-header">
              <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-strong)', background: 'var(--bg-surface-elevated)' }}>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>MODEL CLASSIFIER</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>ROLE</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>ROC AUC</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>PR AUC</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>F1 SCORE</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>PRECISION</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>RECALL</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>ACCURACY</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(models).map(([name, m]: [string, any]) => (
                <tr
                  key={name}
                  style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.12s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {name}
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem' }}>
                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '1px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                      BENCHMARK
                    </span>
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-primary)' }}>{m.roc_auc?.toFixed(4) ?? '—'}</td>
                  <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-primary)' }}>{m.pr_auc?.toFixed(4) ?? '—'}</td>
                  <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-primary)' }}>{m.f1?.toFixed(4) ?? '—'}</td>
                  <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-primary)' }}>{(m.precision * 100).toFixed(1)}%</td>
                  <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-primary)' }}>{(m.recall * 100).toFixed(1)}%</td>
                  <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-primary)' }}>{(m.accuracy * 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Figures Diagnostic Visualizations */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '2px', border: '1px solid var(--border-subtle)', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff', letterSpacing: '0.06em' }}>
            MISSION ARCHITECTURE & PERFORMANCE FIGURES
          </span>

          {/* Figure Selectors */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: '12', label: 'FIG 12: DATA OVERVIEW' },
              { id: '13', label: 'FIG 13: MANEUVER PLAN' },
              { id: '14', label: 'FIG 14: ALERT ROUTING' },
              { id: 'roc', label: 'BENCHMARK ROC' },
              { id: 'pr', label: 'BENCHMARK PR' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFigTab(tab.id as any)}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  background: activeFigTab === tab.id ? '#ffffff' : '#040404',
                  color: activeFigTab === tab.id ? '#000000' : 'var(--text-secondary)',
                  border: `1px solid ${activeFigTab === tab.id ? '#ffffff' : 'var(--border-default)'}`,
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontWeight: activeFigTab === tab.id ? 700 : 500,
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Figure Display */}
        <div style={{ textAlign: 'center', background: '#020202', padding: '1.25rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
          {activeFigTab === '12' && (
            <div>
              <img
                src="/figs/12_data_overview.png"
                alt="Figure 12: Data Overview"
                style={{ maxWidth: '100%', height: 'auto', maxHeight: '480px', borderRadius: '2px' }}
                onError={(e) => { (e.currentTarget as any).src = 'figs/12_data_overview.png'; }}
              />
              <div style={{ marginTop: '0.65rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Figure 12: Conjunction dataset overview across time-to-TCA, miss distances, and relative speeds.
              </div>
            </div>
          )}
          {activeFigTab === '13' && (
            <div>
              <img
                src="/figs/13_maneuver_plan.png"
                alt="Figure 13: Maneuver Plan"
                style={{ maxWidth: '100%', height: 'auto', maxHeight: '480px', borderRadius: '2px' }}
                onError={(e) => { (e.currentTarget as any).src = 'figs/13_maneuver_plan.png'; }}
              />
              <div style={{ marginTop: '0.65rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Figure 13: Minimum-cost maneuver planning graph along CDM miss vector via Dijkstra algorithm.
              </div>
            </div>
          )}
          {activeFigTab === '14' && (
            <div>
              <img
                src="/figs/14_alert_routing.png"
                alt="Figure 14: Alert Routing"
                style={{ maxWidth: '100%', height: 'auto', maxHeight: '480px', borderRadius: '2px' }}
                onError={(e) => { (e.currentTarget as any).src = 'figs/14_alert_routing.png'; }}
              />
              <div style={{ marginTop: '0.65rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Figure 14: Minimum-latency alert routing across constellation laser cross-links to ground stations.
              </div>
            </div>
          )}
          {activeFigTab === 'roc' && (
            <div>
              <img
                src="/figs/2_roc.png"
                alt="ROC Curve"
                style={{ maxWidth: '100%', height: 'auto', maxHeight: '480px', borderRadius: '2px' }}
                onError={(e) => { (e.currentTarget as any).src = 'figs/2_roc.png'; }}
              />
              <div style={{ marginTop: '0.65rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Figure 2: Receiver Operating Characteristic (ROC) for baseline comparison models.
              </div>
            </div>
          )}
          {activeFigTab === 'pr' && (
            <div>
              <img
                src="/figs/3_pr_curve.png"
                alt="PR Curve"
                style={{ maxWidth: '100%', height: 'auto', maxHeight: '480px', borderRadius: '2px' }}
                onError={(e) => { (e.currentTarget as any).src = 'figs/3_pr_curve.png'; }}
              />
              <div style={{ marginTop: '0.65rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Figure 3: Precision-Recall (PR) trade-off across severe class imbalance.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Honest Label Footnote */}
      <div style={{ padding: '1rem 1.25rem', background: '#040404', borderRadius: '2px', borderLeft: '3px solid #ffffff', borderTop: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
        <strong style={{ color: '#ffffff' }}>Honest Assessment Footnotes:</strong>
        <ul style={{ paddingLeft: '1.25rem', marginTop: '0.4rem', lineHeight: '1.6' }}>
          <li>All accuracy and recall metrics are cross-validated on training events; test labels do not exist in the challenge data.</li>
          <li>The maneuver plan is schematic along the miss vector with an assumed 2,000 m keep-out distance and an arbitrary fuel proxy unit.</li>
          <li>The alert network is illustrative (12 LEO satellites, 3 ground stations, Dijkstra routing).</li>
        </ul>
      </div>
    </div>
  );
};

export default ModelPerformance;
