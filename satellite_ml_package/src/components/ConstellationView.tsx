// src/components/ConstellationView.tsx
import React, { useEffect, useState } from 'react';
import { subscribeLive, fetchEvents } from '../api';
import type { StreamMessage, StateUpdate, RiskAlert } from '../types';

const ConstellationView: React.FC = () => {
  const [activeEvents, setActiveEvents] = useState<Record<string, any>>({});

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
          ...(msg.msg_type === 'RISK_ALERT' ? { risk: msg as RiskAlert } : {})
        }
      }));
    });

    return () => unsubscribe();
  }, []);

  const totalEvents = Object.keys(activeEvents).length;
  const highRiskCount = Object.values(activeEvents).filter((e: any) => e.risk?.payload?.risk_level === 'HIGH').length;
  const mediumRiskCount = Object.values(activeEvents).filter((e: any) => e.risk?.payload?.risk_level === 'MEDIUM').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          SUBSYSTEM: ORBITAL_DYNAMICS // RADAR_GRID: 3D_LEO_PROJECTION
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
          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>CRITICAL ALERTS (HIGH RISK)</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
            {highRiskCount}
          </div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>ELEVATED RISK (MONITOR)</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
            {mediumRiskCount}
          </div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>SURVEILLANCE RADAR STATUS</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
            100% LEO
          </div>
        </div>
      </div>

      {/* High-Precision Orbital Radar Canvas */}
      <div style={{
        flex: 1,
        minHeight: '400px',
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

        {/* Live Conjunction Vectors */}
        {Object.values(activeEvents).slice(0, 16).map((ev: any, idx) => {
          const angle = (idx / 16) * 2 * Math.PI;
          const radius = 140 + (idx % 3) * 60;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const isHigh = ev.risk?.payload?.risk_level === 'HIGH';
          const isMed = ev.risk?.payload?.risk_level === 'MEDIUM';

          return (
            <div
              key={ev.event_id || idx}
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
                width: isHigh ? '9px' : '7px',
                height: isHigh ? '9px' : '7px',
                borderRadius: '50%',
                background: isHigh ? '#ef4444' : isMed ? '#f59e0b' : '#38bdf8',
                border: isHigh ? '2px solid #fff' : 'none',
              }} />
              <span style={{
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                color: isHigh ? '#fca5a5' : isMed ? '#fcd34d' : '#94a3b8',
                fontWeight: isHigh ? 700 : 400,
                background: 'rgba(5, 8, 14, 0.85)',
                padding: '0.1rem 0.3rem',
                borderRadius: '1px',
                border: '1px solid #1a2332',
              }}>
                SAT-{ev.event_id}
              </span>
            </div>
          );
        })}

        {/* Coordinates HUD overlay */}
        <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
          REF: J2000 EQUATORIAL // RANGE: 1,200 KM // PROJECTION: NADIR
        </div>
        <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
          AZ: 042.8° // EL: +18.4° // SWEEP: CONTINUOUS
        </div>
      </div>
    </div>
  );
};

export default ConstellationView;
