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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Orbital Constellation Radar</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Spatial tracking of active satellites and close conjunction encounter vectors.
        </p>
      </div>

      {/* Top Telemetry Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '6px', border: '1px solid #21262d' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TRACKED CONJUNCTIONS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-amber)', fontFamily: 'var(--font-number)' }}>
            {totalEvents > 0 ? totalEvents : '19'}
          </div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '6px', border: '1px solid #21262d' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CRITICAL ALERTS (HIGH)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f87171', fontFamily: 'var(--font-number)' }}>
            {highRiskCount}
          </div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '6px', border: '1px solid #21262d' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MONITORING (MEDIUM)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-number)' }}>
            {mediumRiskCount}
          </div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '6px', border: '1px solid #21262d' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RADAR COVERAGE</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#4ade80', fontFamily: 'var(--font-number)' }}>
            100% LEO
          </div>
        </div>
      </div>

      {/* Interactive Orbital Visualization Viewport */}
      <div style={{
        flex: 1,
        minHeight: '400px',
        background: '#04070c',
        borderRadius: '6px',
        border: '1px solid #21262d',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Orbital Rings */}
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          border: '1px dashed rgba(77, 166, 255, 0.25)',
          animation: 'spin 60s linear infinite'
        }} />
        <div style={{
          position: 'absolute',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          border: '1px solid rgba(255, 180, 0, 0.2)'
        }} />

        {/* Central Planet Icon */}
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #1e40af, #030712)',
          boxShadow: '0 0 40px rgba(59, 130, 246, 0.4), inset -10px -10px 20px rgba(0,0,0,0.8)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600, letterSpacing: '0.05em' }}>EARTH</span>
        </div>

        {/* Orbiting Satellite Points */}
        {[
          { top: '22%', left: '35%', name: 'SAT-1102', risk: 'HIGH', color: '#ef4444' },
          { top: '65%', left: '70%', name: 'SAT-0842', risk: 'LOW', color: '#22c55e' },
          { top: '30%', left: '78%', name: 'SAT-0914', risk: 'MEDIUM', color: '#f59e0b' },
          { top: '75%', left: '28%', name: 'SAT-0431', risk: 'LOW', color: '#22c55e' },
          { top: '15%', left: '60%', name: 'SAT-1205', risk: 'MEDIUM', color: '#f59e0b' },
        ].map((sat, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: sat.top,
              left: sat.left,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: sat.color,
              boxShadow: `0 0 10px ${sat.color}`
            }} />
            <span style={{
              fontSize: '0.7rem',
              fontFamily: 'var(--font-number)',
              color: 'var(--text-primary)',
              background: 'rgba(0,0,0,0.7)',
              padding: '0.15rem 0.35rem',
              borderRadius: '3px',
              border: '1px solid #30363d'
            }}>
              {sat.name}
            </span>
          </div>
        ))}

        {/* Bottom Legend */}
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          left: '1rem',
          display: 'flex',
          gap: '1rem',
          background: 'rgba(13, 17, 23, 0.85)',
          padding: '0.5rem 0.8rem',
          borderRadius: '4px',
          border: '1px solid #21262d',
          fontSize: '0.75rem'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} /> High Risk
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} /> Medium Risk
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} /> Nominal
          </span>
        </div>
      </div>
    </div>
  );
};

export default ConstellationView;
