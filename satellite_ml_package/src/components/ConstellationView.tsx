// src/components/ConstellationView.tsx
import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { subscribeLive, fetchEvents } from '../api';
import type { StreamMessage, StateUpdate, RiskAlert, ManeuverDecision } from '../types';

// Animated CountUp for KPI Readouts
const KpiCountUp: React.FC<{ value: number }> = ({ value }) => {
  const [displayVal, setDisplayVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    const duration = 800; // ms
    let frameId: number;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayVal(Math.round(eased * value));
      if (progress < 1) frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [inView, value]);

  return <span ref={ref} className="tabular-nums mono-num">{inView ? displayVal : value}</span>;
};

const ConstellationView: React.FC = () => {
  const [activeEvents, setActiveEvents] = useState<Record<string, any>>({});
  const [selectedEv, setSelectedEv] = useState<any>(null);

  // Parallax Tilt State
  const radarRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!radarRef.current) return;
    const rect = radarRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    // Subtle tilt: max 4.5 degrees
    setTilt({ x: -(y * 9), y: x * 9 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  useEffect(() => {
    const handleReset = () => {
      setActiveEvents({});
      setSelectedEv(null);
    };
    window.addEventListener('pipeline-reset', handleReset);

    fetchEvents()
      .then((data) => {
        const m: Record<string, any> = {};
        data.forEach((d: any) => {
          m[String(d.event_id)] = d;
        });
        setActiveEvents(m);
      })
      .catch(() => {});

    const unsubscribe = subscribeLive((msg: StreamMessage) => {
      if ((msg as any).msg_type === 'PIPELINE_RESET') {
        handleReset();
        return;
      }
      const eid = String(msg.event_id);
      setActiveEvents((prev) => ({
        ...prev,
        [eid]: {
          ...prev[eid],
          event_id: eid,
          ...(msg.msg_type === 'STATE_UPDATE' ? { state: msg as StateUpdate } : {}),
          ...(msg.msg_type === 'RISK_ALERT' ? { risk: msg as RiskAlert } : {}),
          ...(msg.msg_type === 'MANEUVER_DECISION' ? { decision: msg as ManeuverDecision } : {}),
        },
      }));
    });

    return () => {
      window.removeEventListener('pipeline-reset', handleReset);
      unsubscribe();
    };
  }, []);

  const totalEvents = Object.keys(activeEvents).length;
  const highRiskCount = Object.values(activeEvents).filter((e: any) => e.risk?.payload?.risk_level === 'HIGH').length;
  const mediumRiskCount = Object.values(activeEvents).filter((e: any) => e.risk?.payload?.risk_level === 'MEDIUM').length;
  const lowRiskCount = Object.values(activeEvents).filter((e: any) => e.risk?.payload?.risk_level === 'LOW').length;

  const getRiskColor = (level?: string | null) => {
    switch (level) {
      case 'HIGH':
        return 'var(--risk-high)';
      case 'MEDIUM':
        return 'var(--risk-med)';
      case 'LOW':
        return 'var(--risk-low)';
      default:
        return 'var(--text-muted)';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* View Header */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem' }}>
        <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
          SUBSYSTEM: ORBITAL_DYNAMICS // RADAR: 2D/3D_LEO_PROJECTION // ACTIVE ORBITS: 3 LEO SHELLS + INCLINED PLANES
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', marginTop: '0.2rem' }}>
          Orbital Constellation & Encounter Vector Radar
        </h2>
      </div>

      {/* Top Telemetry KPI Readouts with CountUp */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
        <div style={{ background: '#0a0a0a', padding: '0.85rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>TRACKED CONJUNCTIONS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
            <KpiCountUp value={totalEvents} />
          </div>
        </div>

        <div style={{ background: '#0a0a0a', padding: '0.85rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>CRITICAL RISK (HIGH / &ge;6 PTS)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--risk-high)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
            <KpiCountUp value={highRiskCount} />
          </div>
        </div>

        <div style={{ background: '#0a0a0a', padding: '0.85rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>REVIEW BAND (MEDIUM / 3-5 PTS)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--risk-med)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
            <KpiCountUp value={mediumRiskCount} />
          </div>
        </div>

        <div style={{ background: '#0a0a0a', padding: '0.85rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>NOMINAL (LOW / 0-2 PTS)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--risk-low)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
            <KpiCountUp value={lowRiskCount} />
          </div>
        </div>
      </div>

      {/* Radar Canvas with True Visible Orbits, 3D Inclined Planes, and Parallax */}
      <div
        ref={radarRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'relative',
          height: '520px',
          background: '#040404',
          borderRadius: '2px',
          border: '1px solid var(--border-default)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: 1000,
        }}
      >
        {/* Parallax Container */}
        <motion.div
          animate={{ rotateX: tilt.x, rotateY: tilt.y }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* True Orbital Canvas Layer: 3 Concentric Shells + 3 Inclined Planes + Labels */}
          <svg
            viewBox="-260 -260 520 520"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 4,
            }}
          >
            <defs>
              <radialGradient id="earthGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#0c1e38" />
                <stop offset="60%" stopColor="#050d18" />
                <stop offset="100%" stopColor="#000205" />
              </radialGradient>
              <radialGradient id="orbitGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(56, 189, 248, 0.08)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>

            {/* Crosshair Cardinal Coordinate Guides */}
            <line x1="-260" y1="0" x2="260" y2="0" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
            <line x1="0" y1="-260" x2="0" y2="260" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />

            {/* ── 3D Inclined Orbital Plane Tracks (Ellipses around Earth) ──────────── */}
            {/* Plane 1: Inclined ISS/Starlink 53° */}
            <ellipse
              cx="0"
              cy="0"
              rx="180"
              ry="65"
              transform="rotate(-28)"
              fill="none"
              stroke="rgba(255, 255, 255, 0.16)"
              strokeWidth="1.2"
              strokeDasharray="6,5"
            />
            {/* Plane 2: Sun-Synchronous Orbit (SSO 98°) */}
            <ellipse
              cx="0"
              cy="0"
              rx="180"
              ry="65"
              transform="rotate(42)"
              fill="none"
              stroke="rgba(255, 255, 255, 0.13)"
              strokeWidth="1.2"
              strokeDasharray="6,5"
            />
            {/* Plane 3: Polar Orbit (86°) */}
            <ellipse
              cx="0"
              cy="0"
              rx="165"
              ry="50"
              transform="rotate(84)"
              fill="none"
              stroke="rgba(255, 255, 255, 0.10)"
              strokeWidth="1.2"
              strokeDasharray="4,4"
            />

            {/* ── The 3 Satellite Constellation Orbital Shells ─────────────────────── */}
            {/* ORBIT SHELL 1 (Inner LEO - ISS/Constellation 520 km, r=100) */}
            <circle
              cx="0"
              cy="0"
              r="100"
              fill="none"
              stroke="rgba(255, 255, 255, 0.28)"
              strokeWidth="1.5"
              strokeDasharray="6,4"
            />
            {/* Direction arrows on Orbit 1 */}
            <polygon points="-3,-100 3,-97 3,-103" fill="rgba(255, 255, 255, 0.65)" />
            <polygon points="3,100 -3,97 -3,103" fill="rgba(255, 255, 255, 0.65)" />
            {/* Orbit 1 Label */}
            <text x="6" y="-103" fill="rgba(255, 255, 255, 0.7)" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="0.04em">
              ORBIT 1 // LEO 520 km (i=53.0°)
            </text>

            {/* ORBIT SHELL 2 (Mid LEO - SSO 780 km, r=145) */}
            <circle
              cx="0"
              cy="0"
              r="145"
              fill="none"
              stroke="rgba(255, 255, 255, 0.24)"
              strokeWidth="1.5"
              strokeDasharray="8,5"
            />
            {/* Direction arrows on Orbit 2 */}
            <polygon points="-145,-3 -148,3 -142,3" fill="rgba(255, 255, 255, 0.55)" />
            <polygon points="145,3 148,-3 142,-3" fill="rgba(255, 255, 255, 0.55)" />
            {/* Orbit 2 Label */}
            <text x="6" y="-148" fill="rgba(255, 255, 255, 0.6)" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="0.04em">
              ORBIT 2 // LEO 780 km (SSO 97.5°)
            </text>

            {/* ORBIT SHELL 3 (Outer LEO - Polar 1,050 km, r=190) */}
            <circle
              cx="0"
              cy="0"
              r="190"
              fill="none"
              stroke="rgba(255, 255, 255, 0.20)"
              strokeWidth="1.5"
              strokeDasharray="10,6"
            />
            {/* Direction arrows on Orbit 3 */}
            <polygon points="-3,-190 3,-187 3,-193" fill="rgba(255, 255, 255, 0.5)" />
            <polygon points="3,190 -3,187 -3,193" fill="rgba(255, 255, 255, 0.5)" />
            {/* Orbit 3 Label */}
            <text x="6" y="-193" fill="rgba(255, 255, 255, 0.5)" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="0.04em">
              ORBIT 3 // LEO 1,050 km (POLAR 86.4°)
            </text>

            {/* Outer Geodesic Boundary */}
            <circle cx="0" cy="0" r="230" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="3,3" />

            {/* ── Satellite Orbital Motion Trails ──────────────────────────────────── */}
            {Object.values(activeEvents).slice(0, 16).map((ev: any, idx) => {
              const angle = (idx / 16) * 2 * Math.PI;
              const radius = 100 + (idx % 3) * 45;
              const trailAngle = angle - 0.22; // Trail arc behind satellite

              // SVG arc path from trailAngle to angle
              const x1 = Math.cos(trailAngle) * radius;
              const y1 = Math.sin(trailAngle) * radius;
              const x2 = Math.cos(angle) * radius;
              const y2 = Math.sin(angle) * radius;

              const isHigh = ev.risk?.payload?.risk_level === 'HIGH';
              const trailColor = isHigh ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.25)';

              return (
                <path
                  key={`trail-${ev.event_id || idx}`}
                  d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
                  fill="none"
                  stroke={trailColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              );
            })}

            {/* ── Central Earth Globe with Atmospheric Limb Glow & Graticules ──────── */}
            {/* Outer atmospheric aura */}
            <circle cx="0" cy="0" r="54" fill="none" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="6" />
            <circle cx="0" cy="0" r="48" fill="none" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="3" />
            {/* Main Earth Body */}
            <circle cx="0" cy="0" r="44" fill="url(#earthGrad)" stroke="rgba(56, 189, 248, 0.65)" strokeWidth="1.5" />
            {/* Graticule Latitude & Longitude */}
            <ellipse cx="0" cy="0" rx="44" ry="18" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="0.8" />
            <ellipse cx="0" cy="0" rx="18" ry="44" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="0.8" />
            <line x1="-44" y1="0" x2="44" y2="0" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="0.8" />
            {/* Earth Center Typography */}
            <text x="0" y="-3" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="700" fontFamily="var(--font-mono)" letterSpacing="0.08em">
              EARTH
            </text>
            <text x="0" y="10" textAnchor="middle" fill="rgba(255, 255, 255, 0.65)" fontSize="6.5" fontFamily="var(--font-mono)" letterSpacing="0.04em">
              R = 6,371 km
            </text>
          </svg>

          {/* Empty Reinitialization Status Overlay */}
          {totalEvents === 0 && (
            <div
              style={{
                position: 'absolute',
                zIndex: 10,
                bottom: '1.25rem',
                background: 'rgba(10, 10, 10, 0.92)',
                border: '1px dashed var(--border-strong)',
                padding: '0.4rem 0.8rem',
                borderRadius: '2px',
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span className="live-beacon" />
              <span>STREAM BUFFER REINITIALIZED // INGESTING CDM STEP 1...</span>
            </div>
          )}

          {/* SVG Encounter Miss-Distance Vectors Layer */}
          <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 6 }}>
            {Object.values(activeEvents).slice(0, 16).map((ev: any, idx) => {
              const angle = (idx / 16) * 2 * Math.PI;
              const radius = 100 + (idx % 3) * 45; // Safe bounded radii: 100px, 145px, 190px
              const missAngle = angle + 0.14;
              const missRadius = radius + 22;
              const riskLevel = ev.risk?.payload?.risk_level;
              const color = getRiskColor(riskLevel);

              return (
                <g key={`vec-${ev.event_id || idx}`}>
                  <line
                    x1={`calc(50% + ${Math.cos(angle) * radius}px)`}
                    y1={`calc(50% + ${Math.sin(angle) * radius}px)`}
                    x2={`calc(50% + ${Math.cos(missAngle) * missRadius}px)`}
                    y2={`calc(50% + ${Math.sin(missAngle) * missRadius}px)`}
                    stroke={color}
                    strokeWidth={riskLevel === 'HIGH' ? '2.0' : '1.2'}
                    strokeDasharray={riskLevel === 'HIGH' ? 'none' : '3,3'}
                    opacity={0.85}
                  />
                  <circle
                    cx={`calc(50% + ${Math.cos(missAngle) * missRadius}px)`}
                    cy={`calc(50% + ${Math.sin(missAngle) * missRadius}px)`}
                    r={riskLevel === 'HIGH' ? 3.5 : 2}
                    fill={color}
                    opacity={0.9}
                  />
                </g>
              );
            })}
          </svg>

          {/* Satellite Nodes with Collision-Free Label Offsets */}
          {Object.values(activeEvents).slice(0, 16).map((ev: any, idx) => {
            const angle = (idx / 16) * 2 * Math.PI;
            const radius = 100 + (idx % 3) * 45;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const riskLevel = ev.risk?.payload?.risk_level;
            const color = getRiskColor(riskLevel);
            const isHigh = riskLevel === 'HIGH';
            const rulePoints = ev.risk?.payload?.rule_points ?? (ev.risk?.payload?.risk_score ? Math.round(ev.risk.payload.risk_score * 12) : null);

            // Label offset calculation to avoid clipping top or caption overlap
            const isTop = y < -110;
            const isBottom = y > 110;
            const isLeft = x < -100;

            let labelTransform = 'translate(10px, -50%)';
            if (isTop) {
              labelTransform = 'translate(-50%, 12px)';
            } else if (isBottom) {
              labelTransform = 'translate(-50%, -24px)';
            } else if (isLeft) {
              labelTransform = 'translate(-105%, -50%)';
            }

            return (
              <div
                key={ev.event_id || idx}
                onClick={() => setSelectedEv(ev)}
                style={{
                  position: 'absolute',
                  transform: `translate(${x}px, ${y}px)`,
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  zIndex: isHigh ? 20 : 10,
                }}
              >
                {/* Node Beacon Dot */}
                <div
                  className={isHigh ? 'risk-badge-high' : ''}
                  style={{
                    width: isHigh ? '10px' : '7px',
                    height: isHigh ? '10px' : '7px',
                    borderRadius: '50%',
                    background: color,
                    border: `1px solid ${isHigh ? '#fff' : color}`,
                    cursor: 'pointer',
                  }}
                />

                {/* Satellite Identifier Tag */}
                <span
                  style={{
                    position: 'absolute',
                    transform: labelTransform,
                    whiteSpace: 'nowrap',
                    fontSize: '0.65rem',
                    fontFamily: 'var(--font-mono)',
                    color: isHigh ? '#ffffff' : 'var(--text-secondary)',
                    background: 'rgba(5, 5, 5, 0.9)',
                    padding: '0.12rem 0.38rem',
                    borderRadius: '2px',
                    border: `1px solid ${isHigh ? 'var(--risk-high-border)' : 'var(--border-subtle)'}`,
                    pointerEvents: 'none',
                  }}
                >
                  SAT-{ev.event_id}
                  {rulePoints !== null && (
                    <span style={{ color, marginLeft: '0.25rem', fontWeight: 600 }}>({rulePoints}p)</span>
                  )}
                </span>
              </div>
            );
          })}
        </motion.div>

        {/* Top-Left Orbit Legend Badge */}
        <div
          style={{
            position: 'absolute',
            top: '0.65rem',
            left: '1rem',
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            background: 'rgba(0, 0, 0, 0.75)',
            padding: '0.2rem 0.5rem',
            borderRadius: '2px',
            border: '1px solid var(--border-subtle)',
            pointerEvents: 'none',
          }}
        >
          ORBITAL PLANES: 3 LEO SHELLS + INCLINED SSO / POLAR
        </div>

        {/* Bottom Legend and Info Bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '0.65rem',
            left: '1rem',
            right: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-dim)',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            paddingTop: '0.45rem',
            pointerEvents: 'none',
          }}
        >
          <span>REF: J2000 EQUATORIAL // PROJECTION: NADIR // VECTORS: RULE-ENGINE ENCOUNTERS</span>
          <span>HIGH: &ge;6 PTS (RED) // MEDIUM: 3-5 PTS (AMBER) // LOW: 0-2 PTS (GREEN)</span>
        </div>
      </div>

      {/* Selected Satellite Inspection Modal Drawer */}
      {selectedEv && (
        <div
          style={{
            background: '#0a0a0a',
            border: '1px solid var(--border-default)',
            borderRadius: '2px',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: getRiskColor(selectedEv.risk?.payload?.risk_level),
                }}
              />
              <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#fff' }}>
                EVENT {selectedEv.event_id} TELEMETRY INSPECTION
              </span>
            </div>
            <button
              onClick={() => setSelectedEv(null)}
              className="btn-secondary"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
            >
              CLOSE ✕
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }} className="tabular-nums">
            <div style={{ background: '#050505', padding: '0.5rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-muted)' }}>RULE POINTS</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '0.2rem' }}>
                {selectedEv.risk?.payload?.rule_points ?? 'N/A'} <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>/ 12</span>
              </div>
            </div>

            <div style={{ background: '#050505', padding: '0.5rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-muted)' }}>DECISION</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: getRiskColor(selectedEv.risk?.payload?.risk_level), marginTop: '0.2rem' }}>
                {selectedEv.decision?.payload?.decision ?? 'MONITORING'}
              </div>
            </div>

            <div style={{ background: '#050505', padding: '0.5rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-muted)' }}>TIME TO TCA</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginTop: '0.2rem' }}>
                {selectedEv.state?.payload?.time_to_tca_hours ? `${selectedEv.state.payload.time_to_tca_hours.toFixed(1)} hrs` : 'N/A'}
              </div>
            </div>

            <div style={{ background: '#050505', padding: '0.5rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-muted)' }}>MISS DISTANCE</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginTop: '0.2rem' }}>
                {selectedEv.state?.payload?.miss_distance_m ? `${Math.round(selectedEv.state.payload.miss_distance_m).toLocaleString()} m` : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConstellationView;
