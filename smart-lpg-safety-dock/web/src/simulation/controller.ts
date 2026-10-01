// The web app's simulation runtime: owns engine state(s), the clock, speed and pause.
// UI and 3D never compute values themselves — they read controller.state.
import { advance, clearFaults, createState, inject, type Fault, type Mode, type Scenario, type SimState } from '@engine/engine';

type Listener = () => void;

export class SimController {
  state: SimState;
  running = false;
  speed = 1;
  version = 0;
  private carry = 0;
  private listeners = new Set<Listener>();
  /** Sessions are identified so persistence/sounds can tell runs apart. */
  sessionId = newId();
  startedAtWall = Date.now();

  constructor(public scenario: Scenario, public mode: Mode = 'scripted') {
    this.state = createState(scenario, mode);
  }
  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  notify() {
    this.version++;
    this.listeners.forEach((l) => l());
  }
  tick(wallDt: number) {
    if (!this.running) return;
    this.carry = advance(this.state, Math.min(wallDt, 0.25) * this.speed, this.carry);
    // The run ends on its own a few seconds after the outcome so the result stays on screen.
    const out = this.state.events.find((e) => e.kind === 'contained' || e.kind === 'recovery');
    if (out && this.state.t - out.t > 6) this.running = false;
  }
  start() {
    if (this.isFinished()) this.restart();
    this.running = true;
    this.notify();
  }
  pause() {
    this.running = false;
    this.notify();
  }
  restart(scenario = this.scenario, mode = this.mode, autostart = false) {
    this.scenario = scenario;
    this.mode = mode;
    this.state = createState(scenario, mode);
    this.carry = 0;
    this.sessionId = newId();
    this.startedAtWall = Date.now();
    this.running = autostart;
    this.notify();
  }
  inject(f: Fault) {
    inject(this.state, f);
    if (!this.running && this.state.outcome === 'NONE') this.running = true;
    this.notify();
  }
  clear() {
    clearFaults(this.state);
    this.notify();
  }
  setSpeed(x: number) {
    this.speed = x;
    this.notify();
  }
  isFinished() {
    return this.state.outcome !== 'NONE' && !this.running;
  }
}

/** Two engines on one clock: identical start, identical speed, identical timeline. */
export class CompareController {
  left = new SimController('without');
  right = new SimController('with');
  get running() {
    return this.left.running || this.right.running;
  }
  start() {
    if (this.left.isFinished() && this.right.isFinished()) this.restart();
    this.left.running = this.right.running = true;
    this.left.notify();
    this.right.notify();
  }
  pause() {
    this.left.pause();
    this.right.pause();
  }
  restart(autostart = false) {
    this.left.restart('without', 'scripted', autostart);
    this.right.restart('with', 'scripted', autostart);
  }
  setSpeed(x: number) {
    this.left.setSpeed(x);
    this.right.setSpeed(x);
  }
  tick(dt: number) {
    this.left.tick(dt);
    this.right.tick(dt);
  }
  /** The shared clock shown above both panels. */
  get t() {
    return Math.max(this.left.state.t, this.right.state.t);
  }
}

function newId() {
  const b = new Uint8Array(10);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(36).padStart(2, '0')).join('').slice(0, 16);
}

// ---- One shared clock for the whole app (paused automatically when the tab is hidden) ----
export const main = new SimController('with');
export const compare = new CompareController();

let last = 0;
let raf = 0;
const loop = (now: number) => {
  const dt = last ? (now - last) / 1000 : 0;
  last = now;
  if (!document.hidden) {
    const wasM = main.state.events.length, wasL = compare.left.state.events.length, wasR = compare.right.state.events.length;
    const tM = main.state.t, tL = compare.left.state.t;
    main.tick(dt);
    compare.tick(dt);
    if (main.state.t !== tM || main.state.events.length !== wasM) main.notify();
    if (compare.left.state.t !== tL || compare.left.state.events.length !== wasL || compare.right.state.events.length !== wasR) {
      compare.left.notify();
      compare.right.notify();
    }
  }
  raf = requestAnimationFrame(loop);
};
export function startClock() {
  if (!raf) raf = requestAnimationFrame(loop);
}
document.addEventListener('visibilitychange', () => {
  last = 0; // no time jump after the tab comes back
});
