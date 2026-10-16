import React, { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);

  const [health, setHealth] = useState<{ status: string; replay_running: boolean; ws_connections: number } | null>(null);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(2.0);

  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [faqOpen, setFaqOpen] = useState<boolean>(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>(new Date().toUTCString());

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
      window.dispatchEvent(new CustomEvent('pipeline-reset'));
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
    { to: '/constellation', label: 'ORBITAL RADAR', icon: <IconGlobe size={14} /> },
    { to: '/table', label: 'CONJUNCTION STREAM', icon: <IconTable size={14} /> },
    { to: '/performance', label: 'MODEL BENCHMARKS', icon: <IconChart size={14} /> },
    { to: '/calculator', label: 'RISK CALCULATOR', icon: <IconCalculator size={14} /> },
    { to: '/learning', label: 'EXTENSION: BANDIT AGENT', icon: <IconCpu size={14} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000000', color: 'var(--text-primary)', overflow: 'hidden' }}>
      {/* Accessible Skip Link */}
      <a href="#main-content" className="skip-link">
        SKIP NAVIGATION [JUMP TO DATA]
      </a>

      {/* Solid Functional Scroll Progress Bar */}
      <div className="scroll-progress-container">
        <div className="scroll-progress-fill" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* High-Precision Minimalist Operations Header */}
      <header
        className="print-hide"
        style={{
          height: '46px',
          background: '#050505',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.25rem',
          zIndex: 50,
          gap: '1rem',
        }}
      >
        {/* Console Identifier & Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-hamburger"
            style={{
              background: '#0d0d0d',
              border: '1px solid var(--border-subtle)',
              borderRadius: '2px',
              color: 'var(--text-primary)',
              padding: '0.25rem 0.5rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
            }}
          >
            MENU
          </button>

          <NavLink
            to="/"
            title="Return to Mission Briefing Overview"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: '#fff' }}
          >
            <IconSatellite size={15} color="#ffffff" />
            <span style={{ fontWeight: 600, fontSize: '0.82rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', color: '#ffffff' }}>
              ESA CONJUNCTION ASSESSMENT
            </span>
          </NavLink>

          <NavLink
            to="/"
            style={{
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              padding: '0.15rem 0.45rem',
              background: '#0d0d0d',
              border: '1px solid var(--border-subtle)',
              borderRadius: '2px',
            }}
          >
            BRIEFING &rarr;
          </NavLink>
        </div>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', maxWidth: '300px', width: '100%' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <IconSearch size={11} />
            </span>
            <input
              type="text"
              placeholder="SEARCH EVENT / OBJECT..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              style={{
                width: '100%',
                background: '#080808',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '0.28rem 0.5rem 0.28rem 1.6rem',
                borderRadius: '2px',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
            </input>
          </div>
        </form>

        {/* Live Timestamp & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Live UTC Clock & Beacon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} className="tabular-nums">
            <span className="live-beacon" />
            <span>{currentTime}</span>
          </div>

          {/* Reference Manual */}
          <button
            onClick={() => setFaqOpen(true)}
            title="Reference Manual"
            className="btn-secondary"
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.7rem' }}
          >
            <IconBook size={11} />
            <span>MANUAL</span>
          </button>

          {/* Print Audit Report */}
          <button
            onClick={() => window.print()}
            title="Generate Audit Log Printout"
            className="btn-secondary"
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.7rem' }}
          >
            <IconPrint size={11} />
            <span>AUDIT</span>
          </button>
        </div>
      </header>

      {/* Main Layout Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Minimalist Pure Black Sidebar */}
        <nav
          className="print-hide"
          style={{
            width: '220px',
            padding: '1rem 0.85rem',
            background: '#050505',
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            flexShrink: 0,
            overflowY: 'auto',
          }}
        >
          {/* Backend Status Box */}
          <div style={{ padding: '0.55rem 0.7rem', background: '#0a0a0a', borderRadius: '2px', border: '1px solid var(--border-subtle)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>FASTAPI:</span>
              <span style={{ color: health ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                {health ? '[ONLINE]' : '[OFFLINE]'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>CDM STREAM:</span>
              <span style={{ color: health?.replay_running ? '#ffffff' : 'var(--text-dim)', fontWeight: 600 }}>
                {health?.replay_running ? 'STREAMING' : 'STANDBY'}
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    padding: '0.5rem 0.7rem',
                    borderRadius: '2px',
                    color: isActive ? '#ffffff' : 'var(--text-muted)',
                    background: isActive ? '#141414' : 'transparent',
                    borderLeft: isActive ? '2px solid #ffffff' : '2px solid transparent',
                    textDecoration: 'none',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.12s ease',
                  })}
                >
                  <span style={{ display: 'flex', color: 'inherit' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Telemetry Stream Replay Controller */}
          <div style={{ marginTop: 'auto', padding: '0.75rem', background: '#0a0a0a', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
                TELEMETRY REPLAY
              </span>
              {loadingAction && <span className="radar-spinner" style={{ width: '10px', height: '10px' }} />}
            </div>

            <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.5rem' }}>
              <button
                onClick={handleStart}
                disabled={loadingAction || health?.replay_running}
                className="btn-primary"
                style={{ flex: 1, padding: '0.35rem 0.4rem', fontSize: '0.7rem' }}
                title="Start synthetic CDM playback"
              >
                <IconPlay size={8} />
                <span>START</span>
              </button>
              <button
                onClick={handleStop}
                disabled={loadingAction || !health?.replay_running}
                className="btn-secondary"
                style={{ flex: 1, padding: '0.35rem 0.4rem', fontSize: '0.7rem' }}
                title="Pause playback"
              >
                <IconPause size={8} />
                <span>PAUSE</span>
              </button>
              <button
                onClick={() => setConfirmResetOpen(true)}
                disabled={loadingAction}
                className="btn-secondary"
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem' }}
                title="Reset stream pipeline to step 1"
              >
                <IconReset size={9} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              <span>CLOCK RATE:</span>
              <select
                value={replaySpeed}
                onChange={(e) => setReplaySpeed(Number(e.target.value))}
                style={{
                  background: '#050505',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
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

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0, 0, 0, 0.9)', display: 'flex' }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              style={{ width: '240px', background: '#0e0e0e', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#fff' }}>
                  NAVIGATION
                </span>
                <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer' }}>✕</button>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
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
                        color: isActive ? '#ffffff' : 'var(--text-muted)',
                        background: isActive ? '#1a1a1a' : '#080808',
                        textDecoration: 'none',
                        fontSize: '0.78rem',
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

        {/* Main Content Viewport with Centered Container and Reserved Clearance */}
        <main
          id="main-content"
          ref={mainRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            padding: '1.25rem 1.75rem 4.5rem 1.75rem',
            overflowY: 'auto',
            background: 'transparent',
            position: 'relative',
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'contain',
            scrollBehavior: 'smooth',
          }}
        >
          <div className="console-container">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>

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

      {/* Docked Corner Operations Desk (Does NOT overlap content) */}
      <SupportDesk />

      {/* Privacy Consent Banner */}
      <CookieBanner />

      {/* Reference Manual Modal */}
      <FaqModal isOpen={faqOpen} onClose={() => setFaqOpen(false)} />

      {/* Reinitialization Modal */}
      <ConfirmModal
        isOpen={confirmResetOpen}
        title="REINITIALIZE STREAM PIPELINE"
        message="Resetting the stream will wipe in-memory telemetry buffers and reset synthetic CDM clock tracking to step 1. Confirm action?"
        confirmLabel="RESET"
        isDestructive={true}
        onConfirm={handleConfirmReset}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  );
};

export default App;
