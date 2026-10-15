// src/components/ConjunctionTable.tsx
import React, { useEffect, useState } from 'react';
import { subscribeLive, fetchEvents } from '../api';
import type { StreamMessage, StateUpdate, RiskAlert, ManeuverDecision, TopDriver, ManeuverPlan, AlertRoute } from '../types';
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
  rule_points?: number | null;
  risk_score?: number | null;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  phase?: string;
  decision?: string;
  top_drivers?: TopDriver[] | null;
  maneuver_plan?: ManeuverPlan | null;
  alert_route?: AlertRoute | null;
  ml_score?: number | null;
  rationale?: string;
  lastUpdated?: string;
}

const ConjunctionTable: React.FC = () => {
  const [events, setEvents] = useState<Record<string, EventRow>>({});
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
            rule_points: item.risk?.payload?.rule_points ?? item.decision?.payload?.rule_points,
            risk_score: item.risk?.payload?.risk_score,
            risk_level: item.risk?.payload?.risk_level,
            phase: item.risk?.payload?.phase || item.decision?.payload?.phase,
            decision: item.decision?.payload?.decision,
            top_drivers: item.risk?.payload?.top_drivers,
            maneuver_plan: item.decision?.payload?.maneuver_plan,
            alert_route: item.decision?.payload?.alert_route,
            ml_score: item.risk?.payload?.ml_score,
            rationale: item.decision?.payload?.rationale,
            lastUpdated: item.state?.emitted_at || item.risk?.emitted_at,
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
          if (r.payload.rule_points !== undefined) updated.rule_points = r.payload.rule_points;
          if (r.payload.ml_score !== undefined) updated.ml_score = r.payload.ml_score;
          if (r.payload.top_drivers) updated.top_drivers = r.payload.top_drivers;
        } else if (msg.msg_type === 'MANEUVER_DECISION') {
          const d = msg as ManeuverDecision;
          updated.decision = d.payload.decision;
          updated.phase = d.payload.phase;
          updated.rationale = d.payload.rationale;
          if (d.payload.rule_points !== undefined) updated.rule_points = d.payload.rule_points;
          if (d.payload.maneuver_plan !== undefined) updated.maneuver_plan = d.payload.maneuver_plan;
          if (d.payload.alert_route !== undefined) updated.alert_route = d.payload.alert_route;
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

  // Sort by rule points / risk score (descending)
  rows.sort((a, b) => (b.rule_points ?? (b.risk_score ? b.risk_score * 12 : -1)) - (a.rule_points ?? (a.risk_score ? a.risk_score * 12 : -1)));

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

  const toggleExpand = (eid: string) => {
    setExpandedId(expandedId === eid ? null : eid);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            TRANSPARENT_RULE_ENGINE // ACTIVE_TRACKS: {rows.length} // THRESHOLDS: REVIEW &ge; 3, MANEUVER &ge; 6
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
            <option value="HIGH">FILTER: HIGH RISK (&ge;6)</option>
            <option value="MEDIUM">FILTER: MEDIUM RISK (3-5)</option>
            <option value="LOW">FILTER: LOW RISK (0-2)</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
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
                <th style={{ padding: '0.65rem 0.85rem' }}>RULE POINTS</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>RISK LEVEL</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>DECISION</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>ML BENCHMARK</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="radar-spinner" />
                      <span>INITIALIZING SYNTHETIC TELEMETRY INGESTION...</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {searchTerm ? (
                      `NO CONJUNCTION EVENT MATCHING "${searchTerm.toUpperCase()}".`
                    ) : (
                      'NO ACTIVE CONJUNCTION TRACKS. CLICK [START] ON SIDEBAR CONTROLLER TO STREAM.'
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const pts = row.rule_points !== undefined && row.rule_points !== null
                    ? row.rule_points
                    : (row.risk_score !== undefined && row.risk_score !== null ? Math.round(row.risk_score * 12) : null);
                  const isExpanded = expandedId === row.event_id;

                  return (
                    <React.Fragment key={row.event_id}>
                      <tr
                        style={{
                          borderBottom: isExpanded ? 'none' : '1px solid #131924',
                          background: isExpanded ? '#0e141f' : 'transparent',
                          cursor: 'pointer',
                        }}
                        onClick={() => toggleExpand(row.event_id)}
                        onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = '#121824'; }}
                        onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '0.55rem 0.85rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.72rem', color: isExpanded ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                            <span>{row.event_id}</span>
                            <span onClick={(e) => e.stopPropagation()}>
                              <CopyButton text={row.event_id} title="Copy Event ID" style={{ padding: '0.15rem 0.35rem', fontSize: '0.68rem' }} />
                            </span>
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
                        <td style={{ padding: '0.55rem 0.85rem', fontWeight: 700, color: pts !== null && pts >= 6 ? '#ef4444' : pts !== null && pts >= 3 ? '#fbbf24' : '#4ade80' }}>
                          {pts !== null ? `${pts} / 12` : 'N/A'}
                        </td>
                        <td style={{ padding: '0.55rem 0.85rem' }}>
                          {getRiskBadge(row.risk_level)}
                        </td>
                        <td style={{ padding: '0.55rem 0.85rem' }}>
                          {getDecisionBadge(row.decision)}
                        </td>
                        <td style={{ padding: '0.55rem 0.85rem' }}>
                          {row.ml_score !== undefined && row.ml_score !== null ? (
                            <span style={{ color: '#64748b', fontSize: '0.75rem', background: '#0a0e16', padding: '0.15rem 0.35rem', borderRadius: '2px', border: '1px solid #1e293b' }}>
                              ML {row.ml_score.toFixed(4)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '0.55rem 0.85rem' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(row.event_id); }}
                            style={{
                              background: '#141d2c',
                              border: '1px solid var(--border-strong)',
                              color: 'var(--text-secondary)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '2px',
                              cursor: 'pointer',
                              fontSize: '0.7rem',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {isExpanded ? 'CLOSE' : 'INSPECT'}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Inspection Drawer */}
                      {isExpanded && (
                        <tr style={{ background: '#090d14', borderBottom: '2px solid var(--border-strong)' }}>
                          <td colSpan={10} style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              {/* Rationale header */}
                              {row.rationale && (
                                <div style={{ padding: '0.65rem 0.85rem', background: '#0d131f', borderLeft: '3px solid var(--accent-primary)', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--accent-primary)', marginRight: '0.5rem' }}>MISSION CONTROL RATIONALE:</span>
                                  <span>{row.rationale}</span>
                                </div>
                              )}

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                                {/* 1. Rule Engine Driver Breakdown */}
                                <div style={{ background: '#0e1420', padding: '0.85rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', borderBottom: '1px solid #1a2436', paddingBottom: '0.35rem' }}>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.04em' }}>
                                      RULE ENGINE DRIVER BREAKDOWN (POINTS SYSTEM)
                                    </span>
                                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                      TOTAL: {pts ?? 0} / 12 PTS
                                    </span>
                                  </div>

                                  {row.top_drivers && row.top_drivers.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                      {row.top_drivers.map((d, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem', background: '#080c13', borderRadius: '2px', fontSize: '0.75rem' }}>
                                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{d.label || d.feature}</span>
                                            {d.value !== null && d.value !== undefined && (
                                              <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>Observed value: {typeof d.value === 'number' ? d.value.toFixed(2) : d.value}</span>
                                            )}
                                          </div>
                                          <span style={{ color: d.contribution > 0 ? '#fbbf24' : '#64748b', fontWeight: 700, fontSize: '0.82rem' }}>
                                            +{d.contribution} pts
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                      Driver breakdown is calibrated on decision-point rows ({row.phase}).
                                    </div>
                                  )}
                                </div>

                                {/* 2. Maneuver Plan Panel (Only for MANEUVER events or if plan exists) */}
                                {row.maneuver_plan && (
                                  <div style={{ background: '#0e1420', padding: '0.85rem', borderRadius: '2px', border: '1px solid #ef4444' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', borderBottom: '1px solid #1a2436', paddingBottom: '0.35rem' }}>
                                      <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700, letterSpacing: '0.04em' }}>
                                        MINIMUM-COST MANEUVER PLAN (DIJKSTRA)
                                      </span>
                                      {row.maneuver_plan.burn_needed === false ? (
                                        <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', borderRadius: '2px', background: '#3b2505', color: '#fbbf24', border: '1px solid #f59e0b', fontWeight: 700 }}>
                                          REFINE TRACKING FIRST, NO BURN NEEDED
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', borderRadius: '2px', background: '#451014', color: '#f87171', border: '1px solid #ef4444', fontWeight: 700 }}>
                                          ACTIVE BURN SCHEDULE
                                        </span>
                                      )}
                                    </div>

                                    {/* Schematic miss vs keep-out distance meter */}
                                    <div style={{ marginBottom: '0.75rem', padding: '0.5rem', background: '#080c13', borderRadius: '2px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                                        <span>Initial Miss: {Math.round(row.maneuver_plan.d0_m).toLocaleString()} m</span>
                                        <span style={{ color: '#fbbf24' }}>Keep-Out Threshold: {Math.round(row.maneuver_plan.d_safe_m).toLocaleString()} m</span>
                                        <span style={{ color: '#4ade80' }}>Final Miss: {row.maneuver_plan.final_separation_m ? `${Math.round(row.maneuver_plan.final_separation_m).toLocaleString()} m` : 'N/A'}</span>
                                      </div>
                                      <div style={{ position: 'relative', height: '10px', background: '#1c2536', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div
                                          style={{
                                            position: 'absolute',
                                            left: 0,
                                            height: '100%',
                                            width: `${Math.min(100, ((row.maneuver_plan.d0_m ?? 0) / 4000) * 100)}%`,
                                            background: (row.maneuver_plan.d0_m ?? 0) < 2000 ? '#ef4444' : '#10b981',
                                          }}
                                        />
                                        <div
                                          style={{
                                            position: 'absolute',
                                            left: '50%',
                                            top: 0,
                                            bottom: 0,
                                            width: '2px',
                                            background: '#fbbf24',
                                            zIndex: 2,
                                          }}
                                          title="2,000 m Keep-Out Distance"
                                        />
                                      </div>
                                    </div>

                                    {/* Burns list */}
                                    {row.maneuver_plan.burns && row.maneuver_plan.burns.length > 0 ? (
                                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', textAlign: 'left' }}>
                                        <thead>
                                          <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid #1a2436' }}>
                                            <th style={{ padding: '0.3rem' }}>STEP</th>
                                            <th style={{ padding: '0.3rem' }}>HOURS BEFORE TCA</th>
                                            <th style={{ padding: '0.3rem' }}>OFFSET MOVE</th>
                                            <th style={{ padding: '0.3rem' }}>FUEL PROXY</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {row.maneuver_plan.burns.map((b, bi) => (
                                            <tr key={bi} style={{ borderBottom: '1px solid #141c2b' }}>
                                              <td style={{ padding: '0.3rem', color: 'var(--accent-primary)' }}>Step {b.step}</td>
                                              <td style={{ padding: '0.3rem' }}>{b.hours_before_tca} h</td>
                                              <td style={{ padding: '0.3rem' }}>+{b.move_m} m</td>
                                              <td style={{ padding: '0.3rem', color: '#f59e0b', fontWeight: 600 }}>{b.fuel_proxy}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : (
                                      <div style={{ color: '#fbbf24', fontSize: '0.72rem', padding: '0.35rem 0' }}>
                                        Predicted miss distance ({Math.round(row.maneuver_plan.d0_m)} m) already exceeds keep-out distance (2,000 m). Risk originates from covariance uncertainty; refine tracking before burning fuel.
                                      </div>
                                    )}

                                    <div style={{ marginTop: '0.5rem', fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic' }}>
                                      Footnote: Maneuver plan is schematic along the miss vector with an assumed 2,000 m keep-out distance and an arbitrary fuel unit.
                                    </div>
                                  </div>
                                )}

                                {/* 3. Alert Route Panel (When route available: MANEUVER & MONITOR decision rows) */}
                                {row.alert_route && (
                                  <div style={{ background: '#0e1420', padding: '0.85rem', borderRadius: '2px', border: '1px solid #38bdf8' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', borderBottom: '1px solid #1a2436', paddingBottom: '0.35rem' }}>
                                      <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.04em' }}>
                                        MINIMUM-LATENCY ALERT ROUTING (DIJKSTRA)
                                      </span>
                                      <span style={{ fontSize: '0.68rem', color: row.alert_route.reachable ? '#4ade80' : '#ef4444' }}>
                                        {row.alert_route.reachable ? 'REACHABLE' : 'UNREACHABLE'}
                                      </span>
                                    </div>

                                    {/* Hop Path */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>NETWORK PATH:</span>
                                      {row.alert_route?.path && row.alert_route.path.map((node, ni, arr) => (
                                        <React.Fragment key={ni}>
                                          <span style={{
                                            padding: '0.15rem 0.4rem',
                                            borderRadius: '2px',
                                            background: node.startsWith('G') ? '#0c2e1f' : '#142338',
                                            color: node.startsWith('G') ? '#4ade80' : '#38bdf8',
                                            border: `1px solid ${node.startsWith('G') ? '#10b981' : '#0284c7'}`,
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                          }}>
                                            {node.startsWith('G') ? `GROUND [${node}]` : `SAT [${node}]`}
                                          </span>
                                          {ni < arr.length - 1 && (
                                            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>&rarr;</span>
                                          )}
                                        </React.Fragment>
                                      ))}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', fontSize: '0.72rem', background: '#080c13', padding: '0.5rem', borderRadius: '2px' }}>
                                      <div>
                                        <div style={{ color: 'var(--text-muted)' }}>HOPS</div>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                                          {row.alert_route.hops ?? 'N/A'}
                                        </div>
                                      </div>
                                      <div>
                                        <div style={{ color: 'var(--text-muted)' }}>ROUTE LATENCY</div>
                                        <div style={{ fontWeight: 700, color: '#38bdf8', marginTop: '0.15rem' }}>
                                          {row.alert_route.latency_ms !== null && row.alert_route.latency_ms !== undefined ? `${row.alert_route.latency_ms.toFixed(1)} ms` : 'N/A'}
                                        </div>
                                      </div>
                                      <div>
                                        <div style={{ color: 'var(--text-muted)' }}>DIRECT PASS WAIT</div>
                                        <div style={{ fontWeight: 700, color: '#fbbf24', marginTop: '0.15rem' }}>
                                          {row.alert_route.baseline_wait_s !== null && row.alert_route.baseline_wait_s !== undefined ? `${row.alert_route.baseline_wait_s.toFixed(1)} s` : 'N/A'}
                                        </div>
                                      </div>
                                    </div>

                                    <div style={{ marginTop: '0.5rem', fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic' }}>
                                      Footnote: Constellation alert network is illustrative (12 LEO satellites, 3 ground stations, inter-satellite laser links).
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ConjunctionTable;
