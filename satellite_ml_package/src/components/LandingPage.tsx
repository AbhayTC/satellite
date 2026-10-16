import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { fetchRules, fetchMetrics } from '../api';
import type { RulesData } from '../types';
import { IconSatellite, IconGlobe, IconTable, IconCalculator, IconCpu, IconChart } from './Icons';

// ── Animated Count-Up Number Hook ─────────────────────────────────────────────
const CountUp: React.FC<{ end: number; duration?: number; decimals?: number; suffix?: string; prefix?: string }> = ({
  end,
  duration = 1.4,
  decimals = 0,
  suffix = '',
  prefix = '',
}) => {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!inView) return;
    let startTime: number | null = null;
    let frameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * end);
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [inView, end, duration]);

  const formatted = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString();
  return (
    <span ref={ref} className="mono-num tabular-nums">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

// ── Section Reveal Wrapper ───────────────────────────────────────────────────
const SectionReveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({
  children,
  className = '',
  delay = 0,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ── Actual Verified Results Data (Fallback / Direct Source) ───────────────────
const VERIFIED_TEST_SET = [
  { decision: 'MANEUVER (Action Tier)', ruleCount: 183, rulePct: '8.4%', mlCount: 72, mlPct: '3.3%', meaning: 'Active burn planned or tracking refined' },
  { decision: 'MONITOR (Review Band)', ruleCount: 111, rulePct: '5.1%', mlCount: 68, mlPct: '3.1%', meaning: 'Elevated watch; laser route sent to ground' },
  { decision: 'NO_ACTION (Nominal Clearance)', ruleCount: 1873, rulePct: '86.4%', mlCount: 2027, mlPct: '93.5%', meaning: 'Safe pass; zero propellant expended' },
];

const VERIFIED_BENCHMARK_MODELS = [
  { name: 'Rule: Latest Risk Only', rocAuc: 0.975, prAuc: 0.444, precision90: 0.525, balAcc: 0.939, tp: 291, fn: 32 },
  { name: 'Logistic Regression', rocAuc: 0.948, prAuc: 0.327, precision90: 0.191, balAcc: 0.898, tp: 291, fn: 32 },
  { name: 'Random Forest (300 trees)', rocAuc: 0.981, prAuc: 0.796, precision90: 0.599, balAcc: 0.942, tp: 291, fn: 32 },
  { name: 'LightGBM (118 features)', rocAuc: 0.979, prAuc: 0.813, precision90: 0.598, balAcc: 0.942, tp: 291, fn: 32 },
  { name: 'LightGBM Lite (5 inputs, Calculator)', rocAuc: 0.982, prAuc: 0.807, precision90: 0.582, balAcc: 0.941, tp: 291, fn: 32 },
];

const VERIFIED_CV_TABLE = [
  { target_recall: 0.80, rule_points_threshold: 6, rule_recall: 0.929, rule_precision: 0.514, rule_missed: 23, rule_flagged: 584, latest_risk_only_precision: 0.527, ml_precision: 0.481 },
  { target_recall: 0.90, rule_points_threshold: 6, rule_recall: 0.929, rule_precision: 0.514, rule_missed: 23, rule_flagged: 584, latest_risk_only_precision: 0.527, ml_precision: 0.481 },
  { target_recall: 0.95, rule_points_threshold: 3, rule_recall: 0.944, rule_precision: 0.306, rule_missed: 18, rule_flagged: 996, latest_risk_only_precision: 0.421, ml_precision: 0.420 },
  { target_recall: 0.98, rule_points_threshold: 2, rule_recall: 0.978, rule_precision: 0.094, rule_missed: 7, rule_flagged: 3358, latest_risk_only_precision: 0.118, ml_precision: 0.092 },
];

const VERIFIED_TIERS = [
  { tier: 'Review (MONITOR)', threshold: '≥ 3 points', recall: 0.960, precision: 0.251, flagged: 1237, missed: 13, action: 'Elevated monitoring; route laser alert' },
  { tier: 'Action (MANEUVER)', threshold: '≥ 6 points', recall: 0.929, precision: 0.514, flagged: 584, missed: 23, action: 'Dijkstra burn plan or refine tracking' },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [rules, setRules] = useState<RulesData | null>(null);
  const [, setMetrics] = useState<any>(null);

  // Interactive Rule Engine Slider State (Initialized with realistic high-risk encounter)
  const [logPc, setLogPc] = useState<number>(-5.2);
  const [peakLogPc, setPeakLogPc] = useState<number>(-4.8);
  const [trendDelta, setTrendDelta] = useState<number>(0.6);

  useEffect(() => {
    fetchRules()
      .then((data) => setRules(data))
      .catch((err) => console.warn('Could not load rules.json on landing page:', err));

    fetchMetrics()
      .then((data) => setMetrics(data))
      .catch(() => {});
  }, []);

  // Compute Rule Engine Points from interactive sliders
  const levelFloor = rules?.params?.level_floor ?? -8.0;
  const levelStep = rules?.params?.level_step ?? 0.5;
  const levelMax = rules?.params?.level_max ?? 8;
  const peakThresh = rules?.params?.peak_threshold ?? -6.0;
  const peakBonusVal = rules?.params?.peak_bonus ?? 2;
  const trendUnit = rules?.params?.trend_unit ?? 0.3;
  const trendMax = rules?.params?.trend_max ?? 2;

  const levelPts = Math.min(levelMax, Math.max(0, Math.floor((logPc - levelFloor) / levelStep)));
  const peakPts = peakLogPc >= peakThresh ? peakBonusVal : 0;
  const trendPts = Math.min(trendMax, Math.max(0, Math.floor(trendDelta / trendUnit)));
  const totalPts = Math.min(12, levelPts + peakPts + trendPts);

  const reviewThresh = rules?.thresholds?.review ?? 3;
  const maneuverThresh = rules?.thresholds?.maneuver ?? 6;

  let demoDecision = 'NO_ACTION';
  let demoDecisionColor = '#10b981';
  if (totalPts >= maneuverThresh) {
    demoDecision = 'MANEUVER';
    demoDecisionColor = '#ef4444';
  } else if (totalPts >= reviewThresh) {
    demoDecision = 'MONITOR';
    demoDecisionColor = '#f59e0b';
  }

  const cvRows = rules?.cv_table && rules.cv_table.length > 0 ? rules.cv_table : VERIFIED_CV_TABLE;

  return (
    <div style={{ background: '#000000', color: '#ffffff', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      {/* Sleek Top Navigation Bar */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '52px',
          background: 'rgba(5, 5, 5, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <IconSatellite size={16} color="#ffffff" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.04em' }}>
            ESA CONJUNCTION ASSESSMENT
          </span>
          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', borderLeft: '1px solid #333', paddingLeft: '0.75rem' }}>
            SDO CHALLENGE BENCHMARK
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="#problem" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            THE PROBLEM
          </a>
          <a href="#rule-engine" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            RULE ENGINE
          </a>
          <a href="#dijkstra" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            DIJKSTRA
          </a>
          <a href="#actual-test" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            ACTUAL TEST SET
          </a>
          <a href="#results" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            BENCHMARKS
          </a>
          <button
            onClick={() => navigate('/constellation')}
            className="btn-primary"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.72rem' }}
          >
            ENTER CONSOLE &rarr;
          </button>
        </div>
      </header>

      {/* ── 1. HERO SECTION ──────────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '6rem 2rem 4rem 2rem',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: '960px', width: '100%' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0.65rem',
                background: '#0d0d0d',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '2px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.5rem',
              }}
            >
              <span className="live-beacon" />
              <span>TRANSPARENT 0–12 PTS RISK ENGINE // ESA SDO CHALLENGE BENCHMARK</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                lineHeight: 1.12,
                color: '#ffffff',
                marginBottom: '1.25rem',
              }}
            >
              Autonomous Satellite Collision Risk & Maneuver Architecture
            </h1>

            <p
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                color: 'var(--text-muted)',
                lineHeight: 1.55,
                maxWidth: '720px',
                margin: '0 auto 2.25rem auto',
              }}
            >
              A deterministic rule-based decision pipeline paired with minimum-cost Dijkstra trajectory planning and constellation alert routing for space debris conjunctions.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/constellation')}
                className="btn-primary"
                style={{ padding: '0.65rem 1.6rem', fontSize: '0.85rem' }}
              >
                ENTER MISSION CONSOLE &rarr;
              </button>
              <a
                href="#actual-test"
                className="btn-secondary"
                style={{ padding: '0.65rem 1.4rem', fontSize: '0.85rem', textDecoration: 'none' }}
              >
                VIEW TEST EVALUATION
              </a>
            </div>
          </motion.div>
        </div>

        {/* Scroll Cue */}
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', bottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', color: 'var(--text-dim)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}
        >
          <span>SCROLL TO BRIEFING</span>
          <span>↓</span>
        </motion.div>
      </section>

      {/* Main Story Container */}
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 2rem' }}>
        {/* ── 2. THE PROBLEM ─────────────────────────────────────────────────────── */}
        <section id="problem" style={{ padding: '6rem 0', borderTop: '1px solid var(--border-subtle)' }}>
          <SectionReveal>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '0.5rem', letterSpacing: '0.06em' }}>
              SECTION 01 // CRITICAL CONTEXT
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1.25rem' }}>
              The 97.3% Base-Rate Trap in Orbital Safety
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'center' }}>
              <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
                <p style={{ marginBottom: '1rem' }}>
                  In the ESA challenge dataset, only <strong style={{ color: '#ffffff' }}>323 of 11,942 scorable encounters (2.70%)</strong> end up high-risk (final CDM $\log_{10} P_c \ge -6.0$).
                </p>
                <p style={{ marginBottom: '1rem' }}>
                  Because true collisions are exceedingly rare, a trivial dummy model that always predicts <em>&ldquo;no action&rdquo;</em> achieves <strong style={{ color: '#ffffff' }}>97.3% accuracy</strong> while missing 100% of actual collisions.
                </p>
                <p>
                  <strong>Accuracy is therefore rejected as a headline metric.</strong> Safety is evaluated on verified recall, precision, PR-AUC, and balanced accuracy using only CDMs at least 2.0 days before closest approach (the decision-point rule).
                </p>
              </div>

              <div style={{ background: '#080808', border: '1px solid var(--border-default)', borderRadius: '2px', padding: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                  ACCURACY PARADOX METRIC
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '3rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>97.3%</span>
                  <span style={{ color: '#ef4444', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>[DUMMY MODEL ACCURACY]</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                  Always predicting safe yields high accuracy but misses 100% of high-risk conjunctions. Operational mission safety demands calibrated recall, transparent decision rationale, and bounded false alarms.
                </div>
              </div>
            </div>
          </SectionReveal>
        </section>

        {/* ── 3. THE VERIFIED DATA ──────────────────────────────────────────────── */}
        <section style={{ padding: '6rem 0', borderTop: '1px solid var(--border-subtle)' }}>
          <SectionReveal>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '0.5rem', letterSpacing: '0.06em' }}>
              SECTION 02 // VERIFIED DATASET
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '2rem' }}>
              Empirical Evidence from ESA SDO Challenge
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ background: '#0a0a0a', border: '1px solid var(--border-subtle)', borderRadius: '2px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TRAINING ENCOUNTERS</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ffffff', margin: '0.4rem 0' }}>
                  <CountUp end={13154} />
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>19 ESA & commercial missions</div>
              </div>

              <div style={{ background: '#0a0a0a', border: '1px solid var(--border-subtle)', borderRadius: '2px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TELEMETRY CDM ROWS</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ffffff', margin: '0.4rem 0' }}>
                  <CountUp end={162634} />
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Across 103 kinematic columns</div>
              </div>

              <div style={{ background: '#0a0a0a', border: '1px solid var(--border-subtle)', borderRadius: '2px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SCORABLE ENCOUNTERS</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ffffff', margin: '0.4rem 0' }}>
                  <CountUp end={11942} />
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>323 high-risk (2.70% true rate)</div>
              </div>

              <div style={{ background: '#0a0a0a', border: '1px solid var(--border-subtle)', borderRadius: '2px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TEST ENCOUNTERS</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ffffff', margin: '0.4rem 0' }}>
                  <CountUp end={2167} />
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Unseen challenge evaluation events</div>
              </div>
            </div>
          </SectionReveal>
        </section>

        {/* ── 4. THE RULE ENGINE WITH INTERACTIVE DEMO ───────────────────────────── */}
        <section id="rule-engine" style={{ padding: '6rem 0', borderTop: '1px solid var(--border-subtle)' }}>
          <SectionReveal>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '0.5rem', letterSpacing: '0.06em' }}>
              SECTION 03 // DETERMINISTIC AUTHORITY
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1.25rem' }}>
              Transparent Rule Engine (0–12 Points Scale)
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '820px', marginBottom: '2rem' }}>
              Rather than an opaque neural network making flight decisions, the primary authority is a transparent 12-point scoring system derived from 3 physics-informed rules. Calibrated operational thresholds trigger automated actions:
              <strong style={{ color: '#ffffff' }}> &ge;3 points &rarr; MONITOR</strong>, and <strong style={{ color: '#ffffff' }}> &ge;6 points &rarr; MANEUVER</strong>.
            </p>

            {/* Interactive Rule Engine Simulator */}
            <div style={{ background: '#080808', border: '1px solid var(--border-default)', borderRadius: '2px', padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  INTERACTIVE RULE ENGINE SIMULATOR
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  CALIBRATED THRESHOLDS: REVIEW ({reviewThresh} PTS) // ACTION ({maneuverThresh} PTS)
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Slider 1: Current Risk Level */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Rule 1: Current log10(Pc)</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{logPc.toFixed(2)} ({levelPts} pts)</span>
                  </div>
                  <input
                    type="range"
                    min={-8.0}
                    max={0.0}
                    step={0.1}
                    value={logPc}
                    onChange={(e) => setLogPc(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#ffffff' }}
                  />
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    1 pt per 0.5 decade above -8.0 (max 8 pts)
                  </div>
                </div>

                {/* Slider 2: Historical Peak */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Rule 2: Historical Peak log10(Pc)</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{peakLogPc.toFixed(2)} ({peakPts} pts)</span>
                  </div>
                  <input
                    type="range"
                    min={-8.0}
                    max={0.0}
                    step={0.1}
                    value={peakLogPc}
                    onChange={(e) => setPeakLogPc(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#ffffff' }}
                  />
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    Bonus of +2 pts if peak &ge; -6.0
                  </div>
                </div>

                {/* Slider 3: Probability Trend */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Rule 3: Trend Delta (&Delta;log10 Pc)</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{trendDelta.toFixed(2)} ({trendPts} pts)</span>
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={1.5}
                    step={0.05}
                    value={trendDelta}
                    onChange={(e) => setTrendDelta(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#ffffff' }}
                  />
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    +1 pt per 0.3 growth rate (max 2 pts)
                  </div>
                </div>
              </div>

              {/* Readout Output Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  background: '#0d0d0d',
                  borderRadius: '2px',
                  border: '1px solid var(--border-default)',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>CALCULATED RISK POINTS</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                    {totalPts} <span style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>/ 12</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>OPERATIONAL ACTION</div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '2px',
                        background: demoDecisionColor === '#ef4444' ? 'var(--risk-high-bg)' : demoDecisionColor === '#f59e0b' ? 'var(--risk-med-bg)' : 'var(--risk-low-bg)',
                        border: `1px solid ${demoDecisionColor}`,
                        color: demoDecisionColor,
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        marginTop: '0.2rem',
                      }}
                    >
                      {demoDecision}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </SectionReveal>
        </section>

        {/* ── 5. DIJKSTRA TWICE (ANIMATED SVG DIAGRAMS) ─────────────────────────── */}
        <section id="dijkstra" style={{ padding: '6rem 0', borderTop: '1px solid var(--border-subtle)' }}>
          <SectionReveal>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '0.5rem', letterSpacing: '0.06em' }}>
              SECTION 04 // DUAL DIJKSTRA GRAPHS
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1.25rem' }}>
              Dijkstra Used Twice: Trajectory & Alert Routing
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '820px', marginBottom: '2.5rem' }}>
              The system employs Dijkstra&apos;s shortest path algorithm across two distinct operational domains: first to plan minimum-cost avoidance maneuvers along the miss vector, and second to route critical alerts across the satellite constellation to ground stations with minimum latency.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {/* Diagram 1: Maneuver Planning */}
              <div style={{ background: '#080808', border: '1px solid var(--border-default)', borderRadius: '2px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>1. TIME-EXPANDED MANEUVER PLAN</span>
                  <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>SCHEMATIC & ILLUSTRATIVE</span>
                </div>

                <svg viewBox="0 0 400 200" style={{ width: '100%', height: 'auto', background: '#040404', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
                  {/* Grid Lines */}
                  <line x1="50" y1="20" x2="50" y2="170" stroke="#1f1f1f" strokeDasharray="3 3" />
                  <line x1="150" y1="20" x2="150" y2="170" stroke="#1f1f1f" strokeDasharray="3 3" />
                  <line x1="250" y1="20" x2="250" y2="170" stroke="#1f1f1f" strokeDasharray="3 3" />
                  <line x1="350" y1="20" x2="350" y2="170" stroke="#1f1f1f" strokeDasharray="3 3" />

                  {/* 2000m Keep-Out Distance Threshold */}
                  <line x1="20" y1="65" x2="380" y2="65" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
                  <text x="25" y="58" fill="#ef4444" fontSize="8" fontFamily="JetBrains Mono">KEEP-OUT DISTANCE (2,000 M)</text>

                  {/* Alternative candidate branches */}
                  <path d="M 50 140 Q 150 120 250 100 T 350 95" fill="none" stroke="#262626" strokeWidth="1.5" />
                  <path d="M 50 140 Q 150 145 250 140 T 350 135" fill="none" stroke="#262626" strokeWidth="1.5" />

                  {/* Animated Minimum-Cost Path */}
                  <motion.path
                    d="M 50 140 L 150 105 L 250 55 L 350 40"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.8, ease: 'easeInOut' }}
                  />

                  {/* Node Dots */}
                  <circle cx="50" cy="140" r="4" fill="#ffffff" />
                  <text x="40" y="160" fill="#888" fontSize="8" fontFamily="JetBrains Mono">T-72h</text>

                  <circle cx="150" cy="105" r="4" fill="#ffffff" />
                  <text x="140" y="160" fill="#888" fontSize="8" fontFamily="JetBrains Mono">T-48h</text>

                  <circle cx="250" cy="55" r="4" fill="#ffffff" />
                  <text x="240" y="160" fill="#888" fontSize="8" fontFamily="JetBrains Mono">T-24h</text>

                  <circle cx="350" cy="40" r="5" fill="#10b981" />
                  <text x="340" y="160" fill="#10b981" fontSize="8" fontFamily="JetBrains Mono">TCA</text>
                </svg>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.6rem', lineHeight: 1.45 }}>
                  Evaluated on 584 action-tier events: 235 burn needed, 349 already exceed 2,000 m (refine tracking first, no burn needed), 0 infeasible. Fuel proxy: median 1.16, max 1.89 (arbitrary units), median 2 burns.
                </div>
              </div>

              {/* Diagram 2: Alert Routing */}
              <div style={{ background: '#080808', border: '1px solid var(--border-default)', borderRadius: '2px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>2. CONSTELLATION ALERT ROUTING</span>
                  <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>SCHEMATIC & ILLUSTRATIVE</span>
                </div>

                <svg viewBox="0 0 400 200" style={{ width: '100%', height: 'auto', background: '#040404', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
                  {/* Passive inter-satellite laser links */}
                  <line x1="60" y1="60" x2="160" y2="40" stroke="#1f1f1f" strokeWidth="1" />
                  <line x1="60" y1="60" x2="120" y2="120" stroke="#1f1f1f" strokeWidth="1" />
                  <line x1="160" y1="40" x2="260" y2="60" stroke="#1f1f1f" strokeWidth="1" />
                  <line x1="120" y1="120" x2="220" y2="140" stroke="#1f1f1f" strokeWidth="1" />
                  <line x1="260" y1="60" x2="340" y2="130" stroke="#1f1f1f" strokeWidth="1" />
                  <line x1="220" y1="140" x2="340" y2="130" stroke="#1f1f1f" strokeWidth="1" />

                  {/* Animated Dijkstra Route: Sat 0 -> Sat 3 -> Sat 8 -> Ground 1 */}
                  <motion.path
                    d="M 60 60 L 160 40 L 260 60 L 340 130"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.8, ease: 'easeInOut' }}
                  />

                  {/* Satellite Nodes */}
                  <circle cx="60" cy="60" r="5" fill="#ef4444" />
                  <text x="35" y="48" fill="#fff" fontSize="8" fontFamily="JetBrains Mono">SAT-0 [INCIDENT]</text>

                  <circle cx="160" cy="40" r="4" fill="#ffffff" />
                  <text x="145" y="30" fill="#888" fontSize="8" fontFamily="JetBrains Mono">SAT-3</text>

                  <circle cx="260" cy="60" r="4" fill="#ffffff" />
                  <text x="245" y="50" fill="#888" fontSize="8" fontFamily="JetBrains Mono">SAT-8</text>

                  {/* Ground Station Node */}
                  <circle cx="340" cy="130" r="6" fill="#10b981" />
                  <text x="305" y="152" fill="#10b981" fontSize="8" fontFamily="JetBrains Mono">GROUND-1 [ESOC]</text>

                  <circle cx="120" cy="120" r="3" fill="#333" />
                  <circle cx="220" cy="140" r="3" fill="#333" />
                </svg>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.6rem', lineHeight: 1.45 }}>
                  Constellation crosslinks over one satellite orbit: reachable in 96 of 96 passes (100%), median latency 31.2 ms (max 70.8 ms), bypassing up to 24.8 minutes of blind delay waiting for a direct ground contact.
                </div>
              </div>
            </div>
          </SectionReveal>
        </section>

        {/* ── 6. ACTUAL TEST SET EVALUATION (NEW SECTION) ────────────────────────── */}
        <section id="actual-test" style={{ padding: '6rem 0', borderTop: '1px solid var(--border-subtle)' }}>
          <SectionReveal>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '0.5rem', letterSpacing: '0.06em' }}>
              SECTION 05 // ACTUAL TEST SET EVALUATION
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1rem' }}>
              Decisions on the 2,167 Unlabelled Test Encounters
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '820px', marginBottom: '2rem' }}>
              In the official ESA challenge, the <strong style={{ color: '#ffffff' }}>2,167 evaluation test events have no ground-truth labels</strong> (test accuracy cannot be measured).
              Below is the verified operational distribution of decisions generated by the Rule Engine versus the LightGBM benchmark model across all 2,167 test encounters:
            </p>

            {/* Test Set Distribution Table */}
            <div style={{ background: '#080808', border: '1px solid var(--border-default)', borderRadius: '2px', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em' }}>
                  ACTUAL TEST EVALUATION: RULE ENGINE VS LIGHTGBM BENCHMARK (N = 2,167 EVENTS)
                </span>
                <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  UNLABELLED TEST EVALUATION
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', textAlign: 'left' }} className="tabular-nums">
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-strong)', background: '#0d0d0d' }}>
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

            <div style={{ padding: '0.85rem 1rem', background: '#050505', borderLeft: '3px solid #ffffff', borderRadius: '2px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
              <strong>Honest Operational Analysis:</strong> The rule engine flags more events than LightGBM (294 vs 140) and shares 139 flagged events with the ML model. Without ground truth labels, neither model can be declared empirically superior on the test set. However, in spaceflight operations where collision costs are catastrophic and false reviews carry minimal cost, the rule engine provides a conservative, auditable safety envelope.
            </div>
          </SectionReveal>
        </section>

        {/* ── 7. BENCHMARK RESULTS TABLE (CROSS-VALIDATED) ────────────────────────── */}
        <section id="results" style={{ padding: '6rem 0', borderTop: '1px solid var(--border-subtle)' }}>
          <SectionReveal>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '0.5rem', letterSpacing: '0.06em' }}>
              SECTION 06 // EMPIRICAL BENCHMARKS (5-FOLD GROUPED CV)
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1rem' }}>
              Benchmark Classifiers & Cross-Validated Performance
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '820px', marginBottom: '2rem' }}>
              All performance metrics below derive from <strong>5-fold cross-validation grouped by mission</strong> on the 11,942 scorable training events (threshold set to 90% target recall):
            </p>

            {/* Benchmark Classifiers Table */}
            <div style={{ background: '#080808', border: '1px solid var(--border-default)', borderRadius: '2px', overflow: 'hidden', marginBottom: '2rem' }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  BASELINE MACHINE LEARNING CLASSIFIERS (THRESHOLD AT 90% RECALL)
                </span>
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                  STATUS: BENCHMARK ONLY
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textAlign: 'left' }} className="tabular-nums">
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: '#0d0d0d' }}>
                      <th style={{ padding: '0.6rem 0.8rem' }}>MODEL</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>ROC-AUC</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>PR-AUC</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>PRECISION @ 90% RECALL</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>BALANCED ACCURACY</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>DETECTIONS (TP / TOTAL POS)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {VERIFIED_BENCHMARK_MODELS.map((m, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600, color: m.name.includes('LightGBM') ? '#ffffff' : 'var(--text-secondary)' }}>
                          {m.name}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>{m.rocAuc.toFixed(3)}</td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>{m.prAuc.toFixed(3)}</td>
                        <td style={{ padding: '0.6rem 0.8rem', color: m.precision90 > 0.5 ? 'var(--risk-low)' : 'var(--risk-med)' }}>
                          {(m.precision90 * 100).toFixed(1)}%
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>{(m.balAcc * 100).toFixed(1)}%</td>
                        <td style={{ padding: '0.6rem 0.8rem', color: '#ffffff' }}>
                          {m.tp} / 323 <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>({m.fn} missed)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cross-Validated Comparison Table */}
            <div style={{ background: '#080808', border: '1px solid var(--border-default)', borderRadius: '2px', overflow: 'hidden', marginBottom: '2rem' }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  RULE-ENGINE VS ML AT THE SAME RECALL (5-FOLD CV)
                </span>
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                  LABEL: CROSS-VALIDATED
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textAlign: 'left' }} className="tabular-nums">
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: '#0d0d0d' }}>
                      <th style={{ padding: '0.6rem 0.8rem' }}>TARGET RECALL</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>RULE POINTS CUTOFF</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>RULE RECALL</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>RULE PRECISION</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>RULE MISSED</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>LATEST-RISK PREC</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>LIGHTGBM PREC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cvRows.map((row: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>{(row.target_recall * 100).toFixed(0)}%</td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>&ge; {row.rule_points_threshold} pts</td>
                        <td style={{ padding: '0.6rem 0.8rem', color: '#10b981' }}>{(row.rule_recall * 100).toFixed(1)}%</td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>{(row.rule_precision * 100).toFixed(1)}%</td>
                        <td style={{ padding: '0.6rem 0.8rem', color: row.rule_missed > 20 ? '#ef4444' : 'inherit' }}>{row.rule_missed}</td>
                        <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>{(row.latest_risk_only_precision * 100).toFixed(1)}%</td>
                        <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>{(row.ml_precision * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* In-Sample Calibrated Tiers Table */}
            <div style={{ background: '#080808', border: '1px solid var(--border-default)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  FINAL OPERATIONAL DECISION TIERS (IN-SAMPLE CALIBRATION ON 11,942 EVENTS)
                </span>
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                  STATUS: IN-SAMPLE
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textAlign: 'left' }} className="tabular-nums">
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: '#0d0d0d' }}>
                      <th style={{ padding: '0.6rem 0.8rem' }}>OPERATIONAL TIER</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>THRESHOLD</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>RECALL</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>PRECISION</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>FLAGGED</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>MISSED</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>MISSION ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {VERIFIED_TIERS.map((t, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600, color: t.tier.includes('Action') ? 'var(--risk-high)' : 'var(--risk-med)' }}>
                          {t.tier}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem', color: '#ffffff' }}>{t.threshold}</td>
                        <td style={{ padding: '0.6rem 0.8rem', color: '#10b981', fontWeight: 600 }}>{(t.recall * 100).toFixed(1)}%</td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>{(t.precision * 100).toFixed(1)}%</td>
                        <td style={{ padding: '0.6rem 0.8rem', color: '#ffffff' }}>{t.flagged.toLocaleString()}</td>
                        <td style={{ padding: '0.6rem 0.8rem', color: t.missed > 20 ? 'var(--risk-high)' : 'var(--text-secondary)' }}>{t.missed}</td>
                        <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>{t.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionReveal>
        </section>

        {/* ── 8. EXTENSION: LEARNING AGENT ───────────────────────────────────────── */}
        <section style={{ padding: '6rem 0', borderTop: '1px solid var(--border-subtle)' }}>
          <SectionReveal>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '0.5rem', letterSpacing: '0.06em' }}>
              SECTION 07 // RESEARCH EXTENSION
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1.25rem' }}>
              Extension: Contextual Bandit Learning Agent
            </h2>
            <div style={{ background: '#080808', border: '1px solid var(--border-default)', borderRadius: '2px', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                We evaluated an adaptive contextual bandit across 30 state contexts (10 risk bands &times; 3 trends) in a simulated MESA multi-satellite constellation.
                Under assumed heuristic utility rewards (maneuver cost: 2.0, benefit: 10.0; review cost: 0.3, benefit: 4.0; collision penalty: 20.0),
                <strong style={{ color: '#ffffff' }}> our fixed rule thresholds achieved higher mean reward (+0.211) than the learned agent (+0.133)</strong> on 4,755 held-out missions.
              </div>
              <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', borderLeft: '2px solid var(--border-strong)', paddingLeft: '0.75rem' }}>
                Footnote: The learning agent operates as an informational research extension only. Core collision avoidance authority remains strictly anchored to the certified rule engine.
              </div>
            </div>
          </SectionReveal>
        </section>

        {/* ── 9. HONEST LIMITATIONS & ENTER CONSOLE ──────────────────────────────── */}
        <section style={{ padding: '6rem 0', borderTop: '1px solid var(--border-subtle)' }}>
          <SectionReveal>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '0.5rem', letterSpacing: '0.06em' }}>
              SECTION 08 // TRANSPARENT AUDIT
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1.25rem' }}>
              Methodological Limitations & Constraints
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '3rem' }}>
              <li style={{ display: 'flex', gap: '0.65rem' }}>
                <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>[01]</span>
                <span><strong>No Real Test Labels:</strong> All performance figures are cross-validated on training events; the ESA challenge test set does not contain ground truth labels.</span>
              </li>
              <li style={{ display: 'flex', gap: '0.65rem' }}>
                <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>[02]</span>
                <span><strong>In-Sample Tier Thresholds:</strong> The two calibrated tier thresholds (3 and 6) are fitted on training events; only two scalar numbers are calibrated.</span>
              </li>
              <li style={{ display: 'flex', gap: '0.65rem' }}>
                <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>[03]</span>
                <span><strong>Schematic Cost Model:</strong> The maneuver planner models displacement along the miss vector with an assumed 2,000 m keep-out radius and arbitrary fuel units, not orbital perturbations.</span>
              </li>
              <li style={{ display: 'flex', gap: '0.65rem' }}>
                <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>[04]</span>
                <span><strong>Illustrative Alert Network:</strong> The 12-satellite / 3-ground station topology is illustrative for evaluating routing algorithm dynamics.</span>
              </li>
            </ul>

            {/* Final Enter Console Callout */}
            <div style={{ textAlign: 'center', background: '#0a0a0a', border: '1px solid var(--border-default)', borderRadius: '2px', padding: '3rem 2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem', color: '#fff' }}>
                Launch Mission Operations Console
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '540px', margin: '0 auto 1.75rem auto' }}>
                Access live radar monitoring, streaming conjunction telemetry, interactive risk calculators, and operational benchmark sweeps.
              </p>
              <button
                onClick={() => navigate('/constellation')}
                className="btn-primary"
                style={{ padding: '0.75rem 2rem', fontSize: '0.9rem' }}
              >
                ENTER MISSION CONSOLE &rarr;
              </button>
            </div>
          </SectionReveal>
        </section>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '2rem', textAlign: 'center', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
        EUROPEAN SPACE AGENCY (ESA) SPACE DEBRIS OFFICE // COLLISION AVOIDANCE BENCHMARK // MIT LICENSE
      </footer>
    </div>
  );
};

export default LandingPage;
