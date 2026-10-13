// src/App.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { fetchHealth, startReplay, stopReplay, resetReplay } from './api';
import CookieBanner from './components/CookieBanner';
import SupportDesk from './components/SupportDesk';
import FaqModal from './components/FaqModal';
import ConfirmModal from './components/ConfirmModal';
import {
  IconSatellite,
  IconGlobe,
  IconTable,
  IconChart,
  IconCalculator,
  IconCpu,
  IconPlay,
  IconPause,
  IconReset,
  IconSearch,
  IconPrint,
  IconBook,
} from './components/Icons';

type ThemeMode = 'amber' | 'cyan' | 'emerald';

const App: React.FC = () => {
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement | null>(null);

  const [health, setHealth] = useState<{ status: string; replay_running: boolean; ws_connections: number } | null>(null);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(2.0);

  // Features state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('esa_hud_theme') as ThemeMode) || 'amber';
  });
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [faqOpen, setFaqOpen] = useState<boolean>(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>(new Date().toUTCString());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('esa_hud_theme', theme);
  }, [theme]);

  // Live UTC Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toUTCString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Scroll monitoring
  const handleScroll = () => {
    if (!mainRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = mainRef.current;
    const maxScroll = scrollHeight - clientHeight;
    const pct = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
    setScrollProgress(pct);
    setShowScrollTop(scrollTop > 180);
  };

  const scrollToTop = () => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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

  const handleConfirmReset = async () => {
    setConfirmResetOpen(false);
    setLoadingAction(true);
    try {
      await resetReplay('demo', replaySpeed);
      await checkHealth();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearch.trim()) return;
    navigate('/table');
  };

  const navItems = [
    { to: '/constellation', label: 'ORBITAL RADAR', icon: <IconGlobe size={15} /> },
    { to: '/table', label: 'CONJUNCTION STREAM', icon: <IconTable size={15} /> },
    { to: '/performance', label: 'MODEL BENCHMARKS', icon: <IconChart size={15} /> },
    { to: '/calculator', label: 'RISK CALCULATOR', icon: <IconCalculator size={15} /> },
    { to: '/learning', label: 'LEARNING AGENT', icon: <IconCpu size={15} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Accessible Skip Link */}
      <a href="#main-content" className="skip-link">
        SKIP NAVIGATION [JUMP TO DATA]
      </a>

      {/* Solid Functional Scroll Progress Bar (No Purple Gradient) */}
      <div className="scroll-progress-container">
        <div className="scroll-progress-fill" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* High-Precision Operations Header */}
      <header
        className="print-hide"
        style={{
          height: '48px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
          zIndex: 50,
          gap: '1rem',
        }}
      >
        {/* Console Identifier */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-hamburger"
            style={{
              background: '#101622',
              border: '1px solid var(--border-subtle)',
              borderRadius: '2px',
              color: 'var(--text-primary)',
              padding: '0.25rem 0.5rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
            }}
          >
            MENU
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconSatellite size={16} color="var(--accent-primary)" />
            <span style={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
              ESA CONJUNCTION ASSESSMENT CONSOLE
            </span>
          </div>
        </div>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', maxWidth: '320px', width: '100%' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <IconSearch size={12} />
            </span>
            <input
              type="text"
              placeholder="SEARCH EVENT_ID / SATELLITE..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              style={{
                width: '100%',
                background: '#090d14',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-primary)',
                padding: '0.3rem 0.5rem 0.3rem 1.7rem',
                borderRadius: '2px',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </div>
        </form>

        {/* Live Timestamp & Console Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Live UTC Clock & Telemetry Beacon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            <span className="live-beacon" />
            <span>{currentTime}</span>
          </div>

          {/* Palette Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: '#090d14', padding: '0.2rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setTheme('amber')}
              title="Tactical Amber Palette"
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '1px',
                background: '#ffb400',
                border: theme === 'amber' ? '2px solid #fff' : 'none',
                cursor: 'pointer',
              }}
            />
            <button
              onClick={() => setTheme('cyan')}
              title="Cyber Cyan Palette"
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '1px',
                background: '#00e5ff',
                border: theme === 'cyan' ? '2px solid #fff' : 'none',
                cursor: 'pointer',
              }}
            />
            <button
              onClick={() => setTheme('emerald')}
              title="Neon Emerald Palette"
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '1px',
                background: '#10b981',
                border: theme === 'emerald' ? '2px solid #fff' : 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          {/* FAQ / Manual */}
          <button
            onClick={() => setFaqOpen(true)}
            title="Reference Manual"
            style={{
              padding: '0.3rem 0.6rem',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              borderRadius: '2px',
              border: '1px solid var(--border-subtle)',
              background: '#121824',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <IconBook size={12} />
            <span>MANUAL</span>
          </button>

          {/* Print Audit Report */}
          <button
            onClick={() => window.print()}
            title="Generate Audit Log Printout"
            style={{
              padding: '0.3rem 0.6rem',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              borderRadius: '2px',
              border: '1px solid var(--border-subtle)',
              background: '#121824',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <IconPrint size={12} />
            <span>AUDIT REPORT</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar Navigation */}
        <nav
          className="print-hide"
          style={{
            width: '230px',
            padding: '1rem',
            background: 'var(--bg-surface)',
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            flexShrink: 0,
            overflowY: 'auto',
          }}
        >
          {/* Subsystem Heartbeat Box */}
          <div style={{ padding: '0.6rem 0.75rem', background: '#090d14', borderRadius: '2px', border: '1px solid var(--border-subtle)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>FASTAPI SERVER:</span>
              <span style={{ color: health ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                {health ? '[ONLINE]' : '[OFFLINE]'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>CDM STREAM:</span>
              <span style={{ color: health?.replay_running ? 'var(--accent-primary)' : 'var(--text-dim)', fontWeight: 600 }}>
                {health?.replay_running ? 'ACTIVE' : 'STANDBY'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '2px',
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    background: isActive ? '#141a26' : 'transparent',
                    borderLeft: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    textDecoration: 'none',
                    fontSize: '0.78rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: isActive ? 600 : 400,
                  })}
                >
                  <span style={{ display: 'flex', color: 'inherit' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Stream Controller */}
          <div style={{ marginTop: 'auto', padding: '0.75rem', background: '#090d14', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontWeight: 600 }}>
                TELEMETRY REPLAY
              </span>
              {loadingAction && <span className="radar-spinner" style={{ width: '10px', height: '10px' }} />}
            </div>

            <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.5rem' }}>
              <button
                onClick={handleStart}
                disabled={loadingAction || health?.replay_running}
                style={{
                  flex: 1,
                  padding: '0.4rem',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  borderRadius: '2px',
                  border: 'none',
                  background: health?.replay_running ? '#16222f' : '#10b981',
                  color: health?.replay_running ? '#64748b' : '#000',
                  cursor: health?.replay_running ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                }}
              >
                <IconPlay size={9} color={health?.replay_running ? '#64748b' : '#000'} />
                <span>START</span>
              </button>
              <button
                onClick={handleStop}
                disabled={loadingAction || !health?.replay_running}
                style={{
                  flex: 1,
                  padding: '0.4rem',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  borderRadius: '2px',
                  border: 'none',
                  background: health?.replay_running ? '#ef4444' : '#1c1518',
                  color: health?.replay_running ? '#fff' : '#64748b',
                  cursor: !health?.replay_running ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                }}
              >
                <IconPause size={9} color={health?.replay_running ? '#fff' : '#64748b'} />
                <span>PAUSE</span>
              </button>
              <button
                onClick={() => setConfirmResetOpen(true)}
                disabled={loadingAction}
                style={{
                  padding: '0.4rem 0.55rem',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  borderRadius: '2px',
                  border: '1px solid var(--border-strong)',
                  background: '#151b24',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Reset Replay Stream Buffer"
              >
                <IconReset size={10} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              <span>CLOCK RATE:</span>
              <select
                value={replaySpeed}
                onChange={(e) => setReplaySpeed(Number(e.target.value))}
                style={{
                  background: '#121824',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '2px',
                  padding: '0.15rem 0.35rem',
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                }}
              >
                <option value={0.5}>0.5X</option>
                <option value={1.0}>1.0X</option>
                <option value={2.0}>2.0X</option>
                <option value={5.0}>5.0X</option>
                <option value={10.0}>10.0X</option>
              </select>
            </div>
          </div>
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(0, 0, 0, 0.85)',
              display: 'flex',
            }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              style={{
                width: '240px',
                background: 'var(--bg-surface-elevated)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-primary)' }}>
                  NAVIGATION
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {navItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '2px',
                        color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        background: isActive ? '#141a26' : '#090d14',
                        textDecoration: 'none',
                        fontSize: '0.8rem',
                        fontFamily: 'var(--font-mono)',
                      })}
                    >
                      <span style={{ display: 'flex', color: 'inherit' }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Main Content Viewport */}
        <main
          id="main-content"
          ref={mainRef}
          onScroll={handleScroll}
          style={{ flex: 1, padding: '1.25rem', overflow: 'auto', background: 'var(--bg-primary)', position: 'relative' }}
        >
          <Outlet />

          {/* Floating Scroll to Top */}
          <button
            onClick={scrollToTop}
            className={`scroll-top-btn ${showScrollTop ? 'visible' : ''}`}
            title="Scroll to top"
          >
            ▲
          </button>
        </main>
      </div>

      {/* Flight Operations Desk */}
      <SupportDesk />

      {/* Local Storage Telemetry Consent Banner */}
      <CookieBanner />

      {/* Reference Manual FAQ Modal */}
      <FaqModal isOpen={faqOpen} onClose={() => setFaqOpen(false)} />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmResetOpen}
        title="REINITIALIZE STREAM PIPELINE"
        message="Resetting the stream will wipe in-memory telemetry buffers and reset synthetic CDM clock tracking to step 0. Confirm action?"
        confirmLabel="RESET"
        isDestructive={true}
        onConfirm={handleConfirmReset}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  );
};

export default App;
