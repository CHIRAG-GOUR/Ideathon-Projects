// Smart LPG Cylinder Safety Dock — deterministic simulation engine (single source of truth for the web app;
// mobile/…/engine/Engine.java is a line-by-line port, checked against fixtures/ by a parity test).
//
// Layers (each step, fixed dt):
//   1. Director  — the scripted scenario (cooking at 00:00, leak at 00:08) and user fault injections
//   2. Physics   — a SIMPLIFIED ILLUSTRATIVE model of the kitchen: gas, temperature, tilt, flow, cylinder mass.
//                  It is NOT a physical gas-dispersion or LPG-behaviour model.
//   3. Dock      — the safety engine: thresholds → anomaly/warning/critical → simulated automatic shutoff → contained.
//                  Only present in the "with" scenario. It sees sensor readings only, exactly like future hardware would.
//   4. Chef      — character behaviour driven by what the chef can know (alarm vs. noticing late).
// Every change is recorded as an event; the UI, 3D scene, sounds and timeline only read this state.

import CFG from '../dock-config.json';

export type Config = typeof CFG;
export const CONFIG: Config = CFG;

export type Scenario = 'without' | 'with';
export type Mode = 'scripted' | 'free';
export type Phase = 'IDLE' | 'COOKING' | 'ANOMALY' | 'WARNING' | 'CRITICAL' | 'RESPONSE' | 'CONTAINED' | 'LEAK' | 'DANGER' | 'INCIDENT' | 'RECOVERY';
export type SafetyState = 'NORMAL' | 'ANOMALY' | 'WARNING' | 'CRITICAL' | 'ISOLATED' | 'SAFE' | 'UNMONITORED';
export type Usage = 'IDLE' | 'NORMAL' | 'HIGH' | 'ABNORMAL';
export type Supply = 'OPEN' | 'CLOSING' | 'ISOLATED';
export type ChefAction = 'idle' | 'cooking' | 'noticing' | 'alerted' | 'walking' | 'fleeing' | 'exited' | 'relieved';
export type Fault = 'leak' | 'heat' | 'tilt' | 'usage';
export type Sensor = 'gas' | 'temp' | 'tilt' | 'usage';
export type Level = 0 | 1 | 2 | 3; // normal, anomaly, warning, critical
export type EventLevel = 'info' | 'notice' | 'warning' | 'critical' | 'success';

export interface SimEvent {
  seq: number;
  t: number;
  kind: string;
  level: EventLevel;
  text: string;
}

export interface Sample {
  t: number;
  gas: number;
  temp: number;
  tilt: number;
  flow: number;
}

export interface SimState {
  scenario: Scenario;
  mode: Mode;
  t: number;
  phase: Phase;
  gas: number;
  temp: number;
  tilt: number;
  flow: number;
  cylinderKg: number;
  usage: Usage;
  supply: Supply;
  burner: boolean;
  dock: 'CONNECTED' | 'NOT_INSTALLED';
  safety: SafetyState;
  alarm: 'none' | 'warning' | 'critical';
  levels: Record<Sensor, Level>;
  leak: { active: boolean; introduced: boolean; tau: number; mult: number; excess: number };
  faults: { heatAt: number; tilt: boolean; usage: boolean; usageSince: number };
  chef: { action: ChefAction; x: number; z: number; heading: number; wp: number; since: number };
  timers: { warningAt: number; shutoffAt: number; isolatedAt: number; clearSince: number; dangerAt: number; incidentAt: number; containedAt: number };
  flags: { gasRisingLogged: boolean; heatBoost: boolean; usageLogged: boolean };
  outcome: 'NONE' | 'CONTAINED' | 'ESCALATION';
  events: SimEvent[];
  history: Sample[];
  seq: number;
}

const NONE = -1;
const r2 = (x: number) => Math.round(x * 100) / 100;
export const fmtGas = (g: number) => g.toFixed(2);
export const fmtTemp = (c: number) => c.toFixed(1);
export const fmtTilt = (d: number) => d.toFixed(1);
export const fmtClock = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

/** Threshold level for one reading (the same table the dock uses). */
export function levelOf(sensor: 'gas' | 'temp' | 'tilt', v: number, c: Config = CONFIG): Level {
  const th = c.thresholds[sensor];
  return v >= th.critical ? 3 : v >= th.warning ? 2 : v >= th.anomaly ? 1 : 0;
}

export function createState(scenario: Scenario, mode: Mode = 'scripted', c: Config = CONFIG): SimState {
  const k = c.kitchen;
  return {
    scenario,
    mode,
    t: 0,
    phase: 'IDLE',
    gas: c.baseline.gas,
    temp: c.baseline.temp,
    tilt: c.baseline.tilt,
    flow: 0,
    cylinderKg: c.baseline.cylinderKg,
    usage: 'IDLE',
    supply: 'OPEN',
    burner: false,
    dock: scenario === 'with' ? 'CONNECTED' : 'NOT_INSTALLED',
    safety: scenario === 'with' ? 'NORMAL' : 'UNMONITORED',
    alarm: 'none',
    levels: { gas: 0, temp: 0, tilt: 0, usage: 0 },
    leak: { active: false, introduced: false, tau: 0, mult: 1, excess: 0 },
    faults: { heatAt: NONE, tilt: false, usage: false, usageSince: NONE },
    chef: { action: 'idle', x: k.chefCook[0], z: k.chefCook[2], heading: Math.PI, wp: 0, since: 0 },
    timers: { warningAt: NONE, shutoffAt: NONE, isolatedAt: NONE, clearSince: NONE, dangerAt: NONE, incidentAt: NONE, containedAt: NONE },
    flags: { gasRisingLogged: false, heatBoost: false, usageLogged: false },
    outcome: 'NONE',
    events: [],
    history: [{ t: 0, gas: c.baseline.gas, temp: c.baseline.temp, tilt: c.baseline.tilt, flow: 0 }],
    seq: 0,
  };
}

function emit(s: SimState, kind: string, level: EventLevel, text: string) {
  s.events.push({ seq: ++s.seq, t: r2(s.t), kind, level, text });
}

function setChef(s: SimState, action: ChefAction) {
  if (s.chef.action !== action) {
    s.chef.action = action;
    s.chef.since = s.t;
  }
}

function startLeak(s: SimState, text: string) {
  s.leak.active = true;
  s.leak.introduced = true;
  if (s.phase === 'COOKING' && s.scenario === 'without') s.phase = 'LEAK';
  emit(s, 'leak_introduced', 'notice', text);
}

/** Apply a SIMULATION CONTROL (fault injection). Never a real-world instruction. */
export function inject(s: SimState, f: Fault, c: Config = CONFIG) {
  if (s.outcome !== 'NONE') return emit(s, 'fault_ignored', 'info', 'Simulation finished — restart to inject new faults');
  if (f === 'leak') {
    if (s.supply === 'ISOLATED') return emit(s, 'fault_ignored', 'info', 'Supply is isolated — the simulated leak cannot flow');
    if (!s.leak.active) startLeak(s, 'Fault injected: simulated gas leak at the regulator');
    else {
      s.leak.mult *= 1.5;
      emit(s, 'leak_increased', 'notice', `Fault injected: leak rate ×${s.leak.mult.toFixed(2)}`);
    }
  } else if (f === 'heat') {
    s.faults.heatAt = s.t;
    emit(s, 'fault_heat', 'notice', `Fault injected: temperature rise near the cylinder (towards ${c.faults.heatTargetC} °C)`);
  } else if (f === 'tilt') {
    s.faults.tilt = true;
    emit(s, 'fault_tilt', 'notice', `Fault injected: cylinder tilt (towards ${c.faults.tiltTargetDeg}°)`);
  } else {
    s.faults.usage = true;
    emit(s, 'fault_usage', 'notice', 'Fault injected: unusual usage — high gas flow with no cooking load');
  }
}

export function clearFaults(s: SimState) {
  s.faults.heatAt = NONE;
  s.faults.tilt = false;
  s.faults.usage = false;
  s.faults.usageSince = NONE;
  if (s.leak.active) s.leak.active = false;
  emit(s, 'faults_cleared', 'info', 'Simulation faults cleared');
}

/** Advance exactly one fixed step. */
export function step(s: SimState, c: Config = CONFIG) {
  const dt = c.stepSec;
  s.t = Math.round((s.t + dt) * 1e6) / 1e6;
  director(s, c);
  physics(s, dt, c);
  if (s.scenario === 'with') dock(s, c);
  else unprotected(s, c);
  chef(s, dt, c);
  if (Math.abs(s.t / 0.5 - Math.round(s.t / 0.5)) < 1e-6) {
    s.history.push({ t: s.t, gas: s.gas, temp: s.temp, tilt: s.tilt, flow: s.flow });
    if (s.history.length > 240) s.history.shift();
  }
}

/** Advance by wall-clock seconds (speed already applied); returns the leftover fraction to carry. */
export function advance(s: SimState, seconds: number, carry = 0, c: Config = CONFIG): number {
  let acc = carry + seconds;
  let n = 0;
  while (acc >= c.stepSec - 1e-9 && n < 400) {
    step(s, c);
    acc -= c.stepSec;
    n++;
  }
  return acc;
}

// ---------------------------------------------------------------- 1. Director
function director(s: SimState, c: Config) {
  if (s.phase === 'IDLE' && s.t >= c.script.cookingAtSec) {
    s.phase = 'COOKING';
    s.burner = true;
    setChef(s, 'cooking');
    emit(s, 'cooking_started', 'info', 'Cooking session started');
  }
  if (s.mode === 'scripted' && !s.leak.introduced && s.t >= c.script.leakAtSec && s.supply === 'OPEN' && s.outcome === 'NONE')
    startLeak(s, 'Simulated gas leak introduced at the regulator');
}

// ---------------------------------------------------------------- 2. Physics (illustrative)
function physics(s: SimState, dt: number, c: Config) {
  const b = c.baseline;
  // Gas: while the source flows, the room accumulates gas along a fixed curve (k·τ^p); once the source stops,
  // the exhaust clears the excess exponentially. Simplified on purpose so both apps produce identical numbers.
  const sourceOn = s.leak.active && s.supply !== 'ISOLATED' && s.timers.incidentAt === NONE;
  if (sourceOn) {
    const t0 = s.leak.tau;
    s.leak.tau = t0 + dt;
    s.leak.excess += s.leak.mult * c.leak.k * (Math.pow(s.leak.tau, c.leak.p) - Math.pow(t0, c.leak.p));
  } else {
    s.leak.excess *= Math.exp(-dt / c.leak.ventTauSec);
  }
  s.gas = b.gas + s.leak.excess;

  // Temperature near the cylinder.
  const heatOn = s.faults.heatAt !== NONE && s.t - s.faults.heatAt < c.faults.heatDurationSec;
  if (s.timers.incidentAt !== NONE && s.t - s.timers.incidentAt < 1.0) s.temp += (78 - s.temp) * (1 - Math.exp(-dt / 0.25));
  else if (heatOn) s.temp = Math.min(c.faults.heatTargetC, s.temp + c.faults.heatRatePerSec * dt);
  else {
    const target = b.temp + (s.burner ? 0.3 : 0.1);
    const tau = s.temp > b.temp + 2 ? c.faults.coolTauSec : 60;
    s.temp += (target - s.temp) * (1 - Math.exp(-dt / tau));
  }

  // Tilt (dock load-cell / IMU concept).
  if (s.timers.incidentAt !== NONE) s.tilt = Math.min(34, s.tilt + 40 * dt);
  else if (s.faults.tilt) s.tilt = Math.min(c.faults.tiltTargetDeg, s.tilt + c.faults.tiltRatePerSec * dt);
  else s.tilt = Math.max(b.tilt, s.tilt - c.faults.tiltRatePerSec * dt);

  // Flow and usage pattern (weight-based consumption concept).
  const isolated = s.supply === 'ISOLATED' || s.timers.incidentAt !== NONE;
  s.flow = isolated ? 0 : (s.faults.usage ? c.faults.usageFlow : s.burner ? b.cookingFlow : 0) + (sourceOn ? 0.06 : 0);
  s.cylinderKg = Math.max(0, s.cylinderKg - (s.flow / 3600) * dt);
  s.usage = s.flow < 0.01 ? 'IDLE' : s.flow < 0.8 ? 'NORMAL' : s.flow < c.thresholds.usage.abnormalFlow ? 'HIGH' : 'ABNORMAL';
  if (s.usage === 'ABNORMAL') {
    if (s.faults.usageSince === NONE) s.faults.usageSince = s.t;
  } else s.faults.usageSince = NONE;
}

// ---------------------------------------------------------------- 3. Smart Dock safety engine
function dock(s: SimState, c: Config) {
  const usageHeld = s.faults.usageSince !== NONE && s.t - s.faults.usageSince >= c.thresholds.usage.abnormalSustainSec;
  s.levels = {
    gas: levelOf('gas', s.gas, c),
    temp: levelOf('temp', s.temp, c),
    tilt: levelOf('tilt', s.tilt, c),
    usage: usageHeld ? 2 : s.usage === 'ABNORMAL' ? 1 : 0,
  };
  const L = s.levels;
  const max = Math.max(L.gas, L.temp, L.tilt, L.usage) as Level;
  const worst = (lvl: number): Sensor => (['gas', 'temp', 'tilt', 'usage'] as Sensor[]).find((k) => L[k] >= lvl)!;
  const reading = (k: Sensor) => (k === 'gas' ? `${fmtGas(s.gas)} ppm` : k === 'temp' ? `${fmtTemp(s.temp)} °C` : k === 'tilt' ? `${fmtTilt(s.tilt)}°` : `${s.flow.toFixed(2)} kg/h`);
  const NAME: Record<Sensor, string> = { gas: 'GAS', temp: 'TEMPERATURE', tilt: 'TILT', usage: 'USAGE' };

  if (s.supply === 'OPEN' && s.outcome === 'NONE') {
    if (max >= 1 && s.safety === 'NORMAL') {
      const k = worst(1);
      s.safety = 'ANOMALY';
      if (s.phase === 'COOKING') s.phase = 'ANOMALY';
      emit(s, 'anomaly', 'notice', `${NAME[k]} ANOMALY DETECTED — ${reading(k)}`);
    }
    if (max >= 2 && s.timers.warningAt === NONE) {
      const k = worst(2);
      s.timers.warningAt = s.t;
      s.safety = 'WARNING';
      s.phase = 'WARNING';
      s.alarm = 'warning';
      emit(s, 'warning', 'warning', `Safety threshold exceeded — ${NAME[k]} ${reading(k)} · Smart Dock alarm on`);
    }
    if (max >= 3 && s.safety !== 'CRITICAL') {
      const k = worst(3);
      s.safety = 'CRITICAL';
      s.phase = 'CRITICAL';
      s.alarm = 'critical';
      emit(s, 'critical', 'critical', `CRITICAL — ${NAME[k]} ${reading(k)}`);
    }
    if (s.timers.warningAt !== NONE && (s.t - s.timers.warningAt >= c.dock.confirmSec - 1e-9 || max >= 3)) {
      s.timers.shutoffAt = s.t;
      s.supply = 'CLOSING';
      s.phase = 'RESPONSE';
      emit(s, 'shutoff', 'warning', 'Simulated automatic shutoff initiated');
    }
  } else if (s.supply === 'CLOSING' && s.t - s.timers.shutoffAt >= c.dock.valveTravelSec - 1e-9) {
    s.supply = 'ISOLATED';
    s.timers.isolatedAt = s.t;
    s.safety = 'ISOLATED';
    if (s.burner) s.burner = false;
    emit(s, 'isolated', 'success', 'LPG SUPPLY ISOLATED (simulated)');
  } else if (s.supply === 'ISOLATED' && s.outcome === 'NONE') {
    const chefSafe = s.chef.action === 'exited' || s.chef.action === 'relieved';
    const clear = s.gas < c.dock.clearGas && L.temp === 0 && L.tilt === 0 && L.usage === 0 && chefSafe;
    if (!clear) s.timers.clearSince = NONE;
    else if (s.timers.clearSince === NONE) s.timers.clearSince = s.t;
    else if (s.t - s.timers.clearSince >= c.dock.clearHoldSec - 1e-9) {
      s.phase = 'CONTAINED';
      s.safety = 'SAFE';
      s.alarm = 'none';
      s.outcome = 'CONTAINED';
      s.timers.containedAt = s.t;
      emit(s, 'contained', 'success', 'INCIDENT CONTAINED — no simulated blast occurred');
    }
  }
}

// ---------------------------------------------------------------- 3b. No dock: nobody is warned
function unprotected(s: SimState, c: Config) {
  const u = c.unprotected;
  if (s.timers.incidentAt !== NONE) {
    if (s.phase === 'INCIDENT' && s.t - s.timers.incidentAt >= u.incidentSec - 1e-9) {
      s.phase = 'RECOVERY';
      s.outcome = 'ESCALATION';
      emit(s, 'recovery', 'info', 'Simulation frozen — outcome: INCIDENT ESCALATION');
    }
    return;
  }
  if (!s.leak.active && s.tilt >= u.tiltLeakDeg && s.supply === 'OPEN') startLeak(s, 'Cylinder tilt strains the regulator — simulated leak begins (unnoticed)');
  if (s.leak.active && !s.flags.heatBoost && s.temp >= u.heatLeakTemp) {
    s.flags.heatBoost = true;
    s.leak.mult *= 2;
    emit(s, 'heat_leak', 'notice', 'High temperature near the cylinder — simulated leak worsens (unnoticed)');
  }
  if (s.usage === 'ABNORMAL' && !s.flags.usageLogged) {
    s.flags.usageLogged = true;
    emit(s, 'usage_unnoticed', 'notice', 'Unusual usage pattern — nobody is monitoring it');
  }
  if (s.leak.active && !s.flags.gasRisingLogged && s.gas >= c.thresholds.gas.warning) {
    s.flags.gasRisingLogged = true;
    emit(s, 'gas_rising', 'notice', `Gas level rising — ${fmtGas(s.gas)} ppm (no alarm, no sensor)`);
  }
  if (s.timers.dangerAt === NONE && s.gas >= u.dangerGas) {
    s.timers.dangerAt = s.t;
    s.phase = 'DANGER';
    emit(s, 'danger', 'critical', `DANGER — ${fmtGas(s.gas)} ppm with no early warning`);
  }
  if (s.gas >= u.incidentGas) {
    s.timers.incidentAt = s.t;
    s.phase = 'INCIDENT';
    s.burner = false;
    s.leak.active = false;
    emit(s, 'incident', 'critical', 'SIMULATED INCIDENT — FOR DEMONSTRATION ONLY');
  }
}

// ---------------------------------------------------------------- 4. Chef
function chef(s: SimState, dt: number, c: Config) {
  const ch = s.chef;
  const since = s.t - ch.since;
  if (s.scenario === 'with') {
    if (s.timers.warningAt !== NONE && (ch.action === 'cooking' || ch.action === 'idle')) {
      setChef(s, 'alerted');
      emit(s, 'chef_alerted', 'warning', 'Chef alerted by the Smart Dock alarm');
    } else if (ch.action === 'alerted' && since >= 0.6) {
      if (s.burner) {
        s.burner = false;
        emit(s, 'burner_off', 'info', 'Chef stopped cooking — burner off');
      }
      setChef(s, 'walking');
    } else if (ch.action === 'exited' && s.outcome === 'CONTAINED' && s.t - s.timers.containedAt >= c.chef.relievedAfterSec - 1e-9) {
      setChef(s, 'relieved');
      emit(s, 'relieved', 'success', 'All clear — chef relieved (“whew”)');
    }
  } else {
    if (s.timers.dangerAt !== NONE && (ch.action === 'cooking' || ch.action === 'idle')) {
      setChef(s, 'noticing');
      emit(s, 'chef_noticed', 'warning', 'Chef notices the problem — too late for an early warning');
    } else if (ch.action === 'noticing' && since >= c.unprotected.reactionSec - 1e-9) {
      setChef(s, 'fleeing');
      emit(s, 'chef_fleeing', 'warning', 'Chef leaves the cooking area');
    }
  }
  if (ch.action === 'walking' || ch.action === 'fleeing') {
    const speed = ch.action === 'walking' ? c.chef.calmSpeed : c.chef.fleeSpeed;
    let budget = speed * dt;
    const path = c.kitchen.path;
    while (budget > 0 && ch.wp < path.length) {
      const [tx, , tz] = path[ch.wp];
      const dx = tx - ch.x, dz = tz - ch.z;
      const d = Math.hypot(dx, dz);
      ch.heading = Math.atan2(dx, dz);
      if (d <= budget) {
        ch.x = tx;
        ch.z = tz;
        budget -= d;
        ch.wp++;
      } else {
        ch.x += (dx / d) * budget;
        ch.z += (dz / d) * budget;
        budget = 0;
      }
    }
    if (ch.wp >= path.length) {
      setChef(s, 'exited');
      ch.heading = Math.PI / 3; // turns back towards the kitchen
      emit(s, 'chef_exited', 'info', 'Chef is out of the immediate kitchen zone');
    }
  }
}

/** One readable summary of the current situation (used by headers, screen readers and the Android app). */
export function headline(s: SimState): string {
  if (s.scenario === 'with') {
    switch (s.phase) {
      case 'IDLE': return 'Smart Dock ready';
      case 'COOKING': return 'PROTECTED — cooking normally';
      case 'ANOMALY': return 'GAS ANOMALY DETECTED';
      case 'WARNING': return 'EARLY WARNING — alarm sounding';
      case 'CRITICAL': return 'CRITICAL — shutting off supply';
      case 'RESPONSE': return s.supply === 'ISOLATED' ? 'LPG SUPPLY ISOLATED' : 'SIMULATED AUTOMATIC SHUTOFF';
      case 'CONTAINED': return 'INCIDENT CONTAINED';
      default: return s.phase;
    }
  }
  switch (s.phase) {
    case 'IDLE': return 'No monitoring installed';
    case 'COOKING': return 'Cooking — no monitoring';
    case 'LEAK': return 'Leak in progress — nobody knows';
    case 'DANGER': return 'DANGER — no early warning';
    case 'INCIDENT': return 'SIMULATED INCIDENT';
    case 'RECOVERY': return 'INCIDENT ESCALATION';
    default: return s.phase;
  }
}

/** Run a whole scenario headless (tests, fixtures, presentation previews). */
export function runScenario(scenario: Scenario, seconds: number, injections: { at: number; fault: Fault | 'clear' }[] = [], mode: Mode = 'scripted', c: Config = CONFIG): SimState {
  const s = createState(scenario, mode, c);
  const queue = [...injections].sort((a, b) => a.at - b.at);
  const steps = Math.round(seconds / c.stepSec);
  for (let i = 0; i < steps; i++) {
    while (queue.length && queue[0].at <= s.t + 1e-9) {
      const q = queue.shift()!;
      if (q.fault === 'clear') clearFaults(s);
      else inject(s, q.fault, c);
    }
    step(s, c);
  }
  return s;
}
