// src/components/LearningAgent.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { fetchLearning, fetchLearnedPolicy, fetchSimulationFrames } from '../api';
import { IconPlay, IconPause, IconReset } from './Icons';
import CopyButton from './CopyButton';

interface PolicyContext {
  score_band: string;
  trend: 'falling' | 'flat' | 'rising';
  best_action: 'NO_ACTION' | 'MONITOR' | 'MANEUVER';
  q_values: number[];
  visits: number;
}

interface SimEvent {
  id: number;
  sat: number;
  th: number;
  r: number;
  score: number;
  phase: string;
  action: string | null;
  reward: number | null;
  high_risk: boolean | null;
}

interface SimSat {
  k: number;
  th: number;
  r: number;
}

interface SimFrame {
  t: number;
  sats: SimSat[];
  events: SimEvent[];
}

const SCORE_BANDS = [
  '<0.005',
  '0.005-0.02',
  '0.02-0.05',
  '0.05-0.10',
  '0.10-0.20',
  '0.20-0.35',
  '0.35-0.50',
  '0.50-0.65',
  '0.65-0.80',
  '>=0.80',
];

const TRENDS: Array<'falling' | 'flat' | 'rising'> = ['falling', 'flat', 'rising'];

const LearningAgent: React.FC = () => {
  const [learning, setLearning] = useState<any>(null);
  const [policy, setPolicy] = useState<PolicyContext[]>([]);
  const [frames, setFrames] = useState<SimFrame[]>([]);
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedContext, setSelectedContext] = useState<PolicyContext | null>(null);

  useEffect(() => {
    Promise.all([
      fetchLearning().catch(() => null),
      fetchLearnedPolicy().catch(() => []),
      fetchSimulationFrames(0, 40).catch(() => null),
    ])
      .then(([l, p, s]) => {
        setLearning(l);
        setPolicy(p || []);
        if (s?.frames && Array.isArray(s.frames)) {
          setFrames(s.frames as SimFrame[]);
        }
      })
      .catch((err) => console.warn('Could not load learning agent data:', err))
      .finally(() => setLoading(false));
  }, []);

  // Frame player playback timer
  useEffect(() => {
    let timer: any;
    if (isPlaying && frames.length > 0) {
      timer = setInterval(() => {
        setCurrentFrameIdx((prev) => (prev + 1) % frames.length);
      }, 350);
    }
    return () => clearInterval(timer);
  }, [isPlaying, frames]);

  // Lookup map for 30 contexts heatmap: score_band + trend -> PolicyContext
  const policyMap = useMemo(() => {
    const map = new Map<string, PolicyContext>();
    policy.forEach((ctx) => {
      map.set(`${ctx.score_band}__${ctx.trend}`, ctx);
    });
    return map;
  }, [policy]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
        <span className="radar-spinner" />
        <span style={{ letterSpacing: '0.06em' }}>LOADING CONTEXTUAL BANDIT RESEARCH EXTENSION...</span>
      </div>
    );
  }

  const currentFrame = frames[currentFrameIdx] || null;
  const comparison = learning?.comparison || {};
  const rewardAssumptions = learning?.reward_assumptions || {};

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'MANEUVER':
        return (
          <span style={{ padding: '0.15rem 0.5rem', borderRadius: '2px', background: 'var(--risk-high)', color: '#000000', fontWeight: 800, fontSize: '0.68rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
            MANEUVER
          </span>
        );
      case 'MONITOR':
        return (
          <span style={{ padding: '0.15rem 0.5rem', borderRadius: '2px', background: 'var(--risk-med)', color: '#000000', fontWeight: 700, fontSize: '0.68rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
            MONITOR
          </span>
        );
      case 'NO_ACTION':
        return (
          <span style={{ padding: '0.15rem 0.5rem', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
            NO_ACTION
          </span>
        );
      default:
        return <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>—</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1280px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            RESEARCH_EXTENSION: CONTEXTUAL_BANDIT // SIMULATOR: MESA // REWARDS: ASSUMED_UTILITY
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem', letterSpacing: '-0.01em' }}>
            Extension: Contextual Bandit Learning Agent
          </h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
            Autonomous decision agent optimizing assumed collision risk vs action cost trade-offs. Not part of core flight rules.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <CopyButton
            text={JSON.stringify({ learning, policy, frameCount: frames.length }, null, 2)}
            label="EXPORT BANDIT JSON"
          />
        </div>
      </div>

      {/* 1. Honest Finding Callout: Fixed Rules beat Learned Bandit */}
      <div
        style={{
          padding: '1rem 1.25rem',
          background: '#040404',
          borderRadius: '2px',
          borderLeft: '3px solid var(--border-strong)',
          borderTop: '1px solid var(--border-subtle)',
          borderRight: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            CRITICAL EMPIRICAL AUDIT FINDING
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#ffffff', marginTop: '0.2rem' }}>
            Fixed Threshold Policy (+0.211 Mean Reward) Outperformed Learned Contextual Bandit (+0.133)
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', maxWidth: '780px', lineHeight: '1.5' }}>
            Because conjunction encounters are overwhelmingly safe (97.3% base-rate), the exploration phase of the contextual bandit incurs high false-review penalties, whereas the transparent calibrated rule engine delivers stable, predictable collision avoidance without online policy drift.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', background: '#000000', padding: '0.65rem 1rem', borderRadius: '2px', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>FIXED RULES</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--risk-low)', marginTop: '0.1rem' }}>+0.211</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1rem' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>LEARNED BANDIT</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '0.1rem' }}>+0.133</div>
          </div>
        </div>
      </div>

      {/* 2. Benchmark Strategy Comparison Table from learning.json */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '2px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff', letterSpacing: '0.06em' }}>
              STRATEGY REWARD COMPARISON (HELD-OUT 4,755 ENCOUNTERS)
            </span>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
              Evaluated under assumed reward functions: Maneuver cost: 2.0 (benefit: 10.0), Review cost: 0.3 (benefit: 4.0), Collision penalty: 20.0.
            </div>
          </div>
          <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)' }}>
            HELD-OUT TEST
          </span>
        </div>

        <div style={{ overflowX: 'auto' }} data-lenis-prevent>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', textAlign: 'left' }}>
            <thead className="sticky-header">
              <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-strong)', background: 'var(--bg-surface-elevated)' }}>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>STRATEGY</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>MEAN REWARD</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>MANEUVERS / 1000</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>REVIEWS / 1000</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>CAUGHT (RECALL)</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>MISSED COLLISION</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(comparison).map(([stratName, strat]: [string, any]) => {
                const isFixed = stratName.includes('Fixed');
                const isOracle = stratName.includes('Oracle');
                const isBandit = stratName.includes('Learned');

                return (
                  <tr
                    key={stratName}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isFixed ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isFixed) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isFixed) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: isFixed ? '#ffffff' : isOracle ? 'var(--text-secondary)' : isBandit ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{stratName}</span>
                        {isFixed && (
                          <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem', borderRadius: '1px', background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', fontWeight: 700 }}>
                            OUR ENGINE
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: strat.mean_reward > 0.2 ? 'var(--risk-low)' : strat.mean_reward > 0 ? 'var(--text-primary)' : 'var(--risk-high)' }}>
                      {strat.mean_reward > 0 ? `+${strat.mean_reward.toFixed(4)}` : strat.mean_reward.toFixed(4)}
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary)' }}>
                      {strat.maneuvers_per_1000.toFixed(1)}
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary)' }}>
                      {strat.reviews_per_1000.toFixed(1)}
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', color: strat.caught >= 0.9 ? 'var(--risk-low)' : 'var(--risk-med)', fontWeight: 600 }}>
                      {(strat.caught * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', color: strat.missed > 0 ? 'var(--risk-high)' : 'var(--risk-low)', fontWeight: strat.missed > 0 ? 700 : 400 }}>
                      {strat.missed}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. 30-Context Policy Matrix Heatmap (10 Score Bands x 3 Trends) */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '2px', border: '1px solid var(--border-subtle)', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff', letterSpacing: '0.06em' }}>
              30-CONTEXT STATE-ACTION HEATMAP (LEARNED POLICY MATRIX)
            </span>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
              10 risk score bands &times; 3 trajectory trends. Click any cell to inspect learned Q-values and empirical visit frequencies.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)' }}>
              <span style={{ width: '8px', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '1px' }} /> NO_ACTION
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--risk-med)' }}>
              <span style={{ width: '8px', height: '8px', background: 'var(--risk-med)', borderRadius: '1px' }} /> MONITOR
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--risk-high)' }}>
              <span style={{ width: '8px', height: '8px', background: 'var(--risk-high)', borderRadius: '1px' }} /> MANEUVER
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }} data-lenis-prevent>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#040404', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '0.6rem 0.85rem', width: '140px' }}>RISK SCORE BAND</th>
                <th style={{ padding: '0.6rem 0.85rem' }}>FALLING TREND</th>
                <th style={{ padding: '0.6rem 0.85rem' }}>FLAT TREND</th>
                <th style={{ padding: '0.6rem 0.85rem' }}>RISING TREND</th>
              </tr>
            </thead>
            <tbody>
              {SCORE_BANDS.map((band) => (
                <tr key={band} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.55rem 0.85rem', fontWeight: 600, color: 'var(--text-primary)', background: '#040404' }}>
                    {band}
                  </td>
                  {TRENDS.map((tr) => {
                    const ctx = policyMap.get(`${band}__${tr}`);
                    const isSelected = selectedContext?.score_band === band && selectedContext?.trend === tr;
                    const action = ctx?.best_action ?? 'NO_ACTION';

                    return (
                      <td
                        key={tr}
                        onClick={() => ctx && setSelectedContext(ctx)}
                        style={{
                          padding: '0.45rem 0.65rem',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            padding: '0.35rem 0.55rem',
                            borderRadius: '2px',
                            border: isSelected
                              ? '1px solid #ffffff'
                              : action === 'MANEUVER'
                              ? '1px solid var(--risk-high)'
                              : action === 'MONITOR'
                              ? '1px solid var(--risk-med)'
                              : '1px solid var(--border-subtle)',
                            background:
                              action === 'MANEUVER'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : action === 'MONITOR'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(255, 255, 255, 0.02)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              color:
                                action === 'MANEUVER'
                                  ? 'var(--risk-high)'
                                  : action === 'MONITOR'
                                  ? 'var(--risk-med)'
                                  : 'var(--text-secondary)',
                            }}
                          >
                            {action}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                            {ctx?.visits?.toLocaleString() ?? 0} visits
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Context Detail Drawer */}
        {selectedContext && (
          <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', background: '#040404', borderRadius: '2px', border: '1px solid var(--border-strong)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SELECTED CONTEXT</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff', marginTop: '0.15rem' }}>
                Score: {selectedContext.score_band} // Trend: {selectedContext.trend.toUpperCase()} // Recommended: {selectedContext.best_action}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Q(NO_ACTION): </span>
                <span style={{ color: '#ffffff' }}>{selectedContext.q_values?.[0]?.toFixed(3) ?? '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Q(MONITOR): </span>
                <span style={{ color: 'var(--risk-med)' }}>{selectedContext.q_values?.[1]?.toFixed(3) ?? '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Q(MANEUVER): </span>
                <span style={{ color: 'var(--risk-high)' }}>{selectedContext.q_values?.[2]?.toFixed(3) ?? '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>VISITS: </span>
                <span style={{ color: '#ffffff' }}>{selectedContext.visits.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. MESA Multi-Agent Constellation Step Replay */}
      <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff', letterSpacing: '0.06em' }}>
              MESA MULTI-AGENT CONSTELLATION SIMULATION REPLAY
            </div>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              STEP {frames.length > 0 ? currentFrameIdx + 1 : 0} OF {frames.length} (ARCHIVE: 40 ENCOUNTER STEPS)
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="btn-primary"
              style={{
                padding: '0.4rem 0.9rem',
                fontSize: '0.75rem',
              }}
            >
              {isPlaying ? <IconPause size={11} color="#000" /> : <IconPlay size={11} color="#000" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
            <button
              onClick={() => setCurrentFrameIdx(0)}
              className="btn-secondary"
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.75rem',
              }}
            >
              <IconReset size={11} />
              <span>STEP 0</span>
            </button>
          </div>
        </div>

        {/* Timeline Slider */}
        {frames.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <input
              type="range"
              min={0}
              max={frames.length - 1}
              value={currentFrameIdx}
              onChange={(e) => setCurrentFrameIdx(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#ffffff',
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.1)',
                height: '4px',
              }}
            />
          </div>
        )}

        {/* Current Frame Layout: SVG Radar + Active Events Table */}
        {currentFrame ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {/* Constellation Radar Canvas */}
            <div style={{ background: '#040404', padding: '1rem', borderRadius: '2px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="320" height="320" viewBox="0 0 320 320" style={{ overflow: 'visible' }}>
                {/* Background circles */}
                <circle cx="160" cy="160" r="140" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="3,3" />
                <circle cx="160" cy="160" r="100" fill="none" stroke="rgba(255, 255, 255, 0.12)" />
                <circle cx="160" cy="160" r="60" fill="none" stroke="rgba(255, 255, 255, 0.06)" />
                <circle cx="160" cy="160" r="24" fill="#000000" stroke="rgba(255, 255, 255, 0.25)" />
                <text x="160" y="163" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">EARTH</text>

                {/* Satellites */}
                {currentFrame.sats?.map((sat) => {
                  const cx = 160 + 100 * Math.cos(sat.th);
                  const cy = 160 + 100 * Math.sin(sat.th);
                  return (
                    <g key={sat.k}>
                      <circle cx={cx} cy={cy} r="4" fill="#ffffff" />
                      <text
                        x={cx + 7 * Math.cos(sat.th)}
                        y={cy + 7 * Math.sin(sat.th) + 3}
                        fontSize="8"
                        fontFamily="var(--font-mono)"
                        fill="var(--text-secondary)"
                        textAnchor={Math.cos(sat.th) > 0 ? 'start' : 'end'}
                      >
                        S{sat.k}
                      </text>
                    </g>
                  );
                })}

                {/* Encounter Events */}
                {currentFrame.events?.map((ev, i) => {
                  const cx = 160 + 115 * Math.cos(ev.th);
                  const cy = 160 + 115 * Math.sin(ev.th);
                  const isHigh = ev.high_risk === true || ev.action === 'MANEUVER';
                  const isMed = ev.action === 'MONITOR';

                  return (
                    <g key={i}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isHigh ? 6 : 4}
                        fill={isHigh ? 'var(--risk-high)' : isMed ? 'var(--risk-med)' : 'rgba(255, 255, 255, 0.4)'}
                        stroke="#000000"
                        strokeWidth="1.5"
                      />
                    </g>
                  );
                })}
              </svg>

              <div style={{ marginTop: '0.75rem', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textAlign: 'center' }}>
                CONSTELLATION ORBITAL POLAR PROJECTION // 12 SATELLITES // STEP {currentFrame.t}
              </div>
            </div>

            {/* Frame Events List Table */}
            <div style={{ background: '#040404', padding: '1rem', borderRadius: '2px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.45rem' }}>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#ffffff', fontWeight: 700 }}>
                  STEP {currentFrame.t} CONJUNCTION ENCOUNTERS ({currentFrame.events?.length ?? 0} ACTIVE)
                </span>
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  PHASE: {currentFrame.events?.filter(e => e.phase === 'decided').length ?? 0} DECIDED
                </span>
              </div>

              <div style={{ overflowY: 'auto', maxHeight: '280px' }} data-lenis-prevent>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '0.35rem 0.5rem' }}>EVENT ID</th>
                      <th style={{ padding: '0.35rem 0.5rem' }}>SAT</th>
                      <th style={{ padding: '0.35rem 0.5rem' }}>SCORE</th>
                      <th style={{ padding: '0.35rem 0.5rem' }}>PHASE</th>
                      <th style={{ padding: '0.35rem 0.5rem' }}>ACTION</th>
                      <th style={{ padding: '0.35rem 0.5rem' }}>REWARD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentFrame.events?.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          NO CONJUNCTION ENCOUNTERS AT STEP {currentFrame.t}.
                        </td>
                      </tr>
                    ) : (
                      currentFrame.events?.map((ev, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.4rem 0.5rem', color: '#ffffff', fontWeight: 600 }}>#{ev.id}</td>
                          <td style={{ padding: '0.4rem 0.5rem', color: 'var(--text-secondary)' }}>SAT-{ev.sat}</td>
                          <td style={{ padding: '0.4rem 0.5rem', color: ev.score > 0.5 ? 'var(--risk-high)' : ev.score > 0.1 ? 'var(--risk-med)' : 'var(--text-secondary)' }}>
                            {ev.score.toFixed(4)}
                          </td>
                          <td style={{ padding: '0.4rem 0.5rem', color: ev.phase === 'decided' ? '#ffffff' : 'var(--text-muted)' }}>
                            {ev.phase.toUpperCase()}
                          </td>
                          <td style={{ padding: '0.4rem 0.5rem' }}>
                            {ev.action ? getActionBadge(ev.action) : <span style={{ color: 'var(--text-dim)' }}>WATCH</span>}
                          </td>
                          <td style={{ padding: '0.4rem 0.5rem', color: ev.reward !== null && ev.reward > 0 ? 'var(--risk-low)' : ev.reward !== null && ev.reward < 0 ? 'var(--risk-high)' : 'var(--text-muted)' }}>
                            {ev.reward !== null ? (ev.reward > 0 ? `+${ev.reward.toFixed(1)}` : ev.reward.toFixed(1)) : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
            NO FRAME DATA LOADED.
          </div>
        )}
      </div>

      {/* Reward Assumptions Card */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '2px', border: '1px solid var(--border-subtle)', padding: '1.25rem' }}>
        <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff', marginBottom: '0.65rem', letterSpacing: '0.06em' }}>
          REWARD SPECIFICATION & ASSUMED UTILITY PARAMETERS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
          <div style={{ background: '#040404', padding: '0.75rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Maneuver Cost: </span>
            <strong style={{ color: 'var(--risk-high)' }}>-{rewardAssumptions.maneuver_cost ?? 2.0} pts</strong>
          </div>
          <div style={{ background: '#040404', padding: '0.75rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Maneuver Benefit: </span>
            <strong style={{ color: 'var(--risk-low)' }}>+{rewardAssumptions.maneuver_benefit ?? 10.0} pts</strong>
          </div>
          <div style={{ background: '#040404', padding: '0.75rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Review Cost: </span>
            <strong style={{ color: 'var(--risk-med)' }}>-{rewardAssumptions.review_cost ?? 0.3} pts</strong>
          </div>
          <div style={{ background: '#040404', padding: '0.75rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Collision Miss Penalty: </span>
            <strong style={{ color: 'var(--risk-high)' }}>-{rewardAssumptions.miss_penalty ?? 20.0} pts</strong>
          </div>
        </div>
      </div>

      {/* Honest Footnote */}
      <div style={{ padding: '1rem 1.25rem', background: '#040404', borderRadius: '2px', borderLeft: '3px solid #ffffff', borderTop: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
        <strong style={{ color: '#ffffff' }}>Research Extension Footnote:</strong>
        <p style={{ marginTop: '0.35rem', lineHeight: '1.6' }}>
          The contextual bandit learning agent is a research extension running on synthetic MESA simulation frames. In operational orbit regimes, certified flight safety guidelines prioritize verifiable, deterministic rule boundaries over online reward-seeking reinforcement policies.
        </p>
      </div>
    </div>
  );
};

export default LearningAgent;
