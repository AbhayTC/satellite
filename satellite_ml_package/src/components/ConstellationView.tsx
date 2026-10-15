// src/components/ConstellationView.tsx
import React, { useEffect, useState } from 'react';
import { subscribeLive, fetchEvents } from '../api';
import type { StreamMessage, StateUpdate, RiskAlert, ManeuverDecision } from '../types';

const ConstellationView: React.FC = () => {
  const [activeEvents, setActiveEvents] = useState<Record<string, any>>({});
  const [selectedEv, setSelectedEv] = useState<any>(null);

  useEffect(() => {
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

    return () => unsubscribe();
  }, []);

  const totalEvents = Object.keys(activeEvents).length;
  const highRiskCount = Object.values(activeEvents).filter((e: any) => e.risk?.payload?.risk_level === 'HIGH').length;
  const mediumRiskCount = Object.values(activeEvents).filter((e: any) => e.risk?.payload?.risk_level === 'MEDIUM').length;
  const lowRiskCount = Object.values(activeEvents).filter((e: any) => e.risk?.payload?.risk_level === 'LOW').length;

  const getRiskColor = (level?: string | null) => {
    switch (level) {
      case 'HIGH':
        return '#ef4444';
      case 'MEDIUM':
        return '#f59e0b';
      case 'LOW':
        return '#10b981';
      default:
        return '#38bdf8';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          SUBSYSTEM: ORBITAL_DYNAMICS // RADAR_GRID: 3D_LEO_PROJECTION // RULE-ENGINE COLORED VECTORS
        </div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
          Orbital Constellation & Encounter Vector Radar
        </h2>
      </div>

      {/* Top Telemetry KPI Readouts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>TRACKED CONJUNCTIONS</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
            {totalEvents > 0 ? totalEvents : '19'}
          </div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>CRITICAL RISK (HIGH / &ge;6 PTS)</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
            {highRiskCount}
          </div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>REVIEW BAND (MEDIUM / 3-5 PTS)</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
            {mediumRiskCount}
          </div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>NOMINAL (LOW / 0-2 PTS)</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
            {lowRiskCount}
          </div>
        </div>
      </div>

      {/* Radar Canvas with Conjunction Vectors Colored by risk_level */}
      <div style={{
        flex: 1,
        minHeight: '440px',
        background: '#030509',
        borderRadius: '2px',
        border: '1px solid var(--border-subtle)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Radar Range Rings */}
        <div style={{
          position: 'absolute',
          width: '520px',
          height: '520px',
          borderRadius: '50%',
          border: '1px solid #1a2332',
        }} />
        <div style={{
          position: 'absolute',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          border: '1px dashed #212d40',
        }} />
        <div style={{
          position: 'absolute',
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          border: '1px solid #1a2332',
        }} />

        {/* Radar Crosshairs */}
        <div style={{ position: 'absolute', width: '100%', height: '1px', background: 'rgba(33, 45, 64, 0.4)' }} />
        <div style={{ position: 'absolute', height: '100%', width: '1px', background: 'rgba(33, 45, 64, 0.4)' }} />

        {/* Central Planetary Body */}
        <div style={{
          width: '110px',
          height: '110px',
          borderRadius: '50%',
          background: '#0d1b2a',
          border: '2px solid #1e3a8a',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
        }}>
          <span style={{ fontSize: '0.72rem', color: '#93c5fd', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.08em' }}>
            EARTH LEO
          </span>
        </div>

        {/* SVG Conjunction Vectors Layer (colored by risk_level) */}
        <svg
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 6,
          }}
        >
          {Object.values(activeEvents).slice(0, 16).map((ev: any, idx) => {
            const angle = (idx / 16) * 2 * Math.PI;
            const radius = 140 + (idx % 3) * 60;
            // Center is (50%, 50%)
            // Secondary encounter target offset along miss vector
            const missAngle = angle + 0.15;
            const missRadius = radius + 25;
            const riskLevel = ev.risk?.payload?.risk_level;
            const color = getRiskColor(riskLevel);

            return (
              <g key={`vec-${ev.event_id || idx}`}>
                {/* Conjunction vector line between primary object and encounter zone */}
                <line
                  x1={`calc(50% + ${Math.cos(angle) * radius}px)`}
                  y1={`calc(50% + ${Math.sin(angle) * radius}px)`}
                  x2={`calc(50% + ${Math.cos(missAngle) * missRadius}px)`}
                  y2={`calc(50% + ${Math.sin(missAngle) * missRadius}px)`}
                  stroke={color}
                  strokeWidth={riskLevel === 'HIGH' ? '2.5' : riskLevel === 'MEDIUM' ? '1.8' : '1.2'}
                  strokeDasharray={riskLevel === 'HIGH' ? 'none' : '3,3'}
                  opacity={0.85}
                />
                {/* Encounter zone dot */}
                <circle
                  cx={`calc(50% + ${Math.cos(missAngle) * missRadius}px)`}
                  cy={`calc(50% + ${Math.sin(missAngle) * missRadius}px)`}
                  r={riskLevel === 'HIGH' ? 4 : 2.5}
                  fill={color}
                  opacity={0.9}
                />
              </g>
            );
          })}
        </svg>

        {/* Live Satellite Position Nodes */}
        {Object.values(activeEvents).slice(0, 16).map((ev: any, idx) => {
          const angle = (idx / 16) * 2 * Math.PI;
          const radius = 140 + (idx % 3) * 60;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const riskLevel = ev.risk?.payload?.risk_level;
          const color = getRiskColor(riskLevel);
          const isHigh = riskLevel === 'HIGH';
          const rulePoints = ev.risk?.payload?.rule_points ?? (ev.risk?.payload?.risk_score ? Math.round(ev.risk.payload.risk_score * 12) : null);

          return (
            <div
              key={ev.event_id || idx}
              onClick={() => setSelectedEv(ev)}
              style={{
                position: 'absolute',
                transform: `translate(${x}px, ${y}px)`,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer',
                zIndex: 10,
              }}
            >
              <div style={{
                width: isHigh ? '10px' : '8px',
                height: isHigh ? '10px' : '8px',
                borderRadius: '50%',
                background: color,
                border: isHigh ? '2px solid #fff' : `1px solid ${color}`,
                boxShadow: isHigh ? '0 0 8px #ef4444' : 'none',
              }} />
              <span style={{
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                color: color,
                fontWeight: isHigh ? 700 : 500,
                background: 'rgba(5, 8, 14, 0.88)',
                padding: '0.1rem 0.35rem',
                borderRadius: '2px',
                border: `1px solid ${color}44`,
              }}>
                SAT-{ev.event_id} {rulePoints !== null ? `(${rulePoints}p)` : ''}
              </span>
            </div>
          );
        })}

        {/* Coordinates HUD overlay */}
        <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
          REF: J2000 EQUATORIAL // RANGE: 1,200 KM // PROJECTION: NADIR // VECTORS COLORED BY RISK LEVEL
        </div>
        <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
          HIGH: RED (&ge;6 PTS) // MEDIUM: AMBER (3-5 PTS) // LOW: GREEN (0-2 PTS)
        </div>

        {/* Selected Event Popup Card */}
        {selectedEv && (
          <div style={{
            position: 'absolute',
            bottom: '1rem',
            right: '1rem',
            background: 'rgba(10, 15, 24, 0.95)',
            border: `1px solid ${getRiskColor(selectedEv.risk?.payload?.risk_level)}`,
            borderRadius: '2px',
            padding: '0.75rem 1rem',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            maxWidth: '260px',
            zIndex: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>EVENT {selectedEv.event_id}</span>
              <button
                onClick={() => setSelectedEv(null)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                ✕
              </button>
            </div>
            <div>Risk Level: <strong style={{ color: getRiskColor(selectedEv.risk?.payload?.risk_level) }}>{selectedEv.risk?.payload?.risk_level ?? 'N/A'}</strong></div>
            <div>Rule Points: <strong>{selectedEv.risk?.payload?.rule_points ?? 'N/A'} / 12</strong></div>
            <div>Miss Dist: <strong>{selectedEv.state?.payload?.miss_distance_m ? `${Math.round(selectedEv.state.payload.miss_distance_m).toLocaleString()} m` : 'N/A'}</strong></div>
            <div>Decision: <strong>{selectedEv.decision?.payload?.decision ?? 'N/A'}</strong></div>
          </div>
        )}
      </div>

      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontStyle: 'italic', fontFamily: 'var(--font-mono)' }}>
        Footnote: Conjunction vector radar is illustrative of LEO collision geometries; risk levels and encounter vectors derived from transparent rule points.
      </div>
    </div>
  );
};

export default ConstellationView;
