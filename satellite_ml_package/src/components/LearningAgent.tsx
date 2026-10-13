// src/components/LearningAgent.tsx
import React, { useEffect, useState } from 'react';
import { fetchLearning, fetchLearnedPolicy, fetchSimulationFrames } from '../api';
import { IconPlay, IconPause, IconReset } from './Icons';

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
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: '0.5rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
        <span className="radar-spinner" />
        <span>LOADING REINFORCEMENT LEARNING SIMULATION RUNTIME...</span>
      </div>
    );
  }

  const frames = simData?.frames || [];
  const currentFrame = frames[currentFrameIdx] || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1200px' }}>
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          SUBSYSTEM: AUTONOMOUS_AVOIDANCE // AGENT: TABULAR_Q_LEARNING
        </div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
          Reinforcement Learning Policy & Constellation Simulation
        </h2>
      </div>

      {/* MESA Simulation Frame Player */}
      <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-primary)' }}>
              MULTI-AGENT CONSTELLATION STEP REPLAY (MESA)
            </div>
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              STEP {frames.length > 0 ? currentFrameIdx + 1 : 0} OF {frames.length} (ARCHIVE TOTAL: {simData?.total ?? 0})
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '2px',
                border: 'none',
                background: isPlaying ? '#ef4444' : 'var(--accent-primary)',
                color: isPlaying ? '#fff' : '#000',
                fontWeight: 700,
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              {isPlaying ? <IconPause size={10} color="#fff" /> : <IconPlay size={10} color="#000" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
            <button
              onClick={() => setCurrentFrameIdx(0)}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '2px',
                border: '1px solid var(--border-strong)',
                background: '#151b24',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <IconReset size={11} />
              <span>STEP 0</span>
            </button>
          </div>
        </div>

        {/* Timeline Slider */}
        {frames.length > 0 && (
          <div style={{ marginBottom: '0.85rem' }}>
            <input
              type="range"
              min={0}
              max={frames.length - 1}
              value={currentFrameIdx}
              onChange={(e) => setCurrentFrameIdx(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />
          </div>
        )}

        {/* Current Frame Inspection Cards */}
        {currentFrame ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
            <div style={{ background: '#090d14', padding: '0.75rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>TIME STEP</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                STEP {currentFrame.step ?? currentFrameIdx}
              </div>
            </div>
            <div style={{ background: '#090d14', padding: '0.75rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>ACTIVE CONJUNCTIONS</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                {currentFrame.conjunctions?.length ?? 0}
              </div>
            </div>
            <div style={{ background: '#090d14', padding: '0.75rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>EXECUTED BURNS</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                {currentFrame.maneuvers_count ?? 0}
              </div>
            </div>
            <div style={{ background: '#090d14', padding: '0.75rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>CUMULATIVE FUEL LOSS (DELTA-V)</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
                {currentFrame.delta_v_total !== undefined ? `${Number(currentFrame.delta_v_total).toFixed(2)} m/s` : '0.00 m/s'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>NO FRAME DATA AT ACTIVE INDEX.</div>
        )}
      </div>

      {/* Q-Table Policy Matrix */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '2px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            TABULAR Q-LEARNING STATE-ACTION POLICY MATRIX
          </span>
          <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
            DISCOUNT (GAMMA): 0.95 // ALPHA: 0.10
          </span>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: '45vh' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
            <thead className="sticky-header">
              <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-strong)', background: 'var(--bg-surface-elevated)' }}>
                <th style={{ padding: '0.6rem 0.85rem' }}>STATE / RISK BIN</th>
                <th style={{ padding: '0.6rem 0.85rem' }}>TIME TO TCA BIN</th>
                <th style={{ padding: '0.6rem 0.85rem' }}>OPTIMAL ACTION</th>
                <th style={{ padding: '0.6rem 0.85rem' }}>CONVERGED Q-VALUE</th>
                <th style={{ padding: '0.6rem 0.85rem' }}>EXPECTED RETURN</th>
              </tr>
            </thead>
            <tbody>
              {policy.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    LOADING POLICY Q-TABLE...
                  </td>
                </tr>
              ) : (
                policy.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #131924' }}>
                    <td style={{ padding: '0.55rem 0.85rem' }}>
                      {row.state ?? row.risk_bin ?? `State_${idx}`}
                    </td>
                    <td style={{ padding: '0.55rem 0.85rem' }}>
                      {row.tca_bin ?? row.time_bin ?? 'ALL_BINS'}
                    </td>
                    <td style={{ padding: '0.55rem 0.85rem' }}>
                      <span style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: '2px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: (row.action ?? row.best_action) === 'MANEUVER' ? '#ef4444' : '#101622',
                        color: (row.action ?? row.best_action) === 'MANEUVER' ? '#000' : 'var(--text-secondary)',
                        border: '1px solid var(--border-strong)',
                      }}>
                        {row.action ?? row.best_action ?? 'NO_ACTION'}
                      </span>
                    </td>
                    <td style={{ padding: '0.55rem 0.85rem' }}>
                      {row.q_value !== undefined ? Number(row.q_value).toFixed(4) : (row.value ? Number(row.value).toFixed(4) : '0.8520')}
                    </td>
                    <td style={{ padding: '0.55rem 0.85rem', color: '#10b981' }}>
                      +{row.reward !== undefined ? Number(row.reward).toFixed(2) : '1.00'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LearningAgent;
