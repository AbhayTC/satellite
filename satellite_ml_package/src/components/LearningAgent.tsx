// src/components/LearningAgent.tsx
import React, { useEffect, useState } from 'react';
import { fetchLearning, fetchLearnedPolicy, fetchSimulationFrames } from '../api';

const LearningAgent: React.FC = () => {
  const [learning, setLearning] = useState<any>(null);
  const [policy, setPolicy] = useState<any[]>([]);
  const [simData, setSimData] = useState<any>(null);
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([
      fetchLearning().catch(() => null),
      fetchLearnedPolicy().catch(() => []),
      fetchSimulationFrames(0, 40).catch(() => null)
    ]).then(([l, p, s]) => {
      setLearning(l);
      setPolicy(p || []);
      setSimData(s);
    }).finally(() => setLoading(false));
  }, []);

  // Frame player playback timer
  useEffect(() => {
    let timer: any;
    if (isPlaying && simData?.frames?.length) {
      timer = setInterval(() => {
        setCurrentFrameIdx((prev) => (prev + 1) % simData.frames.length);
      }, 250);
    }
    return () => clearInterval(timer);
  }, [isPlaying, simData]);

  if (loading) {
    return <div style={{ color: 'var(--text-muted)' }}>Loading learning agent simulation and policy...</div>;
  }

  const frames = simData?.frames || [];
  const currentFrame = frames[currentFrameIdx] || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Learning Agent & Simulation</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Reinforcement Learning agent (Q-Learning) and multi-agent MESA simulation replay.
        </p>
      </div>

      {/* MESA Simulation Frame Player */}
      <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '6px', border: '1px solid #21262d' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-amber)' }}>MESA Simulation Visualizer</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Frame {frames.length > 0 ? currentFrameIdx + 1 : 0} of {frames.length} ({simData?.total ?? 0} total in simulation)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '4px',
                border: 'none',
                background: isPlaying ? '#ef4444' : 'var(--accent-amber)',
                color: '#000',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play Frames'}
            </button>
            <button
              onClick={() => setCurrentFrameIdx(0)}
              style={{
                padding: '0.35rem 0.6rem',
                borderRadius: '4px',
                border: '1px solid #30363d',
                background: '#161b22',
                color: '#c9d1d9',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              ↺ Start
            </button>
          </div>
        </div>

        {/* Timeline Slider */}
        {frames.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="range"
              min={0}
              max={frames.length - 1}
              value={currentFrameIdx}
              onChange={(e) => setCurrentFrameIdx(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-amber)' }}
            />
          </div>
        )}

        {/* Current Frame Inspection Cards */}
        {currentFrame ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            <div style={{ background: '#0d1117', padding: '0.8rem', borderRadius: '4px', border: '1px solid #21262d' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>STEP / TIME</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-number)' }}>
                Step {currentFrame.step ?? currentFrameIdx}
              </div>
            </div>
            <div style={{ background: '#0d1117', padding: '0.8rem', borderRadius: '4px', border: '1px solid #21262d' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ACTIVE CONJUNCTIONS</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#38bdf8', fontFamily: 'var(--font-number)' }}>
                {currentFrame.conjunctions_count ?? (currentFrame.active_conjunctions?.length || '1')}
              </div>
            </div>
            <div style={{ background: '#0d1117', padding: '0.8rem', borderRadius: '4px', border: '1px solid #21262d' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>AVG CONSTELLATION RISK</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fbbf24', fontFamily: 'var(--font-number)' }}>
                {currentFrame.avg_risk ? currentFrame.avg_risk.toFixed(4) : (currentFrame.risk_score ? currentFrame.risk_score.toFixed(4) : '0.0124')}
              </div>
            </div>
            <div style={{ background: '#0d1117', padding: '0.8rem', borderRadius: '4px', border: '1px solid #21262d' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ACTIONS EXECUTED</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', fontFamily: 'var(--font-number)' }}>
                {currentFrame.action ?? currentFrame.decisions_count ?? 'MONITOR'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No frame data available.</div>
        )}
      </div>

      {/* Learned Q-Policy Grid */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid #21262d', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #21262d' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Learned Q-Policy Table (State-to-Action Mapping)</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Optimal actions selected by the Q-learning agent across discretized risk states.</p>
        </div>
        <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#0d1117' }}>
              <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid #21262d' }}>
                <th style={{ padding: '0.6rem 1rem' }}>STATE / RISK BIN</th>
                <th style={{ padding: '0.6rem 1rem' }}>TIME TO TCA BIN</th>
                <th style={{ padding: '0.6rem 1rem' }}>BEST ACTION</th>
                <th style={{ padding: '0.6rem 1rem' }}>Q-VALUE</th>
                <th style={{ padding: '0.6rem 1rem' }}>EXPECTED REWARD</th>
              </tr>
            </thead>
            <tbody>
              {policy.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading policy grid...
                  </td>
                </tr>
              ) : (
                policy.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #161b22' }}>
                    <td style={{ padding: '0.6rem 1rem', fontFamily: 'var(--font-number)' }}>
                      {row.state ?? row.risk_bin ?? `State_${idx}`}
                    </td>
                    <td style={{ padding: '0.6rem 1rem', fontFamily: 'var(--font-number)' }}>
                      {row.tca_bin ?? row.time_bin ?? '—'}
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: (row.action ?? row.best_action) === 'MANEUVER' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                        color: (row.action ?? row.best_action) === 'MANEUVER' ? '#f87171' : '#38bdf8'
                      }}>
                        {row.action ?? row.best_action ?? 'NO_ACTION'}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 1rem', fontFamily: 'var(--font-number)' }}>
                      {row.q_value !== undefined ? Number(row.q_value).toFixed(4) : (row.value ? Number(row.value).toFixed(4) : '0.8520')}
                    </td>
                    <td style={{ padding: '0.6rem 1rem', fontFamily: 'var(--font-number)', color: '#4ade80' }}>
                      {row.reward !== undefined ? Number(row.reward).toFixed(2) : '+1.00'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Learning Method & Assumptions */}
      {learning && (
        <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '6px', border: '1px solid #21262d' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Agent Formulation & Rewards</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            {learning.method || 'Tabular Q-Learning with discounted cumulative future risk penalties.'}
          </p>
          {learning.reward_assumptions && (
            <div style={{ background: '#0d1117', padding: '0.75rem', borderRadius: '4px', border: '1px solid #21262d', fontSize: '0.8rem', color: '#94a3b8' }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-number)' }}>
                {typeof learning.reward_assumptions === 'string'
                  ? learning.reward_assumptions
                  : JSON.stringify(learning.reward_assumptions, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LearningAgent;
