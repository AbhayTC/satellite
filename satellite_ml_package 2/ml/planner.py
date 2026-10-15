"""Dijkstra-based planning for the satellite project (no machine learning).

1. plan_maneuver: minimum-cost burn schedule on a time-expanded graph (schematic: a 1-D offset along the CDM miss vector).
2. route_alert:   minimum-latency route from a satellite to the ground through an illustrative constellation network.
"""
import heapq, itertools, math


# ------------------------------------------------------------------ generic Dijkstra
def dijkstra(adj, source, targets=None):
    """adj: {node: [(neighbour, weight >= 0), ...]}. Returns (dist, prev). Stops at the first target reached."""
    dist, prev, done, tie = {source: 0.0}, {}, set(), itertools.count()
    pq = [(0.0, next(tie), source)]
    while pq:
        d, _, u = heapq.heappop(pq)
        if u in done:
            continue
        done.add(u)
        if targets and u in targets:
            break
        for v, w in adj.get(u, ()):
            nd = d + w
            if nd < dist.get(v, math.inf):
                dist[v], prev[v] = nd, u
                heapq.heappush(pq, (nd, next(tie), v))
    return dist, prev


def path_to(prev, source, target):
    if target != source and target not in prev:
        return None
    path = [target]
    while path[-1] != source:
        path.append(prev[path[-1]])
    return path[::-1]


# ------------------------------------------------------------------ 1. maneuver planning
def _model(d0_m, hours_to_tca, d_safe_m, step_hours, grid_m, max_offset_m, max_move_m, fuel_cost, hold_cost, lead_gain, late_steps=2, late_factor=3.0):
    steps = int(max(1, min(24, hours_to_tca // step_hours)))
    K, mv = int(round(max_offset_m / grid_m)), int(round(max_move_m / grid_m))
    # earlier burns need less fuel for the same separation; burns in the last `late_steps` steps carry an extra operational penalty
    fuel = lambda k, du: fuel_cost * abs(du) / (1.0 + lead_gain * (steps - 1 - k)) * (late_factor if k >= steps - late_steps else 1.0)
    hold = lambda u: hold_cost * abs(u)                                                 # time spent off the nominal orbit
    safe = lambda u: d0_m + u * grid_m >= d_safe_m
    return steps, K, mv, fuel, hold, safe


def plan_maneuver(d0_m, hours_to_tca, d_safe_m=2000.0, step_hours=6.0, grid_m=250.0, max_offset_m=4000.0,
                  max_move_m=1000.0, fuel_cost=1.0, hold_cost=0.02, lead_gain=0.5):
    """Cheapest schedule of offset changes (burns) so that the miss distance at closest approach is at least d_safe_m.
    Graph: node (k, u) = after k steps, offset u*grid_m along the miss vector; an edge changes the offset by at most max_move_m
    and costs fuel (a proxy proportional to the change) plus a holding cost; the goal is any final offset with a safe miss distance."""
    steps, K, mv, fuel, hold, safe = _model(d0_m, hours_to_tca, d_safe_m, step_hours, grid_m, max_offset_m, max_move_m, fuel_cost, hold_cost, lead_gain)
    adj = {}
    for k in range(steps):
        for u in range(-K, K + 1):
            adj[(k, u)] = [((k + 1, u2), fuel(k, u2 - u) + hold(u2)) for u2 in range(max(-K, u - mv), min(K, u + mv) + 1)]
    for u in range(-K, K + 1):
        if safe(u):
            adj[(steps, u)] = [("GOAL", 0.0)]
    dist, prev = dijkstra(adj, (0, 0), targets={"GOAL"})
    base = dict(d0_m=round(d0_m, 1), d_safe_m=d_safe_m, steps=steps, step_hours=step_hours)
    if "GOAL" not in dist:
        return dict(base, feasible=False, burn_needed=None, burns=[], total_cost=None, fuel_proxy=None, final_separation_m=None,
                    note="No schedule reaches the safe miss distance within the thrust and time limits.")
    path = path_to(prev, (0, 0), "GOAL")[:-1]
    burns, fuel_total = [], 0.0
    for k in range(steps):
        du = path[k + 1][1] - path[k][1]
        if du:
            f = fuel(k, du); fuel_total += f
            burns.append(dict(step=k, hours_before_tca=round(hours_to_tca - k * step_hours, 1), move_m=du * grid_m, fuel_proxy=round(f, 3)))
    final_u = path[-1][1]
    return dict(base, feasible=True, burn_needed=bool(burns), burns=burns, total_cost=round(dist["GOAL"], 3), fuel_proxy=round(fuel_total, 3),
                final_separation_m=round(d0_m + final_u * grid_m, 1),
                note="Predicted miss distance is already above the keep-out distance, so the risk comes from position uncertainty: refine the tracking before any burn." if not burns else "Schematic plan along the miss vector.")


def plan_maneuver_dp(d0_m, hours_to_tca, d_safe_m=2000.0, step_hours=6.0, grid_m=250.0, max_offset_m=4000.0,
                     max_move_m=1000.0, fuel_cost=1.0, hold_cost=0.02, lead_gain=0.5):
    """The same model solved by plain dynamic programming. Used only to check plan_maneuver."""
    steps, K, mv, fuel, hold, safe = _model(d0_m, hours_to_tca, d_safe_m, step_hours, grid_m, max_offset_m, max_move_m, fuel_cost, hold_cost, lead_gain)
    best = {u: (0.0 if u == 0 else math.inf) for u in range(-K, K + 1)}
    for k in range(steps):
        nxt = {u2: math.inf for u2 in range(-K, K + 1)}
        for u, c in best.items():
            if c < math.inf:
                for u2 in range(max(-K, u - mv), min(K, u + mv) + 1):
                    nxt[u2] = min(nxt[u2], c + fuel(k, u2 - u) + hold(u2))
        best = nxt
    costs = [c for u, c in best.items() if safe(u)]
    return min(costs) if costs else None


# ------------------------------------------------------------------ 2. alert routing
MU, R_E, C_KM_S = 398600.4418, 6371.0, 299792.458          # km^3/s^2, km, km/s


def _geometry(n_sats, alt_km, min_elev_deg):
    r = R_E + alt_km
    omega = math.sqrt(MU / r ** 3)                                       # orbital angular rate (rad/s)
    eps = math.radians(min_elev_deg)
    lam = math.acos(R_E / r * math.cos(eps)) - eps                       # largest central angle with a visible satellite
    return r, omega, lam


def route_alert(src, t_s, n_sats=12, alt_km=500.0, station_deg=(0.0, 110.0, 235.0), min_elev_deg=10.0, hop_ms=8.0, cross_skip=3):
    """Minimum-latency route from satellite `src` to any ground station at time t_s (seconds), using Dijkstra.
    Illustrative network: one ring of satellites, neighbour links and cross-links, stations that see satellites overhead."""
    r, omega, lam = _geometry(n_sats, alt_km, min_elev_deg)
    th = [2 * math.pi * k / n_sats + omega * t_s for k in range(n_sats)]
    ph = [math.radians(a) for a in station_deg]
    chord = lambda steps: 2 * r * math.sin(math.pi * steps / n_sats)
    ms = lambda km: km / C_KM_S * 1000.0 + hop_ms
    adj = {("S", k): [] for k in range(n_sats)}
    for k in range(n_sats):
        for s in (1, cross_skip):
            for j in ((k + s) % n_sats, (k - s) % n_sats):
                adj[("S", k)].append((("S", j), ms(chord(s))))
    visible, gaps = {}, []
    for j, p in enumerate(ph):
        adj[("G", j)] = [("GROUND", 0.0)]
        for k in range(n_sats):
            gap = abs((th[k] - p + math.pi) % (2 * math.pi) - math.pi)
            if gap <= lam:
                slant = math.sqrt(R_E ** 2 + r ** 2 - 2 * R_E * r * math.cos(gap))
                adj[("S", k)].append((("G", j), ms(slant)))
                visible.setdefault(k, []).append(j)
    # baseline: wait until the source satellite itself flies over a station
    ahead = [((p - th[src]) % (2 * math.pi)) for p in ph]
    direct_now = any(min(a, 2 * math.pi - a) <= lam for a in ahead)
    wait_s = 0.0 if direct_now else min((a - lam) / omega for a in ahead)
    dist, prev = dijkstra(adj, ("S", src), targets={"GROUND"})
    if "GROUND" not in dist:
        return dict(reachable=False, path=[], hops=None, latency_ms=None, baseline_wait_s=round(wait_s, 1), direct_visible=direct_now)
    path = [f"{a}{b}" for a, b in path_to(prev, ("S", src), "GROUND")[:-1]]
    return dict(reachable=True, path=path, hops=len(path) - 1, latency_ms=round(dist["GROUND"], 2), baseline_wait_s=round(wait_s, 1), direct_visible=direct_now)


def orbit_period_s(n_sats=12, alt_km=500.0):
    r, omega, _ = _geometry(n_sats, alt_km, 10.0)
    return 2 * math.pi / omega


def latency_profile(src, n_points=96, **kw):
    """Route latency and the direct-pass wait over one orbit, for plots."""
    T = orbit_period_s(kw.get("n_sats", 12), kw.get("alt_km", 500.0))
    return [dict(t_s=round(T * i / n_points, 1), **route_alert(src, T * i / n_points, **kw)) for i in range(n_points)]
