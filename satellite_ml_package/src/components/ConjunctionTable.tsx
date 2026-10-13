// src/components/ConjunctionTable.tsx
import React, { useEffect, useState } from 'react';
import { subscribeLive, fetchEvents } from '../api';
import type { StreamMessage, StateUpdate, RiskAlert, ManeuverDecision } from '../types';
import CopyButton from './CopyButton';
import { IconSearch } from './Icons';

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
  const [loading, setLoading] = useState<boolean>(true);

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
      .catch((err) => console.warn('Could not fetch initial events:', err))
      .finally(() => setLoading(false));
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
        return <span style={{ padding: '0.15rem 0.45rem', borderRadius: '2px', background: '#451014', color: '#f87171', border: '1px solid #ef4444', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>HIGH</span>;
      case 'MEDIUM':
        return <span style={{ padding: '0.15rem 0.45rem', borderRadius: '2px', background: '#3b2505', color: '#fbbf24', border: '1px solid #f59e0b', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>MEDIUM</span>;
      case 'LOW':
        return <span style={{ padding: '0.15rem 0.45rem', borderRadius: '2px', background: '#0a291a', color: '#4ade80', border: '1px solid #10b981', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>LOW</span>;
      default:
        return <span style={{ padding: '0.15rem 0.45rem', borderRadius: '2px', background: '#141a24', color: '#94a3b8', border: '1px solid #283344', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>PENDING</span>;
    }
  };

  const getDecisionBadge = (decision?: string) => {
    switch (decision) {
      case 'MANEUVER':
        return <span style={{ padding: '0.15rem 0.5rem', borderRadius: '2px', background: '#ef4444', color: '#000', fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>MANEUVER</span>;
      case 'MONITOR':
        return <span style={{ padding: '0.15rem 0.5rem', borderRadius: '2px', background: '#f59e0b', color: '#000', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>MONITOR</span>;
      case 'NO_ACTION':
        return <span style={{ padding: '0.15rem 0.5rem', borderRadius: '2px', background: '#141a24', color: '#94a3b8', border: '1px solid #283344', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>NO_ACTION</span>;
      default:
        return <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>N/A</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            TELEMETRY_FEED // ACTIVE_CHANNELS: {rows.length}
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            Live Conjunction Event Stream
          </h2>
        </div>

        {/* Filter & Search controls */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <IconSearch size={12} />
            </span>
            <input
              type="text"
              placeholder="FILTER EVENT ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: '#090d14',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-primary)',
                padding: '0.35rem 0.65rem 0.35rem 1.8rem',
                borderRadius: '2px',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-mono)',
                width: '180px',
              }}
            />
          </div>

          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            style={{
              background: '#090d14',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              padding: '0.35rem 0.65rem',
              borderRadius: '2px',
              fontSize: '0.78rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">FILTER: ALL LEVELS</option>
            <option value="HIGH">FILTER: HIGH RISK</option>
            <option value="MEDIUM">FILTER: MEDIUM RISK</option>
            <option value="LOW">FILTER: LOW RISK</option>
          </select>
        </div>
      </div>

      {/* Events Table with Sticky Header */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '2px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: '72vh' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
            <thead className="sticky-header">
              <tr style={{ borderBottom: '1px solid var(--border-strong)', color: 'var(--text-muted)', background: 'var(--bg-surface-elevated)' }}>
                <th style={{ padding: '0.65rem 0.85rem' }}>EVENT ID</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>STEP</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>TIME TO TCA</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>MISS DIST</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>LOG10(Pc)</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>RISK SCORE</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>RISK LEVEL</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>PHASE</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>DECISION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="radar-spinner" />
                      <span>INITIALIZING SYNTHETIC TELEMETRY INGESTION...</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {searchTerm ? (
                      `NO CONJUNCTION EVENT MATCHING "${searchTerm.toUpperCase()}".`
                    ) : (
                      'NO ACTIVE CONJUNCTION TRACKS. CLICK [PLAY] ON SIDEBAR CONTROLLER TO START CDM STREAM.'
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.event_id}
                    style={{
                      borderBottom: '1px solid #131924',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#121824')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.55rem 0.85rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{row.event_id}</span>
                        <CopyButton text={row.event_id} title="Copy Event ID" style={{ padding: '0.15rem 0.35rem', fontSize: '0.68rem' }} />
                      </div>
                    </td>
                    <td style={{ padding: '0.55rem 0.85rem' }}>
                      {row.step !== undefined ? `${row.step}/${row.n_steps ?? '?'}` : 'N/A'}
                    </td>
                    <td style={{ padding: '0.55rem 0.85rem' }}>
                      {row.time_to_tca_hours !== undefined ? `${row.time_to_tca_hours.toFixed(2)}h` : 'N/A'}
                    </td>
                    <td style={{ padding: '0.55rem 0.85rem' }}>
                      {row.miss_distance_m !== undefined ? `${Math.round(row.miss_distance_m).toLocaleString()} m` : 'N/A'}
                    </td>
                    <td style={{ padding: '0.55rem 0.85rem' }}>
                      {row.log10_pc !== undefined ? row.log10_pc.toFixed(2) : 'N/A'}
                    </td>
                    <td style={{ padding: '0.55rem 0.85rem', fontWeight: 600, color: row.risk_score && row.risk_score > 0.65 ? '#ef4444' : 'inherit' }}>
                      {row.risk_score !== undefined && row.risk_score !== null ? row.risk_score.toFixed(4) : 'N/A'}
                    </td>
                    <td style={{ padding: '0.55rem 0.85rem' }}>
                      {getRiskBadge(row.risk_level)}
                    </td>
                    <td style={{ padding: '0.55rem 0.85rem', color: 'var(--text-muted)' }}>
                      {row.phase ?? 'N/A'}
                    </td>
                    <td style={{ padding: '0.55rem 0.85rem' }}>
                      {getDecisionBadge(row.decision)}
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

export default ConjunctionTable;
