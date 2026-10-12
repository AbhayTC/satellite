// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { fetchHealth, startReplay, stopReplay, resetReplay } from './api';

const App: React.FC = () => {
  const [health, setHealth] = useState<{ status: string; replay_running: boolean; ws_connections: number } | null>(null);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(2.0);

  const checkHealth = async () => {
    try {
      const h = await fetchHealth();
      setHealth(h);
    } catch {
      setHealth(null);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setLoadingAction(true);
    try {
      await startReplay('demo', replaySpeed);
      await checkHealth();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleStop = async () => {
    setLoadingAction(true);
    try {
      await stopReplay();
      await checkHealth();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReset = async () => {
    setLoadingAction(true);
    try {
      await resetReplay('demo', replaySpeed);
      await checkHealth();
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', color: 'var(--text-primary)', background: 'var(--bg-primary)' }}>
      {/* Sidebar Navigation */}
      <nav style={{ width: '230px', padding: '1.25rem 1rem', background: 'var(--bg-surface)', borderRight: '1px solid #1a1e24', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🛰️</span>
            <h2 style={{ fontSize: '1rem', color: 'var(--accent-amber)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>ESA Conjunction</h2>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mission Control Center</p>
        </div>

        {/* Backend Status Badge */}
        <div style={{ padding: '0.6rem 0.8rem', background: '#0d1117', borderRadius: '4px', border: '1px solid #21262d', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>BACKEND API:</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: health ? '#4ade80' : '#f87171',
              fontWeight: 600
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: health ? '#4ade80' : '#f87171' }} />
              {health ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span>REPLAY:</span>
            <span style={{ color: health?.replay_running ? '#38bdf8' : 'var(--text-muted)' }}>
              {health?.replay_running ? 'RUNNING' : 'IDLE'}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {[
            { to: '/constellation', label: 'Constellation 3D', icon: '🌐' },
            { to: '/table', label: 'Live Conjunctions', icon: '📋' },
            { to: '/performance', label: 'ML Performance', icon: '📊' },
            { to: '/calculator', label: 'Risk Calculator', icon: '🧮' },
            { to: '/learning', label: 'Learning Agent', icon: '🤖' },
          ].map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '4px',
                  color: isActive ? 'var(--accent-amber)' : 'var(--text-primary)',
                  background: isActive ? 'rgba(255, 180, 0, 0.1)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--accent-amber)' : '3px solid transparent',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.15s ease'
                })}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Global Pipeline Controls */}
        <div style={{ marginTop: 'auto', padding: '0.75rem', background: '#0d1117', borderRadius: '6px', border: '1px solid #21262d' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
            REPLAY PIPELINE
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.5rem' }}>
            <button
              onClick={handleStart}
              disabled={loadingAction || health?.replay_running}
              style={{
                flex: 1,
                padding: '0.4rem',
                fontSize: '0.75rem',
                borderRadius: '4px',
                border: 'none',
                background: health?.replay_running ? '#23303d' : '#22c55e',
                color: '#fff',
                cursor: health?.replay_running ? 'not-allowed' : 'pointer'
              }}
            >
              ▶ Play
            </button>
            <button
              onClick={handleStop}
              disabled={loadingAction || !health?.replay_running}
              style={{
                flex: 1,
                padding: '0.4rem',
                fontSize: '0.75rem',
                borderRadius: '4px',
                border: 'none',
                background: health?.replay_running ? '#ef4444' : '#2d1e22',
                color: '#fff',
                cursor: !health?.replay_running ? 'not-allowed' : 'pointer'
              }}
            >
              ⏸ Pause
            </button>
            <button
              onClick={handleReset}
              disabled={loadingAction}
              style={{
                padding: '0.4rem 0.6rem',
                fontSize: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #30363d',
                background: '#161b22',
                color: '#e6edf3',
                cursor: 'pointer'
              }}
            >
              ↺ Reset
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>Speed:</span>
            <select
              value={replaySpeed}
              onChange={(e) => setReplaySpeed(Number(e.target.value))}
              style={{
                background: '#161b22',
                color: '#c9d1d9',
                border: '1px solid #30363d',
                borderRadius: '3px',
                padding: '0.15rem 0.3rem',
                fontSize: '0.7rem'
              }}
            >
              <option value={0.5}>0.5x</option>
              <option value={1.0}>1.0x</option>
              <option value={2.0}>2.0x</option>
              <option value={5.0}>5.0x</option>
              <option value={10.0}>10.0x</option>
            </select>
          </div>
        </div>
      </nav>

      {/* Main Content Viewport */}
      <main style={{ flex: 1, padding: '1.5rem', overflow: 'auto', background: 'var(--bg-primary)' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default App;
