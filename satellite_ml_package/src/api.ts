import type {
  StreamMessage,
  StateUpdate,
  RiskAlert,
  ManeuverDecision,
  EventSummary,
  EventHistoryResponse,
  ReplayStatusResponse,
  HealthResponse,
  PredictRequest,
  PredictResult,
  CdmInputRow,
  SimulationFramesResponse,
  RulesData,
} from './types';

// Toggle between mock data and live backend (default: live backend)
export const USE_MOCK: boolean = import.meta.env?.VITE_USE_MOCK === 'true';

const API_BASE = import.meta.env?.VITE_API_BASE || '';
const WS_URL =
  import.meta.env?.VITE_WS_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/stream`
    : 'ws://localhost:8000/stream');

let ws: WebSocket | null = null;
let listeners: Array<(msg: StreamMessage) => void> = [];
let reconnectTimer: any = null;

export const connectLive = () => {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    ws = new WebSocket(WS_URL);

    ws.addEventListener('open', () => {
      console.info('[WebSocket] Connected to satellite stream at', WS_URL);
    });

    ws.addEventListener('message', (ev) => {
      try {
        const data: StreamMessage = JSON.parse(ev.data);
        listeners.forEach((l) => l(data));
      } catch (e) {
        console.warn('Malformed WS message', e);
      }
    });

    ws.addEventListener('close', () => {
      ws = null;
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connectLive();
        }, 2000);
      }
    });

    ws.addEventListener('error', (err) => {
      console.warn('[WebSocket] Connection error:', err);
      ws?.close();
    });
  } catch (err) {
    console.error('[WebSocket] Initialization error:', err);
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectLive();
      }, 2000);
    }
  }
};

export const disconnectLive = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  listeners = [];
};

export const subscribeLive = (cb: (msg: StreamMessage) => void) => {
  listeners.push(cb);
  connectLive();
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
};

// ── REST API Client ────────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`API Error ${res.status} (${res.statusText}): ${errorText}`);
  }
  return res.json();
}

/** Health check */
export const fetchHealth = async (): Promise<HealthResponse> => {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse<HealthResponse>(res);
};

/** Get latest status per event */
export const fetchEvents = async (): Promise<EventSummary[]> => {
  const res = await fetch(`${API_BASE}/events`);
  return handleResponse<EventSummary[]>(res);
};

/** Get stream message history for a specific event */
export const fetchEventHistory = async (eventId: string): Promise<EventHistoryResponse> => {
  const res = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}/history`);
  return handleResponse<EventHistoryResponse>(res);
};

/** Replay control: start */
export const startReplay = async (
  source?: 'demo' | 'all',
  speed?: number
): Promise<ReplayStatusResponse> => {
  const params = new URLSearchParams();
  if (source) params.set('source', source);
  if (speed !== undefined) params.set('speed', String(speed));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/replay/start${qs}`, { method: 'POST' });
  return handleResponse<ReplayStatusResponse>(res);
};

/** Replay control: stop */
export const stopReplay = async (): Promise<ReplayStatusResponse> => {
  const res = await fetch(`${API_BASE}/replay/stop`, { method: 'POST' });
  return handleResponse<ReplayStatusResponse>(res);
};

/** Replay control: reset */
export const resetReplay = async (
  source?: 'demo' | 'all',
  speed?: number
): Promise<ReplayStatusResponse> => {
  const params = new URLSearchParams();
  if (source) params.set('source', source);
  if (speed !== undefined) params.set('speed', String(speed));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/replay/reset${qs}`, { method: 'POST' });
  return handleResponse<ReplayStatusResponse>(res);
};

/** Get model metrics */
export const fetchMetrics = async (): Promise<Record<string, any>> => {
  const res = await fetch(`${API_BASE}/metrics`);
  return handleResponse<Record<string, any>>(res);
};

/** Get decision policy */
export const fetchPolicy = async (): Promise<Record<string, any>> => {
  const res = await fetch(`${API_BASE}/policy`);
  return handleResponse<Record<string, any>>(res);
};

/** Get rules engine configuration */
export const fetchRules = async (): Promise<RulesData> => {
  const res = await fetch(`${API_BASE}/rules`);
  return handleResponse<RulesData>(res);
};

/** Live risk calculator prediction */
export const predictRisk = async (body: PredictRequest): Promise<PredictResult> => {
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<PredictResult>(res);
};

/** Live risk calculator metadata */
export const fetchPredictInfo = async (): Promise<Record<string, any>> => {
  const res = await fetch(`${API_BASE}/predict/info`);
  return handleResponse<Record<string, any>>(res);
};

/** Preset CDM scenarios */
export const fetchPredictPresets = async (): Promise<Record<string, CdmInputRow[]>> => {
  const res = await fetch(`${API_BASE}/predict/presets`);
  return handleResponse<Record<string, CdmInputRow[]>>(res);
};

/** Full learning agent results */
export const fetchLearning = async (): Promise<Record<string, any>> => {
  const res = await fetch(`${API_BASE}/learning`);
  return handleResponse<Record<string, any>>(res);
};

/** Learned Q-table policy */
export const fetchLearnedPolicy = async (): Promise<any[]> => {
  const res = await fetch(`${API_BASE}/learning/policy`);
  return handleResponse<any[]>(res);
};

/** Slice of MESA simulation frames */
export const fetchSimulationFrames = async (
  start: number = 0,
  count: number = 30
): Promise<SimulationFramesResponse> => {
  const res = await fetch(`${API_BASE}/simulation/frames?start=${start}&count=${count}`);
  return handleResponse<SimulationFramesResponse>(res);
};

// ── Mock Replay Fallback ───────────────────────────────────────────────────────

export const startMock = (cb: (msg: StreamMessage) => void) => {
  import('../data/replay_demo_v4.json')
    .then((module) => {
      const mockData = module.default || module;
      if (!Array.isArray(mockData)) return;

      mockData.forEach((row: any) => {
        const base = {
          schema_version: '1.0',
          message_id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
          event_id: String(row.event_id),
          emitted_at: new Date().toISOString(),
        } as any;

        const state: StateUpdate = {
          ...base,
          msg_type: 'STATE_UPDATE',
          source_agent: 'tracking',
          payload: {
            step: row.step,
            n_steps: row.n_steps,
            time_to_tca_hours: row.time_to_tca_hours,
            miss_distance_m: row.miss_distance_m,
            relative_speed_ms: row.relative_speed_ms,
            log10_pc: row.log10_pc,
            collision_probability: row.collision_probability,
            pc_trend: 'stable',
            deltas: { log10_pc: null, miss_distance_m: null },
          },
        };
        cb(state);

        if (row.risk_score !== null && row.risk_score !== undefined) {
          const risk: RiskAlert = {
            ...base,
            msg_type: 'RISK_ALERT',
            source_agent: 'risk',
            payload: {
              risk_score: row.risk_score,
              risk_level: row.risk_level,
              phase: row.phase,
              top_drivers: row.top_drivers,
              rule_points: row.rule_points,
              ml_score: row.ml_score,
            },
          };
          cb(risk);
        }

        if (row.is_decision_point) {
          const decision: ManeuverDecision = {
            ...base,
            msg_type: 'MANEUVER_DECISION',
            source_agent: 'maneuver',
            payload: {
              decision: row.decision,
              phase: row.phase,
              rationale: row.decision === 'MANEUVER' && row.maneuver_plan?.burn_needed === false
                ? 'Refine tracking first, no burn needed.'
                : 'Demo assessment',
              suggested_delta_v_ms: row.maneuver_plan?.fuel_proxy ?? null,
              rule_points: row.rule_points,
              maneuver_plan: row.maneuver_plan,
              alert_route: row.alert_route,
            },
          };
          cb(decision);
        }
      });
    })
    .catch((err) => {
      console.warn('Could not load mock fallback data:', err);
    });

  return () => {};
};


