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

export interface TopDriver {
  feature: string;
  label?: string;
  value?: number | null;
  contribution: number;
}

export interface ManeuverBurn {
  step: number;
  hours_before_tca: number;
  move_m: number;
  fuel_proxy: number;
}

export interface ManeuverPlan {
  d0_m: number;
  d_safe_m: number;
  steps: number;
  step_hours: number;
  feasible: boolean;
  burn_needed: boolean | null;
  burns: ManeuverBurn[];
  total_cost?: number | null;
  fuel_proxy?: number | null;
  final_separation_m?: number | null;
  note?: string | null;
}

export interface AlertRoute {
  reachable: boolean;
  path: string[];
  hops?: number | null;
  latency_ms?: number | null;
  baseline_wait_s?: number | null;
  direct_visible?: boolean | null;
}

export interface RiskAlertPayload {
  risk_score: number | null;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  phase: 'EARLY_WATCH' | 'DECISION';
  top_drivers: null | TopDriver[];
  rule_points?: number | null;
  ml_score?: number | null;
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
  rule_points?: number | null;
  maneuver_plan?: ManeuverPlan | null;
  alert_route?: AlertRoute | null;
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
  points?: number | null;
  max_points?: number;
  risk_score: number | null;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNSCORED' | null;
  n_cdm_used?: number;
  drivers?: TopDriver[];
  top_drivers?: TopDriver[] | null;
  warnings?: string[];
  decision_if_final?: string;
  ml_score?: number | null;
  ml_risk_level?: string | null;
  ml_decision?: string | null;
  ml_benchmark?: {
    risk_score?: number | null;
    risk_level?: string | null;
    decision_if_final?: string | null;
    thresholds?: { review: number; maneuver: number };
    top_drivers?: any[];
    label?: string;
  };
}

export interface CvTableRow {
  target_recall: number;
  rule_points_threshold: number;
  rule_recall: number;
  rule_precision: number;
  rule_missed: number;
  rule_flagged: number;
  latest_risk_only_precision: number;
  ml_precision: number;
  ml_missed_at_same_recall: number;
}

export interface SweepRow {
  points_at_least: number;
  flagged: number;
  recall: number;
  precision: number;
  missed: number;
}

export interface TierStats {
  recall: number;
  precision: number;
  flagged: number;
}

export interface RulesData {
  method: string;
  params: Record<string, number>;
  max_points: number;
  thresholds: {
    review: number;
    maneuver: number;
  };
  targets: {
    review: number;
    maneuver: number;
  };
  cv_table: CvTableRow[];
  sweep: SweepRow[];
  tiers: {
    review: TierStats;
    maneuver: TierStats;
  };
}

export interface SimulationFramesResponse {
  start: number;
  count: number;
  total: number;
  frames: Array<Record<string, any>>;
}


