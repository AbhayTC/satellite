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
  const [recentUpdates, setRecentUpdates] = useState<Record<string, number>>({});
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
    const handleReset = () => {
      setEvents({});
      setRecentUpdates({});
      setExpandedId(null);
    };
    window.addEventListener('pipeline-reset', handleReset);

    const unsubscribe = subscribeLive((msg: StreamMessage) => {
      if ((msg as any).msg_type === 'PIPELINE_RESET') {
        handleReset();
        return;
      }
      const eid = String(msg.event_id);

      setRecentUpdates((prev) => ({ ...prev, [eid]: Date.now() }));

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

    return () => {
      window.removeEventListener('pipeline-reset', handleReset);
      unsubscribe();
    };
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
        return (
          <span
            className="risk-badge-high"
            style={{
              padding: '0.15rem 0.5rem',
              borderRadius: '2px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--risk-high)',
              border: '1px solid var(--risk-high)',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              letterSpacing: '0.04em',
            }}
          >
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span
            style={{
              padding: '0.15rem 0.5rem',
              borderRadius: '2px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--risk-med)',
              border: '1px solid var(--risk-med)',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              letterSpacing: '0.04em',
            }}
          >
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span
            style={{
              padding: '0.15rem 0.5rem',
              borderRadius: '2px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--risk-low)',
              border: '1px solid var(--risk-low)',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              letterSpacing: '0.04em',
            }}
          >
            LOW
          </span>
        );
      default:
        return (
          <span
            style={{
              padding: '0.15rem 0.5rem',
              borderRadius: '2px',
              background: 'rgba(255, 255, 255, 0.04)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
            }}
          >
            PENDING
          </span>
        );
    }
  };

  const getDecisionBadge = (decision?: string) => {
    switch (decision) {
      case 'MANEUVER':
        return (
          <span
            style={{
              padding: '0.15rem 0.55rem',
              borderRadius: '2px',
              background: 'var(--risk-high)',
              color: '#000000',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              letterSpacing: '0.04em',
            }}
          >
            MANEUVER
          </span>
        );
      case 'MONITOR':
        return (
          <span
            style={{
              padding: '0.15rem 0.55rem',
              borderRadius: '2px',
              background: 'var(--risk-med)',
              color: '#000000',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              letterSpacing: '0.04em',
            }}
          >
            MONITOR
          </span>
        );
      case 'NO_ACTION':
        return (
          <span
            style={{
              padding: '0.15rem 0.55rem',
              borderRadius: '2px',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
            }}
          >
            NO_ACTION
          </span>
        );
      default:
        return <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>—</span>;
    }
  };

  const toggleExpand = (eid: string) => {
    setExpandedId(expandedId === eid ? null : eid);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header telemetry & filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            TRANSPARENT_RULE_ENGINE // ACTIVE_TRACKS: {rows.length} // THRESHOLDS: REVIEW &ge; 3, MANEUVER &ge; 6
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem', letterSpacing: '-0.01em' }}>
            Live Conjunction Event Stream
          </h2>
        </div>

        {/* Filter & Search controls */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
              <IconSearch size={12} />
            </span>
            <input
              type="text"
              placeholder="SEARCH EVENT ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: '#040404',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                padding: '0.4rem 0.75rem 0.4rem 1.9rem',
                borderRadius: '2px',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                width: '190px',
                transition: 'border-color 0.15s ease',
              }}
            />
          </div>

          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            style={{
              background: '#040404',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              padding: '0.4rem 0.75rem',
              borderRadius: '2px',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              transition: 'border-color 0.15s ease',
            }}
          >
            <option value="ALL">ALL RISK TIERS</option>
            <option value="HIGH">HIGH RISK (&ge;6 PTS)</option>
            <option value="MEDIUM">MEDIUM RISK (3–5 PTS)</option>
            <option value="LOW">LOW RISK (0–2 PTS)</option>
          </select>
        </div>
      </div>

      {/* Events Table Container */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: '2px',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}
      >
        <div
          data-lenis-prevent
          style={{
            overflowX: 'auto',
            maxHeight: '72vh',
            overscrollBehavior: 'contain',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
            <thead className="sticky-header">
              <tr style={{ borderBottom: '1px solid var(--border-strong)', color: 'var(--text-muted)', background: 'var(--bg-surface-elevated)' }}>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>EVENT ID</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>STEP</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>TIME TO TCA</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>MISS DIST</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>LOG10(Pc)</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>RULE POINTS</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>RISK LEVEL</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>DECISION</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>ML BENCHMARK</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600, textAlign: 'right' }}>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                      <span className="radar-spinner" />
                      <span style={{ fontSize: '0.75rem', letterSpacing: '0.06em' }}>INITIALIZING SYNTHETIC TELEMETRY INGESTION...</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {searchTerm ? (
                      `NO CONJUNCTION EVENT MATCHING "${searchTerm.toUpperCase()}".`
                    ) : (
                      'NO ACTIVE CONJUNCTION TRACKS. CLICK [START] ON SIDEBAR CONTROLLER TO STREAM TELEMETRY.'
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const pts = row.rule_points !== undefined && row.rule_points !== null
                    ? row.rule_points
                    : (row.risk_score !== undefined && row.risk_score !== null ? Math.round(row.risk_score * 12) : null);
                  const isExpanded = expandedId === row.event_id;
                  const isRecentlyUpdated = Date.now() - (recentUpdates[row.event_id] || 0) < 1200;

                  return (
                    <React.Fragment key={row.event_id}>
                      <tr
                        className={isRecentlyUpdated ? 'row-updated' : ''}
                        style={{
                          borderBottom: isExpanded ? 'none' : '1px solid var(--border-subtle)',
                          background: isExpanded ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.12s ease',
                        }}
                        onClick={() => toggleExpand(row.event_id)}
                        onMouseEnter={(e) => {
                          if (!isExpanded) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.025)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <td style={{ padding: '0.55rem 0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span style={{ fontSize: '0.65rem', color: isExpanded ? '#ffffff' : 'var(--text-muted)', transition: 'transform 0.15s ease' }}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                            <span style={{ letterSpacing: '0.02em' }}>{row.event_id}</span>
                            <span onClick={(e) => e.stopPropagation()}>
                              <CopyButton text={row.event_id} title="Copy Event ID" style={{ padding: '0.15rem 0.35rem', fontSize: '0.65rem' }} />
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.55rem 0.85rem', color: 'var(--text-secondary)' }}>
                          {row.step !== undefined ? `${row.step}/${row.n_steps ?? '?'}` : 'N/A'}
                        </td>
                        <td style={{ padding: '0.55rem 0.85rem', color: 'var(--text-primary)' }}>
                          {row.time_to_tca_hours !== undefined ? `${row.time_to_tca_hours.toFixed(2)}h` : 'N/A'}
                        </td>
                        <td style={{ padding: '0.55rem 0.85rem', color: 'var(--text-primary)' }}>
                          {row.miss_distance_m !== undefined ? `${Math.round(row.miss_distance_m).toLocaleString()} m` : 'N/A'}
                        </td>
                        <td style={{ padding: '0.55rem 0.85rem', color: 'var(--text-secondary)' }}>
                          {row.log10_pc !== undefined ? row.log10_pc.toFixed(2) : 'N/A'}
                        </td>
                        <td
                          style={{
                            padding: '0.55rem 0.85rem',
                            fontWeight: 700,
                            color: pts !== null && pts >= 6 ? 'var(--risk-high)' : pts !== null && pts >= 3 ? 'var(--risk-med)' : 'var(--risk-low)',
                          }}
                        >
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
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.15rem 0.4rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
                              ML {row.ml_score.toFixed(4)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '0.55rem 0.85rem', textAlign: 'right' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(row.event_id); }}
                            style={{
                              background: isExpanded ? '#ffffff' : 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid var(--border-default)',
                              color: isExpanded ? '#000000' : 'var(--text-secondary)',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '2px',
                              cursor: 'pointer',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              fontFamily: 'var(--font-mono)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isExpanded ? 'CLOSE' : 'INSPECT'}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Inspection Drawer */}
                      {isExpanded && (
                        <tr style={{ background: '#040404', borderBottom: '1px solid var(--border-strong)' }}>
                          <td colSpan={10} style={{ padding: '1.25rem 1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                              {/* Rationale header */}
                              {row.rationale && (
                                <div
                                  style={{
                                    padding: '0.75rem 1rem',
                                    background: '#070707',
                                    borderLeft: `3px solid ${pts !== null && pts >= 6 ? 'var(--risk-high)' : pts !== null && pts >= 3 ? 'var(--risk-med)' : 'var(--border-strong)'}`,
                                    borderTop: '1px solid var(--border-subtle)',
                                    borderRight: '1px solid var(--border-subtle)',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    borderRadius: '2px',
                                    fontSize: '0.78rem',
                                    color: 'var(--text-primary)',
                                    lineHeight: '1.5',
                                  }}
                                >
                                  <span style={{ fontWeight: 700, color: '#ffffff', marginRight: '0.6rem', letterSpacing: '0.04em' }}>
                                    MISSION CONTROL RATIONALE:
                                  </span>
                                  <span style={{ color: 'var(--text-secondary)' }}>{row.rationale}</span>
                                </div>
                              )}

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
                                {/* 1. Rule Engine Driver Breakdown */}
                                <div style={{ background: '#060606', padding: '1rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.45rem' }}>
                                    <span style={{ fontSize: '0.72rem', color: '#ffffff', fontWeight: 700, letterSpacing: '0.06em' }}>
                                      RULE ENGINE DRIVER BREAKDOWN (POINTS SYSTEM)
                                    </span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                      TOTAL: {pts ?? 0} / 12 PTS
                                    </span>
                                  </div>

                                  {row.top_drivers && row.top_drivers.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                      {row.top_drivers.map((d, i) => (
                                        <div
                                          key={i}
                                          style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.45rem 0.65rem',
                                            background: '#000000',
                                            borderRadius: '2px',
                                            border: '1px solid var(--border-subtle)',
                                            fontSize: '0.75rem',
                                          }}
                                        >
                                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{d.label || d.feature}</span>
                                            {d.value !== null && d.value !== undefined && (
                                              <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                                                Observed value: {typeof d.value === 'number' ? d.value.toFixed(2) : d.value}
                                              </span>
                                            )}
                                          </div>
                                          <span
                                            style={{
                                              color: d.contribution >= 2 ? 'var(--risk-high)' : d.contribution > 0 ? 'var(--risk-med)' : 'var(--text-muted)',
                                              fontWeight: 700,
                                              fontSize: '0.82rem',
                                            }}
                                          >
                                            +{d.contribution} pts
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.5' }}>
                                      Driver breakdown is calibrated on decision-point rows ({row.phase ?? 'monitoring'}).
                                    </div>
                                  )}
                                </div>

                                {/* 2. Maneuver Plan Panel */}
                                {row.maneuver_plan && (
                                  <div style={{ background: '#060606', padding: '1rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.45rem' }}>
                                      <span style={{ fontSize: '0.72rem', color: row.maneuver_plan.burn_needed === false ? 'var(--risk-med)' : 'var(--risk-high)', fontWeight: 700, letterSpacing: '0.06em' }}>
                                        MINIMUM-COST MANEUVER PLAN (DIJKSTRA)
                                      </span>
                                      {row.maneuver_plan.burn_needed === false ? (
                                        <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: '2px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--risk-med)', border: '1px solid var(--risk-med)', fontWeight: 700 }}>
                                          REFINE TRACKING FIRST
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: '2px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--risk-high)', border: '1px solid var(--risk-high)', fontWeight: 700 }}>
                                          ACTIVE BURN SCHEDULE
                                        </span>
                                      )}
                                    </div>

                                    {/* Schematic miss vs keep-out distance meter */}
                                    <div style={{ marginBottom: '0.85rem', padding: '0.65rem', background: '#000000', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                                        <span>Initial Miss: {Math.round(row.maneuver_plan.d0_m).toLocaleString()} m</span>
                                        <span style={{ color: 'var(--risk-med)' }}>Keep-Out: {Math.round(row.maneuver_plan.d_safe_m).toLocaleString()} m</span>
                                        <span style={{ color: 'var(--risk-low)' }}>
                                          Final: {row.maneuver_plan.final_separation_m ? `${Math.round(row.maneuver_plan.final_separation_m).toLocaleString()} m` : 'N/A'}
                                        </span>
                                      </div>
                                      <div style={{ position: 'relative', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div
                                          style={{
                                            position: 'absolute',
                                            left: 0,
                                            height: '100%',
                                            width: `${Math.min(100, ((row.maneuver_plan.d0_m ?? 0) / 4000) * 100)}%`,
                                            background: (row.maneuver_plan.d0_m ?? 0) < 2000 ? 'var(--risk-high)' : 'var(--risk-low)',
                                            transition: 'width 0.3s ease',
                                          }}
                                        />
                                        <div
                                          style={{
                                            position: 'absolute',
                                            left: '50%',
                                            top: 0,
                                            bottom: 0,
                                            width: '2px',
                                            background: 'var(--risk-med)',
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
                                          <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                                            <th style={{ padding: '0.35rem 0.4rem' }}>STEP</th>
                                            <th style={{ padding: '0.35rem 0.4rem' }}>HOURS TO TCA</th>
                                            <th style={{ padding: '0.35rem 0.4rem' }}>OFFSET MOVE</th>
                                            <th style={{ padding: '0.35rem 0.4rem' }}>FUEL PROXY</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {row.maneuver_plan.burns.map((b, bi) => (
                                            <tr key={bi} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                              <td style={{ padding: '0.35rem 0.4rem', color: '#ffffff', fontWeight: 600 }}>Step {b.step}</td>
                                              <td style={{ padding: '0.35rem 0.4rem' }}>{b.hours_before_tca} h</td>
                                              <td style={{ padding: '0.35rem 0.4rem' }}>+{b.move_m} m</td>
                                              <td style={{ padding: '0.35rem 0.4rem', color: 'var(--risk-med)', fontWeight: 600 }}>{b.fuel_proxy}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : (
                                      <div style={{ color: 'var(--risk-med)', fontSize: '0.72rem', padding: '0.4rem 0', lineHeight: '1.4' }}>
                                        Predicted miss distance ({Math.round(row.maneuver_plan.d0_m)} m) already exceeds keep-out distance (2,000 m). Risk originates from covariance uncertainty; refine tracking before burning fuel.
                                      </div>
                                    )}

                                    <div style={{ marginTop: '0.65rem', fontSize: '0.65rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                      Footnote: Maneuver plan is schematic along the miss vector with an assumed 2,000 m keep-out distance and an arbitrary fuel unit.
                                    </div>
                                  </div>
                                )}

                                {/* 3. Alert Route Panel */}
                                {row.alert_route && (
                                  <div style={{ background: '#060606', padding: '1rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.45rem' }}>
                                      <span style={{ fontSize: '0.72rem', color: '#ffffff', fontWeight: 700, letterSpacing: '0.06em' }}>
                                        MINIMUM-LATENCY ALERT ROUTING (DIJKSTRA)
                                      </span>
                                      <span
                                        style={{
                                          fontSize: '0.65rem',
                                          fontWeight: 700,
                                          padding: '0.15rem 0.45rem',
                                          borderRadius: '2px',
                                          background: row.alert_route.reachable ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.15)',
                                          color: row.alert_route.reachable ? 'var(--risk-low)' : 'var(--risk-high)',
                                          border: `1px solid ${row.alert_route.reachable ? 'var(--risk-low)' : 'var(--risk-high)'}`,
                                        }}
                                      >
                                        {row.alert_route.reachable ? 'REACHABLE' : 'UNREACHABLE'}
                                      </span>
                                    </div>

                                    {/* Hop Path */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LASER PATH:</span>
                                      {row.alert_route?.path && row.alert_route.path.map((node, ni, arr) => (
                                        <React.Fragment key={ni}>
                                          <span
                                            style={{
                                              padding: '0.2rem 0.5rem',
                                              borderRadius: '2px',
                                              background: node.startsWith('G') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                                              color: node.startsWith('G') ? '#ffffff' : 'var(--text-secondary)',
                                              border: '1px solid var(--border-default)',
                                              fontSize: '0.7rem',
                                              fontWeight: 600,
                                            }}
                                          >
                                            {node.startsWith('G') ? `GROUND [${node}]` : `SAT [${node}]`}
                                          </span>
                                          {ni < arr.length - 1 && (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>&rarr;</span>
                                          )}
                                        </React.Fragment>
                                      ))}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.72rem', background: '#000000', padding: '0.65rem', borderRadius: '2px', border: '1px solid var(--border-subtle)' }}>
                                      <div>
                                        <div style={{ color: 'var(--text-muted)' }}>HOPS</div>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem', fontSize: '0.9rem' }}>
                                          {row.alert_route.hops ?? 'N/A'}
                                        </div>
                                      </div>
                                      <div>
                                        <div style={{ color: 'var(--text-muted)' }}>ROUTE LATENCY</div>
                                        <div style={{ fontWeight: 700, color: '#ffffff', marginTop: '0.2rem', fontSize: '0.9rem' }}>
                                          {row.alert_route.latency_ms !== null && row.alert_route.latency_ms !== undefined ? `${row.alert_route.latency_ms.toFixed(1)} ms` : 'N/A'}
                                        </div>
                                      </div>
                                      <div>
                                        <div style={{ color: 'var(--text-muted)' }}>DIRECT PASS WAIT</div>
                                        <div style={{ fontWeight: 700, color: 'var(--risk-med)', marginTop: '0.2rem', fontSize: '0.9rem' }}>
                                          {row.alert_route.baseline_wait_s !== null && row.alert_route.baseline_wait_s !== undefined ? `${row.alert_route.baseline_wait_s.toFixed(1)} s` : 'N/A'}
                                        </div>
                                      </div>
                                    </div>

                                    <div style={{ marginTop: '0.65rem', fontSize: '0.65rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
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
