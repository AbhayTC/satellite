// src/types.ts
export type MessageType = 'STATE_UPDATE' | 'RISK_ALERT' | 'MANEUVER_DECISION';

export interface BaseMessage {
  schema_version: string;
  message_id: string;
  msg_type: MessageType;
  event_id: string;
  emitted_at: string;
  source_agent: 'ingestion' | 'tracking' | 'risk' | 'maneuver';
}

export interface StateUpdatePayload {
  step: number;
  n_steps: number;
  time_to_tca_hours: number;
  miss_distance_m: number;
  relative_speed_ms: number;
  log10_pc: number;
  collision_probability: number;
  pc_trend: 'rising' | 'falling' | 'stable';
  deltas: { log10_pc: number | null; miss_distance_m: number | null };
}

export interface StateUpdate extends BaseMessage {
  msg_type: 'STATE_UPDATE';
  payload: StateUpdatePayload;
}

export interface RiskAlertPayload {
  risk_score: number | null;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  phase: 'EARLY_WATCH' | 'DECISION';
  top_drivers: null | Array<{ feature: string; label: string; value: number; contribution: number }>;
}

export interface RiskAlert extends BaseMessage {
  msg_type: 'RISK_ALERT';
  payload: RiskAlertPayload;
}

export interface ManeuverDecisionPayload {
  decision: 'NO_ACTION' | 'MONITOR' | 'MANEUVER';
  phase: 'EARLY_WATCH' | 'DECISION';
  rationale: string;
  suggested_delta_v_ms: number | null;
}

export interface ManeuverDecision extends BaseMessage {
  msg_type: 'MANEUVER_DECISION';
  payload: ManeuverDecisionPayload;
}

export type StreamMessage = StateUpdate | RiskAlert | ManeuverDecision;

// ── REST API Types ─────────────────────────────────────────────────────────────

export interface EventSummary {
  event_id: string;
  state?: StateUpdate;
  risk?: RiskAlert;
  decision?: ManeuverDecision;
}

export interface EventHistoryResponse {
  event_id: string;
  messages: StreamMessage[];
}

export interface ReplayStatusResponse {
  status: string;
  running?: boolean;
}

export interface HealthResponse {
  status: string;
  replay_running: boolean;
  ws_connections: number;
}

export interface CdmInputRow {
  time_to_tca: number;
  risk?: number | null;
  collision_probability?: number | null;
  miss_distance: number;
  relative_speed: number;
  mahalanobis_distance?: number | null;
}

export interface PredictRequest {
  history: CdmInputRow[];
}

export interface PredictResult {
  risk_score: number | null;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNSCORED' | null;
  n_cdm_used?: number;
  top_drivers?: Array<{ feature: string; value: number; contribution: number }> | null;
  warnings?: string[];
  decision_if_final?: string;
}

export interface SimulationFramesResponse {
  start: number;
  count: number;
  total: number;
  frames: Array<Record<string, any>>;
}

