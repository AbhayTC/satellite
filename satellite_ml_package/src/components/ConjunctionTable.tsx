// src/components/ConjunctionTable.tsx
import React, { useEffect, useState } from 'react';
import { subscribeLive, fetchEvents } from '../api';
import type { StreamMessage, StateUpdate, RiskAlert, ManeuverDecision } from '../types';

interface EventRow {
  event_id: string;
  step?: number;
  n_steps?: number;
  time_to_tca_hours?: number;
  miss_distance_m?: number;
  collision_probability?: number;
  log10_pc?: number;
  risk_score?: number | null;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  phase?: string;
  decision?: string;
  lastUpdated?: string;
}

const ConjunctionTable: React.FC = () => {
  const [events, setEvents] = useState<Record<string, EventRow>>({});
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Initial load from REST endpoint
  useEffect(() => {
    fetchEvents()
      .then((data) => {
        const initialMap: Record<string, EventRow> = {};
        data.forEach((item: any) => {
          const eid = String(item.event_id);
          initialMap[eid] = {
            event_id: eid,
            step: item.state?.payload?.step,
            n_steps: item.state?.payload?.n_steps,
            time_to_tca_hours: item.state?.payload?.time_to_tca_hours,
            miss_distance_m: item.state?.payload?.miss_distance_m,
            collision_probability: item.state?.payload?.collision_probability,
            log10_pc: item.state?.payload?.log10_pc,
            risk_score: item.risk?.payload?.risk_score,
            risk_level: item.risk?.payload?.risk_level,
            phase: item.risk?.payload?.phase || item.decision?.payload?.phase,
            decision: item.decision?.payload?.decision,
            lastUpdated: item.state?.emitted_at || item.risk?.emitted_at
          };
        });
        setEvents(initialMap);
      })
      .catch((err) => console.warn('Could not fetch initial events:', err));
  }, []);

  // Real-time WebSocket streaming updates
  useEffect(() => {
    const unsubscribe = subscribeLive((msg: StreamMessage) => {
      const eid = String(msg.event_id);
      setEvents((prev) => {
        const existing = prev[eid] || { event_id: eid };
        const updated: EventRow = { ...existing, lastUpdated: msg.emitted_at };

        if (msg.msg_type === 'STATE_UPDATE') {
          const s = msg as StateUpdate;
          updated.step = s.payload.step;
          updated.n_steps = s.payload.n_steps;
          updated.time_to_tca_hours = s.payload.time_to_tca_hours;
          updated.miss_distance_m = s.payload.miss_distance_m;
          updated.collision_probability = s.payload.collision_probability;
          updated.log10_pc = s.payload.log10_pc;
        } else if (msg.msg_type === 'RISK_ALERT') {
          const r = msg as RiskAlert;
          updated.risk_score = r.payload.risk_score;
          updated.risk_level = r.payload.risk_level;
          updated.phase = r.payload.phase;
        } else if (msg.msg_type === 'MANEUVER_DECISION') {
          const d = msg as ManeuverDecision;
          updated.decision = d.payload.decision;
          updated.phase = d.payload.phase;
        }

        return { ...prev, [eid]: updated };
      });
    });

    return () => unsubscribe();
  }, []);

  const rows = Object.values(events).filter((ev) => {
    if (filterLevel !== 'ALL' && ev.risk_level !== filterLevel) return false;
    if (searchTerm && !ev.event_id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Sort by risk score (descending)
  rows.sort((a, b) => (b.risk_score ?? -1) - (a.risk_score ?? -1));

  const getRiskBadge = (level?: string | null) => {
    switch (level) {
      case 'HIGH':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontWeight: 600 }}>HIGH</span>;
      case 'MEDIUM':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontWeight: 600 }}>MEDIUM</span>;
      case 'LOW':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', fontWeight: 600 }}>LOW</span>;
      default:
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8' }}>PENDING</span>;
    }
  };

  const getDecisionBadge = (decision?: string) => {
    switch (decision) {
      case 'MANEUVER':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#dc2626', color: '#fff', fontWeight: 700 }}>MANEUVER</span>;
      case 'MONITOR':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#d97706', color: '#fff', fontWeight: 600 }}>MONITOR</span>;
      case 'NO_ACTION':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#1e293b', color: '#94a3b8' }}>NO ACTION</span>;
      default:
        return <span style={{ color: 'var(--text-muted)' }}>—</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Live Conjunction Events</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Streaming real-time Collision Data Messages (CDMs) and agent risk decisions.
          </p>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search Event ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid #30363d',
              color: 'var(--text-primary)',
              padding: '0.45rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.85rem'
            }}
          />
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid #30363d',
              color: 'var(--text-primary)',
              padding: '0.45rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.85rem'
            }}
          >
            <option value="ALL">All Risk Levels</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid #21262d', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#0d1117', borderBottom: '1px solid #21262d', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.75rem 1rem' }}>EVENT ID</th>
              <th style={{ padding: '0.75rem 1rem' }}>STEP</th>
              <th style={{ padding: '0.75rem 1rem' }}>TIME TO TCA</th>
              <th style={{ padding: '0.75rem 1rem' }}>MISS DISTANCE</th>
              <th style={{ padding: '0.75rem 1rem' }}>LOG10(Pc)</th>
              <th style={{ padding: '0.75rem 1rem' }}>RISK SCORE</th>
              <th style={{ padding: '0.75rem 1rem' }}>RISK LEVEL</th>
              <th style={{ padding: '0.75rem 1rem' }}>PHASE</th>
              <th style={{ padding: '0.75rem 1rem' }}>DECISION</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No active events yet. Click <strong>▶ Play</strong> in the left sidebar to start replaying CDM conjunctions!
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.event_id}
                  style={{
                    borderBottom: '1px solid #161b22',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#161b22')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-number)', fontWeight: 600, color: 'var(--accent-amber)' }}>
                    {row.event_id}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-number)' }}>
                    {row.step !== undefined ? `${row.step} / ${row.n_steps ?? '?'}` : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-number)' }}>
                    {row.time_to_tca_hours !== undefined ? `${row.time_to_tca_hours.toFixed(2)}h` : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-number)' }}>
                    {row.miss_distance_m !== undefined ? `${Math.round(row.miss_distance_m).toLocaleString()} m` : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-number)' }}>
                    {row.log10_pc !== undefined ? row.log10_pc.toFixed(2) : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-number)', fontWeight: 600 }}>
                    {row.risk_score !== undefined && row.risk_score !== null ? row.risk_score.toFixed(4) : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {getRiskBadge(row.risk_level)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {row.phase ?? '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {getDecisionBadge(row.decision)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ConjunctionTable;
