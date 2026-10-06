// Shelf Rush, live: one store day simulated step by step. Customers arrive through the day, walk the aisles on a path
// graph (never through shelves), keep their distance from each other, take the product they came for from the shelf
// front, queue at the counter, get scanned, pay and leave. A worker carries stock from the stockroom to the shelves —
// driven by the player, by habit (refill only when empty, newest stock in front) or by SmartShelf (refill early,
// oldest date in front). Pure TypeScript: the 3D scene steps it in real time, tests and "finish day" step it headless.
import { DAYS, ITEMS, SHELF_CAP, dateOf, expiringOn, rng, units, wanted, type Batch, type DayLog, type Plan, type SimState } from './sim';

export type WorkerPolicy = 'player' | 'habit' | 'smart';
export interface V { x: number; z: number }

export const DAY_LEN = 90; // seconds of store time per day at 1×
const OPEN_FOR = 0.8; // customers arrive during the first 80% of the day
const WALK = 1.1, WORKER_WALK = 1.55; // units per second
const PICK_T = 1.4, PAY_T = 1.9, STOCK_T = 2.4; // seconds
const RADIUS = 0.27; // personal space

// ---------------------------------------------------------------- store layout (shared with the 3D scene)
export const SHELF_X = [-4.4, -1.5, 1.5, 4.4];
export const shelfPos = (i: number): V => (i < 4 ? { x: SHELF_X[i], z: -3 } : { x: SHELF_X[i - 4], z: 0.2 });
export const COUNTER = { x: -3.4, z: 3.85, w: 2.4, d: 0.6 };
export const CASHIER: V = { x: -3.4, z: 3.15 };
export const spot = (k: number): V => ({ x: -3.4 + 0.8 * k, z: 4.6 });
export const DOOR: V = { x: -5.8, z: 5.2 };
export const STOCKROOM: V = { x: -6.25, z: -1.45 };
const FZ = 1.65, MZ = -1.45; // front corridor, middle aisle
const LANE_X = [-6.0, -4.4, -1.5, 0, 1.5, 4.4, 6.0];

/** Obstacles people must not walk into: shelf units and the counter (axis-aligned boxes, with a little margin). */
const OBSTACLES = [
  ...ITEMS.map((_, i) => { const p = shelfPos(i); return { x0: p.x - 1.2, x1: p.x + 1.2, z0: p.z - 0.4, z1: p.z + 0.4 }; }),
  { x0: COUNTER.x - COUNTER.w / 2 - 0.05, x1: COUNTER.x + COUNTER.w / 2 + 0.05, z0: COUNTER.z - COUNTER.d / 2 - 0.05, z1: COUNTER.z + COUNTER.d / 2 + 0.05 },
];
const blocked = (p: V) => p.x < -6.35 || p.x > 6.35 || p.z < -3.45 || p.z > 5.4 || OBSTACLES.some((o) => p.x > o.x0 && p.x < o.x1 && p.z > o.z0 && p.z < o.z1);

// path graph
interface Node { id: string; p: V; to: string[] }
const NODES: Record<string, Node> = {};
const node = (id: string, p: V) => (NODES[id] = { id, p, to: [] });
const link = (a: string, b: string) => { NODES[a].to.push(b); NODES[b].to.push(a); };
LANE_X.forEach((x, i) => {
  node(`F${i}`, { x, z: FZ });
  node(`M${i}`, { x, z: MZ });
  if (i) { link(`F${i - 1}`, `F${i}`); link(`M${i - 1}`, `M${i}`); }
});
[0, 3, 6].forEach((i) => link(`F${i}`, `M${i}`)); // side lanes and the centre gap
node('door', DOOR); node('entry', { x: -5.9, z: 3.6 }); link('door', 'entry'); link('entry', 'F0');
node('stock', STOCKROOM); link('stock', 'M0');
node('queue', { x: -1.5, z: 4.6 }); link('queue', 'F2');
ITEMS.forEach((it, i) => {
  const p = shelfPos(i), lane = LANE_X.indexOf(p.x);
  node(`pick:${it.id}`, { x: p.x, z: i < 4 ? -2.1 : 1.1 });
  link(`pick:${it.id}`, `${i < 4 ? 'M' : 'F'}${lane}`);
});
const dist = (a: V, b: V) => Math.hypot(a.x - b.x, a.z - b.z);
/** Shortest route between two nodes (Dijkstra on a ~30-node graph), as the points to walk through. */
export function route(from: string, to: string): V[] {
  const d: Record<string, number> = { [from]: 0 }, prev: Record<string, string> = {}, done = new Set<string>();
  while (true) {
    let u: string | null = null;
    for (const k in d) if (!done.has(k) && (u === null || d[k] < d[u])) u = k;
    if (u === null || u === to) break;
    done.add(u);
    for (const v of NODES[u].to) {
      const nd = d[u] + dist(NODES[u].p, NODES[v].p);
      if (d[v] === undefined || nd < d[v]) { d[v] = nd; prev[v] = u; }
    }
  }
  const out: V[] = [];
  for (let k = to; k !== from; k = prev[k]) out.unshift({ ...NODES[k].p });
  return out;
}

// ---------------------------------------------------------------- live state
export type CustomerPhase = 'waiting' | 'toShelf' | 'picking' | 'toQueue' | 'queue' | 'paying' | 'leaving' | 'gone';
export interface Customer {
  id: number; item: string; want: number; look: number; arrive: number;
  phase: CustomerPhase; pos: V; heading: number; path: V[]; timer: number; got: number; paid: boolean;
}
export interface Worker { pos: V; heading: number; path: V[]; phase: 'idle' | 'toShelf' | 'stocking' | 'back'; task: string | null; timer: number }
export interface LiveEvent { t: number; kind: 'pay' | 'miss' | 'restock' | 'noStock'; item: string; text: string; at: V }
export interface LiveDay {
  day: number; time: number; plan: Plan; policy: WorkerPolicy; base: SimState;
  items: Record<string, { shelf: Batch[]; back: Batch[]; discount: boolean }>;
  customers: Customer[]; worker: Worker; tasks: string[]; queue: number[]; serving: number | null;
  sold: Record<string, number>; missed: Record<string, number>; revenue: number; events: LiveEvent[]; ended: boolean;
}

const cloneBatches = (bs: Batch[]) => bs.map((b) => ({ ...b }));
const priceOf = (L: LiveDay, id: string) => ITEMS.find((i) => i.id === id)!.price * (L.items[id].discount ? 0.85 : 1);

/** Opens the day: the morning delivery goes to the stockroom, the day's customers are scheduled (same for every policy). */
export function startLive(state: SimState, plan: Plan, policy: WorkerPolicy): LiveDay {
  const d = state.day;
  const items: LiveDay['items'] = {};
  for (const it of ITEMS) {
    const st = state.items[it.id];
    const back = cloneBatches(st.back);
    const q = Math.max(0, Math.round(plan.order[it.id] ?? 0));
    if (q > 0) back.push({ qty: q, expiresDay: it.shelfLife === null ? null : d + it.shelfLife - 1 });
    items[it.id] = { shelf: cloneBatches(st.shelf), back, discount: !!plan.discount[it.id] };
  }
  const customers: Customer[] = [];
  ITEMS.forEach((it, k) => {
    const r = rng(d * 977 + k * 131 + 7);
    let left = wanted(it, d, items[it.id].discount);
    while (left > 0) {
      const want = Math.min(left, it.base >= 8 ? 1 + Math.floor(r() * 3) : r() < 0.2 ? 2 : 1);
      left -= want;
      customers.push({ id: 0, item: it.id, want, look: Math.floor(r() * 1000), arrive: DAY_LEN * (0.02 + OPEN_FOR * r()), phase: 'waiting', pos: { ...DOOR }, heading: 0, path: [], timer: 0, got: 0, paid: false });
    }
  });
  customers.sort((a, b) => a.arrive - b.arrive).forEach((c, i) => (c.id = i));
  return {
    day: d, time: 0, plan, policy, base: state, items, customers,
    worker: { pos: { ...STOCKROOM }, heading: 0, path: [], phase: 'idle', task: null, timer: 0 },
    tasks: [], queue: [], serving: null,
    sold: Object.fromEntries(ITEMS.map((i) => [i.id, 0])), missed: Object.fromEntries(ITEMS.map((i) => [i.id, 0])),
    revenue: 0, events: [], ended: false,
  };
}

export const shelfUnits = (L: LiveDay, id: string) => units(L.items[id].shelf);
export const backUnits = (L: LiveDay, id: string) => units(L.items[id].back);

/** Take n units from the front of the shelf; returns how many were there. */
function takeFront(shelf: Batch[], n: number) {
  let got = 0;
  while (n > 0 && shelf.length) {
    const t = Math.min(n, shelf[0].qty);
    shelf[0].qty -= t; n -= t; got += t;
    if (!shelf[0].qty) shelf.shift();
  }
  return got;
}

/**
 * Restock a shelf from the stockroom.
 * FIFO ("rotate"): all stock is ordered by date, the oldest goes on the shelf at the front, newer stock waits in the back.
 * LIFO (habit): the newest cartons are opened first and put in front; older stock stays behind and can expire unseen.
 */
export function restock(L: LiveDay, id: string, fifo: boolean) {
  const s = L.items[id], cap = SHELF_CAP[id];
  const key = (b: Batch) => b.expiresDay ?? 99;
  if (fifo) {
    const pool = [...s.shelf, ...s.back].filter((b) => b.qty > 0).sort((a, b) => key(a) - key(b));
    const shelf: Batch[] = [], back: Batch[] = [];
    let room = cap;
    for (const b of pool) {
      const on = Math.min(room, b.qty);
      if (on) shelf.push({ qty: on, expiresDay: b.expiresDay });
      if (b.qty > on) back.push({ qty: b.qty - on, expiresDay: b.expiresDay });
      room -= on;
    }
    s.shelf = shelf; s.back = back;
  } else {
    let room = cap - units(s.shelf);
    s.back.sort((a, b) => key(b) - key(a)); // newest first
    const front: Batch[] = [];
    for (const b of s.back) {
      const on = Math.min(room, b.qty);
      if (on) { front.push({ qty: on, expiresDay: b.expiresDay }); b.qty -= on; room -= on; }
    }
    s.back = s.back.filter((b) => b.qty > 0);
    s.shelf = [...front, ...s.shelf];
  }
}

/** SmartShelf's pick for the worker: the shelf that will run out soonest, or that hides older stock in the back. */
export function smartTask(L: LiveDay): { item: string; why: string } | null {
  let best: { item: string; why: string } | null = null, bestScore = 0;
  for (const it of ITEMS) {
    const s = L.items[it.id], sh = units(s.shelf), bk = units(s.back), cap = SHELF_CAP[it.id];
    if (!bk || L.tasks.includes(it.id) || L.worker.task === it.id) continue;
    const rate = Math.max(0.01, wanted(it, L.day, s.discount) / (DAY_LEN * OPEN_FOR)); // units per second
    const left = L.time < DAY_LEN * OPEN_FOR ? sh / rate : Infinity; // seconds until the shelf is empty
    const oldBack = Math.min(...s.back.map((b) => b.expiresDay ?? 99)), oldShelf = Math.min(99, ...s.shelf.map((b) => b.expiresDay ?? 99));
    let score = 0, why = '';
    if (sh === 0) { score = 3; why = 'Shelf is empty — customers are leaving without it'; }
    else if (left < 25) { score = 2 + 1 / left; why = `Selling fast — about ${Math.max(1, Math.round(left))}s of stock left on the shelf`; }
    else if (oldBack < oldShelf && oldBack <= L.day + 1) { score = 1.6; why = `${expiringOn(s.back, L.day + 1)} units in the back expire ${oldBack <= L.day ? 'today' : 'tomorrow'} — put them in front`; }
    else if (sh <= cap * 0.35) { score = 1; why = 'Shelf is running low'; }
    if (score > 0) score += Math.min(0.5, rate);
    if (score > bestScore && sh < cap + (oldBack < oldShelf ? 99 : 0)) { bestScore = score; best = { item: it.id, why }; }
  }
  return best;
}

function moveAlong(a: { pos: V; heading: number; path: V[] }, speed: number, dt: number) {
  let step = speed * dt;
  while (step > 0 && a.path.length) {
    const t = a.path[0], d = dist(a.pos, t);
    if (d > 1e-6) a.heading = Math.atan2(t.x - a.pos.x, t.z - a.pos.z);
    if (d <= step) { a.pos = { ...t }; a.path.shift(); step -= d; }
    else { a.pos = { x: a.pos.x + ((t.x - a.pos.x) / d) * step, z: a.pos.z + ((t.z - a.pos.z) / d) * step }; step = 0; }
  }
  return a.path.length === 0;
}

const event = (L: LiveDay, e: Omit<LiveEvent, 't'>) => { L.events.push({ ...e, t: L.time }); if (L.events.length > 30) L.events.shift(); };
const nodeOfPick = (id: string) => `pick:${id}`;
const workerSpot = (id: string): V => { const p = NODES[nodeOfPick(id)].p; return { x: p.x + 0.55, z: p.z }; };

/** Advance the day by dt seconds. */
export function stepLive(L: LiveDay, dt: number) {
  if (L.ended) return;
  L.time += dt;
  // customers
  for (const c of L.customers) {
    switch (c.phase) {
      case 'waiting':
        // people come in one at a time: wait outside while someone is standing in the doorway
        if (L.time >= c.arrive && !L.customers.some((o) => o !== c && o.phase !== 'waiting' && o.phase !== 'gone' && dist(o.pos, DOOR) < 0.75)) {
          c.phase = 'toShelf'; c.pos = { ...DOOR }; c.path = route('door', nodeOfPick(c.item));
        }
        break;
      case 'toShelf':
        if (moveAlong(c, WALK, dt)) { c.phase = 'picking'; c.timer = PICK_T; c.heading = Math.PI; } // face the shelf
        break;
      case 'picking':
        if ((c.timer -= dt) <= 0) {
          c.got = takeFront(L.items[c.item].shelf, c.want);
          L.sold[c.item] += c.got;
          L.missed[c.item] += c.want - c.got;
          if (c.got === 0) {
            c.phase = 'leaving'; c.path = route(nodeOfPick(c.item), 'door');
            event(L, { kind: 'miss', item: c.item, text: 'Out of stock!', at: c.pos });
          } else { c.phase = 'toQueue'; c.path = route(nodeOfPick(c.item), 'queue'); }
        }
        break;
      case 'toQueue':
        if (moveAlong(c, WALK, dt)) { c.phase = 'queue'; L.queue.push(c.id); }
        break;
      case 'queue': {
        const k = L.queue.indexOf(c.id), target = spot(k);
        c.path = dist(c.pos, target) > 0.02 ? [target] : [];
        moveAlong(c, WALK, dt);
        if (!c.path.length) c.heading = Math.PI; // face the counter
        if (k === 0 && L.serving === null && dist(c.pos, target) < 0.05) { L.serving = c.id; c.phase = 'paying'; c.timer = PAY_T; }
        break;
      }
      case 'paying':
        if ((c.timer -= dt) <= 0) {
          const amount = Math.round(priceOf(L, c.item) * c.got);
          L.revenue += amount; c.paid = true;
          event(L, { kind: 'pay', item: c.item, text: `+₹${amount}`, at: { x: COUNTER.x, z: COUNTER.z } });
          L.queue.shift(); L.serving = null;
          c.phase = 'leaving'; c.path = [{ x: -5.1, z: 4.9 }, { ...DOOR }];
        }
        break;
      case 'leaving':
        if (moveAlong(c, WALK, dt)) c.phase = 'gone';
        break;
    }
  }
  // keep personal space: people step gently sideways around each other (never forwards or backwards, so walking stays
  // smooth and nobody can block anyone), and never into a shelf or the counter
  const walking = L.customers.filter((c) => c.phase === 'toShelf' || c.phase === 'toQueue' || c.phase === 'leaving');
  const sidestep = (a: Customer, nx: number, nz: number, amount: number) => {
    const t = a.path[0];
    if (!t) return;
    const td = dist(a.pos, t);
    if (td < 0.35) return; // close to a turn or the destination: just walk there
    const ux = (t.x - a.pos.x) / td, uz = (t.z - a.pos.z) / td;
    const along = nx * ux + nz * uz;
    let lx = nx - along * ux, lz = nz - along * uz;
    const ll = Math.hypot(lx, lz);
    if (ll < 1e-3) { lx = -uz; lz = ux; } else { lx /= ll; lz /= ll; } // head-on: both step to their own right
    const p = { x: a.pos.x + lx * amount, z: a.pos.z + lz * amount };
    if (!blocked(p)) a.pos = p;
  };
  for (let i = 0; i < walking.length; i++) for (let j = i + 1; j < walking.length; j++) {
    const a = walking[i], b = walking[j], d = dist(a.pos, b.pos);
    if (d < RADIUS * 2) {
      const amount = Math.min(RADIUS * 2 - d, 0.5 * dt); // at most half a metre per second, sideways
      const nx = d > 1e-4 ? (a.pos.x - b.pos.x) / d : 1, nz = d > 1e-4 ? (a.pos.z - b.pos.z) / d : 0;
      sidestep(a, nx, nz, amount / 2);
      sidestep(b, -nx, -nz, amount / 2);
    }
  }
  // worker
  const w = L.worker;
  if (w.phase === 'idle') {
    let next: string | null = null;
    if (L.policy === 'player') next = L.tasks.shift() ?? null;
    else if (L.time < DAY_LEN * OPEN_FOR + 10) {
      if (L.policy === 'smart') next = smartTask(L)?.item ?? null;
      else next = ITEMS.find((it) => units(L.items[it.id].shelf) === 0 && units(L.items[it.id].back) > 0)?.id ?? null;
    }
    if (next) {
      if (!units(L.items[next].back)) event(L, { kind: 'noStock', item: next, text: 'Stockroom is empty — order more', at: STOCKROOM });
      else { w.task = next; w.phase = 'toShelf'; w.path = [...route('stock', nodeOfPick(next)), workerSpot(next)]; }
    }
  } else if (w.phase === 'toShelf') {
    if (moveAlong(w, WORKER_WALK, dt)) { w.phase = 'stocking'; w.timer = STOCK_T; w.heading = Math.PI; }
  } else if (w.phase === 'stocking') {
    if ((w.timer -= dt) <= 0) {
      const before = units(L.items[w.task!].shelf);
      restock(L, w.task!, L.policy !== 'habit');
      event(L, { kind: 'restock', item: w.task!, text: `Restocked +${Math.max(0, units(L.items[w.task!].shelf) - before)}`, at: w.pos });
      w.phase = 'back'; w.path = [NODES[nodeOfPick(w.task!)].p, ...route(nodeOfPick(w.task!), 'stock')];
    }
  } else if (w.phase === 'back') {
    if (moveAlong(w, WORKER_WALK, dt)) { w.phase = 'idle'; w.task = null; w.heading = Math.PI / 2; }
  }
  // the day ends when closing time has passed and the last customer is out
  if (L.time >= DAY_LEN && L.customers.every((c) => c.phase === 'gone') && (w.phase === 'idle' || w.phase === 'back')) L.ended = true;
}

/** Player: ask the worker to restock a shelf (queued; ignored if already queued). */
export function requestRestock(L: LiveDay, id: string) {
  if (L.worker.task === id || L.tasks.includes(id)) return false;
  L.tasks.push(id);
  return true;
}

/** Run the rest of the day without rendering. */
export function runToEnd(L: LiveDay, dt = 0.05) {
  let guard = 0;
  while (!L.ended && guard++ < 200000) stepLive(L, dt);
  return L;
}

/** Close the day: expired stock is thrown away (shelf and stockroom), sales are recorded, the next day begins. */
export function finishLive(L: LiveDay): SimState {
  const prev = L.base, d = L.day;
  const s: SimState = { day: d + 1, done: d + 1 >= DAYS.length, log: [...prev.log], items: {} };
  const log: DayLog = { day: d, sold: { ...L.sold }, missed: { ...L.missed }, wasted: {}, ordered: {}, discount: {} };
  for (const it of ITEMS) {
    const li = L.items[it.id];
    const keep = (b: Batch) => b.qty > 0 && !(b.expiresDay !== null && b.expiresDay <= d);
    log.wasted[it.id] = expiringOn(li.shelf, d) + expiringOn(li.back, d);
    log.ordered[it.id] = Math.max(0, Math.round(L.plan.order[it.id] ?? 0));
    log.discount[it.id] = li.discount;
    s.items[it.id] = { shelf: li.shelf.filter(keep), back: li.back.filter(keep), sales: { ...prev.items[it.id].sales, [dateOf(d)]: L.sold[it.id] }, discount: li.discount };
  }
  s.log.push(log);
  return s;
}

/** Headless day with a worker policy (tests, auto-play's "finish day", and the round comparison). */
export function playDay(prev: SimState, plan: Plan, policy: WorkerPolicy = 'smart'): SimState {
  return finishLive(runToEnd(startLive(prev, plan, policy)));
}

/** Store time as a wall clock: the day runs 9 AM – 9 PM. */
export const clockOf = (t: number) => {
  const mins = 9 * 60 + Math.round((Math.min(t, DAY_LEN) / DAY_LEN) * 12 * 60);
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
