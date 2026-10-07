/**
 * The film's world — a deterministic physics simulation, baked once (fixed step, 120 Hz) and sampled by time.
 * Nothing is random and nothing is hand-keyed where physics applies:
 *
 *  • Rider + motorcycle cruise (lean angle from lateral acceleration, wheel spin from distance).
 *  • The car's lane change is a PD steering controller; contact is detected with oriented-box (SAT) overlap.
 *  • Impact: momentum-conserving impulse with restitution along the contact normal → new linear velocities,
 *    yaw spin (r × J) and roll rate for the bike.
 *  • Bike: inverted-pendulum capsize under gravity, then sliding on its side with kinetic friction until rest.
 *  • Rider: partial momentum transfer at the seat, ballistic flight under gravity, tip-over, ground contact with
 *    restitution and sliding friction; he comes to rest wherever the physics puts him.
 *  • Car: keeps its post-impact momentum, the driver accelerates away (hit-and-run).
 *  • Traffic queueing behind the crash brakes with the deceleration needed to stop; cars pull aside for the
 *    ambulance with a lateral controller; the ambulance brakes at a fixed deceleration to stop at the scene.
 *  • People move with acceleration-limited speed profiles; their step phase comes from distance travelled
 *    (no foot sliding) and their heading from their velocity.
 *
 * Street coordinates (m): road along x; left-hand traffic: +x lanes at z = -2.0 / -5.4, -x lanes at +2.0 / +5.4;
 * footpaths at |z| ∈ [8, 11.5]. Heading convention: yaw 0 faces +x, positive yaw turns toward -z.
 */
import * as THREE from 'three';
import { DURATION, T_CRASH, T_SOS, clamp, lerp, seg } from './timeline';

export const LANE_IN = -2.0, LANE_OUT = -5.4, OPP_IN = 2.0, OPP_OUT = 5.4;
export const V_RIDER = 11;
export const PI = Math.PI;
const G = 9.81;
const DT = 1 / 120;
export type V3 = [number, number, number];

// ---------------------------------------------------------------------------------------------- physical constants
const M_BIKE = 180, M_RIDER = 75, M_CAR = 1350;
const E_IMPACT = 0.15; // restitution
const MU_BIKE = 0.45; // steel / plastic sliding on asphalt
const MU_BODY = 0.6; // clothing on asphalt
const H_COM = 0.72; // bike + rider centre of mass height (m)
/** Rider's pelvis relative to the bike origin when seated (behind the axle centre, above the seat). */
export const SEAT: [number, number] = [0.18, 1.0];
const BIKE_L = 2.1, BIKE_W = 0.72, CAR_L = 4.4, CAR_W = 1.78;

// ---------------------------------------------------------------------------------------------- helpers
const heading = (vx: number, vz: number, fallback = 0) => (Math.hypot(vx, vz) < 0.05 ? fallback : Math.atan2(-vz, vx));
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** Continuous angle: the representative of `a` nearest to `prev` (so recorded headings interpolate without a ±π flip). */
const cont = (prev: number, a: number) => prev + wrapAngle(a - prev);

/** Oriented rectangle in the x-z plane. */
interface Box { x: number; z: number; yaw: number; hl: number; hw: number }
const axes = (b: Box): [number, number][] => [[Math.cos(b.yaw), -Math.sin(b.yaw)], [Math.sin(b.yaw), Math.cos(b.yaw)]];
const corners = (b: Box): [number, number][] => {
  const [f, s] = axes(b);
  return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, c]) => [b.x + f[0] * b.hl * a + s[0] * b.hw * c, b.z + f[1] * b.hl * a + s[1] * b.hw * c]);
};
/** Separating-axis test. Returns the minimum-penetration normal pointing from `a` to `b`, or null. */
function sat(a: Box, b: Box): { n: [number, number]; depth: number; point: [number, number] } | null {
  let best: { n: [number, number]; depth: number } | null = null;
  const ca = corners(a), cb = corners(b);
  for (const ax of [...axes(a), ...axes(b)]) {
    const pa = ca.map((c) => c[0] * ax[0] + c[1] * ax[1]), pb = cb.map((c) => c[0] * ax[0] + c[1] * ax[1]);
    const o = Math.min(Math.max(...pa), Math.max(...pb)) - Math.max(Math.min(...pa), Math.min(...pb));
    if (o <= 0) return null;
    if (!best || o < best.depth) {
      const d = (b.x - a.x) * ax[0] + (b.z - a.z) * ax[1];
      best = { n: d >= 0 ? [ax[0], ax[1]] : [-ax[0], -ax[1]], depth: o };
    }
  }
  // contact point: the deepest corner of `a` inside `b` (else the mid-point)
  const inside = ca.filter(([x, z]) => { const [f, s] = axes(b); const dx = x - b.x, dz = z - b.z; return Math.abs(dx * f[0] + dz * f[1]) <= b.hl && Math.abs(dx * s[0] + dz * s[1]) <= b.hw; });
  const point: [number, number] = inside.length ? inside[0] : [(a.x + b.x) / 2, (a.z + b.z) / 2];
  return best ? { n: best.n, depth: best.depth, point } : null;
}

/** Acceleration-limited 1-D motion along a path of length L, starting at t0 (trapezoidal speed profile). */
function profile(L: number, vmax: number, amax: number, τ: number) {
  if (τ <= 0 || L <= 0) return { s: 0, v: 0 };
  const ta = vmax / amax, da = 0.5 * amax * ta * ta;
  if (2 * da >= L) { // triangular
    const tp = Math.sqrt(L / amax);
    if (τ < tp) return { s: 0.5 * amax * τ * τ, v: amax * τ };
    const r = Math.min(τ - tp, tp);
    return { s: L / 2 + amax * tp * r - 0.5 * amax * r * r, v: Math.max(0, amax * (tp - r)) };
  }
  const tc = (L - 2 * da) / vmax;
  if (τ < ta) return { s: 0.5 * amax * τ * τ, v: amax * τ };
  if (τ < ta + tc) return { s: da + vmax * (τ - ta), v: vmax };
  const r = Math.min(τ - ta - tc, ta);
  return { s: da + vmax * tc + vmax * r - 0.5 * amax * r * r, v: Math.max(0, vmax - amax * r) };
}

// ---------------------------------------------------------------------------------------------- recorded tracks
interface Track { t0: number; data: Float32Array; stride: number }
function record(t0: number, t1: number, stride: number) {
  const n = Math.ceil((t1 - t0) / DT) + 1;
  return { t0, data: new Float32Array(n * stride), stride, n };
}
function sample(tr: Track, t: number, out: number[]) {
  const n = tr.data.length / tr.stride;
  const f = clamp((t - tr.t0) / DT, 0, n - 1.0001);
  const i = Math.floor(f), k = f - i;
  for (let j = 0; j < tr.stride; j++) out[j] = tr.data[i * tr.stride + j] * (1 - k) + tr.data[(i + 1) * tr.stride + j] * k;
  return out;
}

// ---------------------------------------------------------------------------------------------- the bake
interface World {
  tImpact: number;
  bike: Track; // x z y yaw roll wheel
  rider: Track; // x y z tip(φ) spin(ψ)
  car: Track; // x z yaw wheel
  rest: V3; restSpin: number;
  /** where the bike first touched down on its side (start of its scrape mark), and when */
  bikeDown: V3; tBikeDown: number;
  /** contact point and the bike's velocity just after the impulse (debris inherits it) */
  impact: { x: number; z: number; vx: number; vz: number };
  bikeRest: V3;
  amb: Track; // x z yaw wheel speed
  aside: Track[]; // x z yaw
  queue: Track[]; // x z yaw braking
  ambStop: V3;
}

/** Rider + bike cruising before the crash (analytic: constant speed, a gentle steering weave). */
function cruise(t: number) {
  const A = 0.08, w = 0.7;
  const x = -230 + V_RIDER * t;
  const z = LANE_OUT + A * Math.sin(w * t);
  const vz = A * w * Math.cos(w * t);
  const az = -A * w * w * Math.sin(w * t);
  return { x, z, vx: V_RIDER, vz, yaw: heading(V_RIDER, vz), roll: Math.atan(az / G) };
}

let WORLD: World | null = null;
export function world(): World {
  if (WORLD) return WORLD;

  // ---- the car: cruise at 18 m/s in the inner lane, then a PD-steered lane change into the rider's lane
  const VC = 18;
  const tLC = T_CRASH - 1.7;
  const carZ = (dur: number) => { // integrate the lateral PD controller from tLC
    let z = LANE_IN, vz = 0;
    const steps = Math.max(0, Math.round(dur / DT));
    for (let i = 0; i < steps; i++) { const az = 7 * (-4.55 - z) - 4.6 * vz; vz += az * DT; z += vz * DT; }
    return { z, vz };
  };
  const bikeAt = T_CRASH;
  const c0 = cruise(bikeAt);
  // place the car so its nose meets the bike's tail at T_CRASH (then let the SAT test find the true contact)
  const xCarAtCrash = c0.x - BIKE_L / 2 - CAR_L / 2 + 0.55;
  const carPre = (t: number) => {
    const lat = t < tLC ? { z: LANE_IN, vz: 0 } : carZ(t - tLC);
    return { x: xCarAtCrash + VC * (t - T_CRASH), z: lat.z, vx: VC, vz: lat.vz };
  };

  // find the first contact (SAT) scanning forward from before the lane change
  let tImpact = T_CRASH;
  let hit: ReturnType<typeof sat> = null;
  // scan on the integration grid so the hand-over from cruise to post-impact integration is seamless
  for (let k = Math.round((tLC - 0.5) / DT); k * DT <= T_CRASH + 1.5; k++) {
    const t = k * DT;
    const c = carPre(t), b = cruise(t);
    const h = sat({ x: c.x, z: c.z, yaw: heading(c.vx, c.vz), hl: CAR_L / 2, hw: CAR_W / 2 }, { x: b.x, z: b.z, yaw: b.yaw, hl: BIKE_L / 2, hw: BIKE_W / 2 });
    if (h) { tImpact = t; hit = h; break; }
  }
  const cI = carPre(tImpact), bI = cruise(tImpact);
  const n = hit ? hit.n : ([0.9, -0.44] as [number, number]);
  const p = hit ? hit.point : ([bI.x - BIKE_L / 2, bI.z + 0.2] as [number, number]);

  // ---- impulse (bike + rider as one body at the instant of contact)
  const mB = M_BIKE + M_RIDER;
  const vrel = (cI.vx - bI.vx) * n[0] + (cI.vz - bI.vz) * n[1];
  const j = vrel > 0 ? ((1 + E_IMPACT) * vrel) / (1 / mB + 1 / M_CAR) : 0;
  const Jx = j * n[0], Jz = j * n[1];
  let bvx = bI.vx + Jx / mB, bvz = bI.vz + Jz / mB;
  const bvx0 = bvx, bvz0 = bvz;
  let cvx = cI.vx - Jx / M_CAR, cvz = cI.vz - Jz / M_CAR;
  const rx = p[0] - bI.x, rz = p[1] - bI.z;
  const Iyaw = (mB * (BIKE_L * BIKE_L + BIKE_W * BIKE_W)) / 12;
  let wYaw = (rz * Jx - rx * Jz) / Iyaw; // (r × J)_y
  // roll: the lateral impulse acts at bumper height (0.5 m), below the centre of mass
  const Iroll = mB * H_COM * H_COM;
  // torque about the roll axis: r × J with r = (0, 0.5 − H_COM, 0) → the top tips away from the push at the base
  let wRoll = ((0.5 - H_COM) * Jz) / Iroll;
  if (Math.abs(wRoll) < 0.4) wRoll = 0.4 * Math.sign(wRoll || 1);

  // ---- integrate everything after the impact
  const T1 = DURATION + 1;
  const bikeTr = record(0, T1, 6), riderTr = record(0, T1, 5), carTr = record(0, T1, 4);
  let bx = bI.x, bz = bI.z, by = 0, byaw = bI.yaw, broll = bI.roll, bwheel = 0, onSide = false;
  // rider: partial momentum transfer through the seat + rebound of the rear suspension (vertical)
  let rx_ = bI.x - SEAT[0], ry = SEAT[1], rz_ = bI.z;
  let rvx = bI.vx + 0.45 * (bvx - bI.vx), rvy = 1.6, rvz = bI.vz + 0.45 * (bvz - bI.vz) + 0.55 * wRoll * 1.0;
  let tip = 0, wTip = wRoll * 1.15, spin = 0, wSpin = wYaw * 0.8, grounded = false;
  let cx = cI.x, cz = cI.z, cwheel = 0;
  let distBike = 0;
  let bikeDown: V3 = [bI.x, 0, bI.z], tBikeDown = tImpact + 1;
  const iImpact = Math.round(tImpact / DT);
  for (let i = 0; i < bikeTr.n; i++) {
    const t = i * DT;
    if (i === iImpact) {
      // the instant of contact: positions are continuous, only the velocities have changed (the impulse)
      bikeTr.data.set([bx, bz, 0, byaw, broll, bwheel], i * 6);
      riderTr.data.set([rx_, ry, rz_, 0, 0], i * 5);
      carTr.data.set([cx, cz, heading(cI.vx, cI.vz), cwheel], i * 4);
      continue;
    }
    if (i < iImpact) {
      const b = cruise(t);
      distBike = b.x / 0.33;
      bikeTr.data.set([b.x, b.z, 0, b.yaw, b.roll, distBike], i * 6);
      riderTr.data.set([b.x - SEAT[0], SEAT[1], b.z, 0, 0], i * 5);
      const c = carPre(t);
      carTr.data.set([c.x, c.z, heading(c.vx, c.vz), c.x / 0.32], i * 4);
      bwheel = distBike + (V_RIDER / 0.33) * DT; cwheel = (c.x + VC * DT) / 0.32;
      continue;
    }
    // --- bike: capsize (inverted pendulum) then slide on its side
    if (!onSide) {
      const aRoll = (G / H_COM) * Math.sin(broll) - 0.6 * wRoll;
      wRoll += aRoll * DT; broll += wRoll * DT;
      if (Math.abs(broll) >= 1.32) { broll = 1.32 * Math.sign(broll); wRoll = -0.15 * wRoll; onSide = true; bikeDown = [bx, 0, bz]; tBikeDown = t; }
      // rolling on its wheels: small rolling resistance
      const sp = Math.hypot(bvx, bvz); if (sp > 0) { const d = Math.min(sp, 0.35 * DT); bvx -= (bvx / sp) * d; bvz -= (bvz / sp) * d; }
    } else {
      broll += wRoll * DT; wRoll *= 0.9;
      const sp = Math.hypot(bvx, bvz);
      if (sp > 0) { const d = Math.min(sp, MU_BIKE * G * DT); bvx -= (bvx / sp) * d; bvz -= (bvz / sp) * d; }
      const dw = Math.min(Math.abs(wYaw), 2.6 * DT); wYaw -= Math.sign(wYaw) * dw;
    }
    if (!onSide) { const dw = Math.min(Math.abs(wYaw), 0.8 * DT); wYaw -= Math.sign(wYaw) * dw; }
    bx += bvx * DT; bz += bvz * DT; byaw += wYaw * DT;
    by = onSide ? 0.02 : 0;
    bwheel += (onSide ? 0 : Math.hypot(bvx, bvz) / 0.33) * DT + (onSide ? 6 * Math.exp(-(t - tImpact)) * DT : 0);
    bikeTr.data.set([bx, bz, by, byaw, broll, bwheel], i * 6);

    // --- rider: tip over, ballistic flight, ground contact, sliding friction
    if (!grounded || Math.abs(tip) < PI / 2) {
      const aTip = Math.abs(tip) < PI / 2 ? (G / 1.0) * Math.sin(tip) : 0;
      wTip += aTip * DT; tip += wTip * DT;
      if (Math.abs(tip) >= PI / 2) { tip = (PI / 2) * Math.sign(tip); wTip = 0; }
    }
    rvy -= G * DT;
    rx_ += rvx * DT; ry += rvy * DT; rz_ += rvz * DT;
    const hMin = 0.14 + 0.62 * Math.max(0, Math.cos(tip));
    if (ry <= hMin) {
      ry = hMin;
      if (rvy < 0) rvy = -0.15 * rvy;
      if (Math.abs(rvy) < 0.3) rvy = 0;
      grounded = true;
      const sp = Math.hypot(rvx, rvz);
      if (sp > 0) { const d = Math.min(sp, MU_BODY * G * DT); rvx -= (rvx / sp) * d; rvz -= (rvz / sp) * d; }
      const ds = Math.min(Math.abs(wSpin), 9 * DT); wSpin -= Math.sign(wSpin) * ds;
      // a body lying on its side is unstable: gravity rolls it onto its back or front (potential −K·cos 2a)
      // (U = K·cos 2ψ: minima at ψ = ±π/2, face up or face down; on the side, ψ = 0 or π, is a maximum)
      if (Math.abs(Math.abs(tip) - PI / 2) < 0.05) { wSpin += 2 * 7 * Math.sin(2 * spin) * DT; wSpin *= 1 - 1.8 * DT; }
    }
    spin += wSpin * DT;
    riderTr.data.set([rx_, ry, rz_, tip, spin], i * 5);

    // --- car: keeps its momentum, the driver flees (accelerates, steers back into the inner lane)
    const τ = t - tImpact;
    const ax = τ > 0.4 && Math.hypot(cvx, cvz) < 22 ? 2.6 : 0; // floors it up to ~80 km/h
    const az = τ > 0.3 ? 5 * (LANE_IN - cz) - 3.8 * cvz : 0;
    cvx += ax * DT; cvz += az * DT;
    cx += cvx * DT; cz += cvz * DT;
    cwheel += (Math.hypot(cvx, cvz) / 0.32) * DT;
    carTr.data.set([cx, cz, heading(cvx, cvz), cwheel], i * 4);
  }
  const rest: V3 = [rx_, 0.14, rz_];
  const bikeRest: V3 = [bx, 0, bz];

  // ---- the ambulance: cruise at 16 m/s toward the scene, steer across, brake at 3.8 m/s² and stop just past him
  // so its rear doors open beside him. Its start point is solved so that it comes to rest at RESCUE.arrive.
  const ambStop: V3 = [rest[0] - 5.5, 0, clamp(rest[2] + 3.0, -6.5, 3.5)];
  const ambTr = record(0, T1, 5);
  const t0 = T_SOS + 24.5;
  const VA = 16, A_BRAKE = 3.8;
  let ayaw = PI;
  let ax_ = ambStop[0] + VA * (RESCUE.arrive - t0 - VA / A_BRAKE) + (VA * VA) / (2 * A_BRAKE), az_ = OPP_IN, avx = -VA, avz = 0, awheel = 0;
  for (let i = 0; i < ambTr.n; i++) {
    const t = i * DT;
    if (t >= t0 && t < RESCUE.depart) {
      const dist = ax_ - ambStop[0];
      const sp = -avx;
      const need = (sp * sp) / (2 * Math.max(dist, 0.01));
      const brake = need >= A_BRAKE * 0.98 || dist < 0.05;
      const acc = brake ? -Math.min(need, 6) : 0;
      const nsp = Math.max(0, sp + acc * DT);
      avx = -nsp;
      // lateral: once within 45 m, a PD controller steers to the stop lane (bounded by speed)
      const zt = dist < 45 ? ambStop[2] : OPP_IN;
      const azz = 3.2 * (zt - az_) - 3.0 * avz;
      avz += azz * DT;
      avz = clamp(avz, -0.35 * nsp - 0.01, 0.35 * nsp + 0.01);
      ax_ += avx * DT; az_ += avz * DT;
      if (dist <= 0.02) { ax_ = ambStop[0]; avx = 0; avz = 0; }
    } else if (t >= RESCUE.depart) {
      // drives off toward the hospital (accelerates at 2.4 m/s²)
      avx -= 2.4 * DT;
      avz += (1.6 * (OPP_IN - az_) - 2.2 * avz) * DT;
      const lim = 0.3 * Math.abs(avx) * clamp(Math.abs(avx) / 4); // steering authority grows with speed
      avz = clamp(avz, -lim, lim);
      ax_ += avx * DT; az_ += avz * DT;
    }
    awheel += (Math.hypot(avx, avz) / 0.38) * DT;
    ayaw = cont(ayaw, heading(avx, avz, ayaw));
    ambTr.data.set([ax_, az_, ayaw, awheel, Math.hypot(avx, avz)], i * 5);
  }

  // ---- three cars ahead of the ambulance pull aside (lateral PD + braking) as it approaches
  const asideTr: Track[] = [0, 1, 2].map((k) => {
    const tr = record(0, T1, 3);
    let x = ambStop[0] + [120, 92, 64][k], z = OPP_IN, vx = -7, vz = 0, yaw = PI;
    const out = [0, 0, 0, 0, 0];
    for (let i = 0; i < tr.n; i++) {
      const t = i * DT;
      if (t >= t0) {
        sample(ambTr as Track, t, out);
        const gap = out[0] - x; // ambulance is behind (larger x)
        const yielding = gap > 0 && gap < 45;
        const zt = yielding ? OPP_OUT + 1.2 : OPP_IN;
        const azz = 2.6 * (zt - z) - 2.4 * vz;
        vz += azz * DT;
        const target = yielding ? -2 : -7;
        vx += clamp(target - vx, -3 * DT, 3 * DT);
        vz = clamp(vz, -0.4 * Math.abs(vx) - 0.01, 0.4 * Math.abs(vx) + 0.01);
        x += vx * DT; z += vz * DT;
      }
      yaw = cont(yaw, heading(vx, vz, yaw));
      tr.data.set([x, z, yaw], i * 3);
    }
    return tr;
  });

  // ---- two cars arriving behind the crash brake (deceleration needed to stop short of it)
  const queueTr: Track[] = [0, 1].map((k) => {
    const tr = record(0, T1, 4);
    const lane = k ? LANE_IN : LANE_OUT;
    const stopX = Math.min(rest[0], bikeRest[0], bI.x) - (k ? 18 : 11);
    // cruising at 12 m/s; each driver reacts 0.6 s (+0.5 s per car) after the impact and brakes with the
    // deceleration needed to stop short of the scene
    const v0 = 12, tReact = tImpact + 0.6 + k * 0.5;
    let x = stopX - (22 + k * 4) - v0 * tReact, v = v0, braking = 0;
    for (let i = 0; i < tr.n; i++) {
      const t = i * DT;
      const d = stopX - x;
      if (t > tReact && v > 0) {
        const need = d > 0.05 ? (v * v) / (2 * d) : 9;
        v = Math.max(0, v - Math.min(need, 8) * DT);
        braking = 1;
      }
      x += v * DT;
      if (v === 0) braking = 0;
      tr.data.set([x, lane, 0, braking], i * 4);
    }
    return tr;
  });

  WORLD = { tImpact, bike: bikeTr as Track, rider: riderTr as Track, car: carTr as Track, rest, restSpin: spin, bikeDown, tBikeDown, impact: { x: p[0], z: p[1], vx: bvx0, vz: bvz0 }, bikeRest, amb: ambTr as Track, aside: asideTr, queue: queueTr, ambStop };
  return WORLD;
}
export const T_IMPACT = () => world().tImpact;
export const REST = () => world().rest;
export const WORLD_INFO = () => world();

// ---------------------------------------------------------------------------------------------- samplers used by the sets
const buf = [0, 0, 0, 0, 0, 0];
export interface BikeState { x: number; z: number; yaw: number; roll: number; wheel: number; y: number }
export function bike(t: number): BikeState {
  const w = world();
  if (t < 0) { const c = cruise(t); return { x: c.x, z: c.z, yaw: c.yaw, roll: c.roll, wheel: c.x / 0.33, y: 0 }; }
  const [x, z, y, yaw, roll, wheel] = sample(w.bike, t, buf);
  return { x, z, y, yaw, roll, wheel };
}

export interface RiderState { pos: V3; quat: THREE.Quaternion; mode: 'ride' | 'fall' | 'lying' | 'reach' | 'phone' | 'stretcher' | 'hidden'; k: number; fallK: number }
const qA = new THREE.Quaternion(), qB = new THREE.Quaternion();
const AX_X = new THREE.Vector3(1, 0, 0), AX_Y = new THREE.Vector3(0, 1, 0);
/** Body orientation: tip about the travel axis (x), facing spin about the body's long axis. */
function bodyQuat(tip: number, spin: number, out: THREE.Quaternion) {
  qA.setFromAxisAngle(AX_X, tip);
  qB.setFromAxisAngle(AX_Y, PI / 2 + spin);
  return out.copy(qA).multiply(qB);
}
/** Lying on the back on a stretcher heading `yaw`, head toward the direction of travel. */
function stretcherQuat(yaw: number, out: THREE.Quaternion) {
  qA.setFromAxisAngle(AX_Y, yaw - PI / 2);
  qB.setFromAxisAngle(AX_X, -PI / 2);
  return out.copy(qA).multiply(qB);
}
/** He is conscious: after the physics brings him to rest he rolls himself onto his back (a voluntary movement). */
const T_ROLL = [T_SOS - 5, T_SOS - 3.6] as const;
export function rider(t: number): RiderState {
  const w = world();
  const [x, y, z, tip, spin0] = sample(w.rider, Math.max(0, t), buf);
  let spin = spin0;
  if (t > T_ROLL[0]) {
    const faceUp = Math.sign(tip || 1) * (PI / 2);
    let d = wrapAngle(faceUp - w.restSpin);
    if (Math.abs(Math.abs(d) - PI) < 0.05) d = PI;
    spin = w.restSpin + d * seg(t, T_ROLL[0], T_ROLL[1]);
  }
  const q = bodyQuat(tip, spin, new THREE.Quaternion());
  const pos: V3 = [x, y, z];
  if (t < w.tImpact) return { pos, quat: q, mode: 'ride', k: 0, fallK: 0 };
  const fallK = clamp(Math.abs(tip) / (PI / 2));
  if (t < w.tImpact + 2.2) return { pos, quat: q, mode: 'fall', k: 0, fallK };
  if (t < T_SOS - 3.4) return { pos, quat: q, mode: 'lying', k: 0, fallK: 1 };
  if (t < T_SOS - 1.8) return { pos, quat: q, mode: 'reach', k: seg(t, T_SOS - 3.4, T_SOS - 2.2), fallK: 1 };
  if (t < RESCUE.lift) return { pos, quat: q, mode: 'phone', k: seg(t, T_SOS - 1.8, T_SOS - 0.8), fallK: 1 };
  const st = stretcher(t);
  if (!st.visible) return { pos, quat: q, mode: 'hidden', k: 0, fallK: 1 };
  const lift = seg(t, RESCUE.lift, RESCUE.lift + 1.4);
  // head toward the stretcher's trailing end (the way he was lying)
  const out = new THREE.Quaternion().copy(q).slerp(stretcherQuat(st.yaw + PI, new THREE.Quaternion()), lift);
  return { pos: [lerp(x, st.pos[0], lift), lerp(y, st.pos[1] + STRETCHER_TOP + 0.1, lift), lerp(z, st.pos[2], lift)], quat: out, mode: lift > 0.5 ? 'stretcher' : 'lying', k: lift, fallK: 1 };
}
/** Mattress height of the stretcher model (m). */
export const STRETCHER_TOP = 0.925;

export function car(t: number): { x: number; z: number; yaw: number; wheel: number; visible: boolean } {
  const w = world();
  const [x, z, yaw, wheel] = sample(w.car, Math.max(0, t), buf);
  return { x, z, yaw, wheel, visible: t > 14 && t < w.tImpact + 9 };
}

// ---------------------------------------------------------------------------------------------- people
export interface Walker { pos: V3; yaw: number; mode: 'walk' | 'run' | 'stand' | 'kneel' | 'phone' | 'sit'; phase: number; visible: boolean; speed: number }
/** Move along straight legs a→b→… starting at t0 with an acceleration-limited speed profile. */
function travel(t: number, pts: V3[], t0: number, vmax: number, amax: number, stride: number) {
  const legs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[2] - pts[i][2]));
  const L = legs.reduce((a, b) => a + b, 0);
  const { s, v } = profile(L, vmax, amax, t - t0);
  let acc = 0, k = 0;
  while (k < legs.length - 1 && acc + legs[k] < s) acc += legs[k++];
  const a = pts[k], b = pts[k + 1] ?? pts[k], f = legs[k] ? (s - acc) / legs[k] : 0;
  const pos: V3 = [lerp(a[0], b[0], clamp(f)), lerp(a[1], b[1], clamp(f)), lerp(a[2], b[2], clamp(f))];
  // heading: path tangent smoothed over half a metre either side, so corners are walked round, not snapped
  const pa = pathAt(pts, s - 0.5), pb = pathAt(pts, Math.max(s + 0.5, 1));
  const dir = Math.hypot(pb[0] - pa[0], pb[2] - pa[2]) > 1e-3 ? Math.atan2(pb[0] - pa[0], pb[2] - pa[2]) : Math.atan2(b[0] - a[0], b[2] - a[2]); // person faces +z at yaw 0
  return { pos, v, s, done: s >= L - 1e-3, yaw: dir, phase: (s / stride) * 2 * PI, half: s < L / 2 };
}
const lerpAngle = (a: number, b: number, k: number) => a + wrapAngle(b - a) * k;
/** Heading of a walker: their travel direction while moving, blending (by speed) to how they stand still at
 *  either end — so they turn as they start and stop instead of snapping. */
const facing = (m: { v: number; yaw: number; half: boolean }, idleStart: number, idleEnd: number) => lerpAngle(m.half ? idleStart : idleEnd, m.yaw, clamp(m.v / 0.7));
const faceTo = (from: V3, to: V3) => Math.atan2(to[0] - from[0], to[2] - from[2]);

export function bystander(i: 0 | 1 | 2, t: number): Walker {
  const w = world();
  const R = w.rest;
  const plan = [
    { from: [w.rest[0] + 16, 0.15, -9.6] as V3, to: [R[0] + 0.9, 0.15, R[2] - 0.75] as V3, t0: w.tImpact + 2.6, end: 'kneel' as const },
    { from: [w.rest[0] - 4, 0.15, -10.2] as V3, to: [R[0] - 1.4, 0.15, R[2] - 1.7] as V3, t0: w.tImpact + 3.4, end: 'stand' as const },
    { from: [w.rest[0] + 12, 0.15, 9.4] as V3, to: [R[0] + 2.2, 0.15, R[2] + 1.4] as V3, t0: w.tImpact + 4.2, end: 'stand' as const },
  ][i];
  const idle0 = i === 2 ? -PI / 2 : PI / 2; // waiting at the kerb, looking along the street
  if (t < plan.t0) return { pos: plan.from, yaw: idle0, mode: 'stand', phase: 0, visible: true, speed: 0 };
  // urgent: they run (5 m/s, 3 m/s²)
  const m = travel(t, [plan.from, plan.to], plan.t0, 5, 3, 2.3);
  let mode: Walker['mode'] = m.v > 2.2 ? 'run' : m.v > 0.15 ? 'walk' : plan.end;
  if (i === 1 && m.done && t > 40.6 && t < 46.5) mode = 'phone';
  if (i === 2 && m.done && t > 43.2 && t < 47) mode = 'phone';
  if (t > RESCUE.siren + i * 0.4) {
    // they hear the siren and step back to the footpath side, clearing the ambulance's path
    const back: V3 = ([[R[0] + 2.6, 0.15, R[2] - 2.6], [R[0] - 2.6, 0.15, R[2] - 2.9], [R[0] + 4.3, 0.15, R[2] - 2.2]] as V3[])[i];
    const b = travel(t, [plan.to, back], RESCUE.siren + i * 0.4, 1.3, 1.2, 1.45);
    return { pos: b.pos, yaw: facing(b, faceTo(plan.to, R), faceTo(back, R)), mode: b.v > 0.1 ? 'walk' : 'stand', phase: b.phase, visible: true, speed: b.v };
  }
  return { pos: m.pos, yaw: facing(m, idle0, faceTo(plan.to, R)), mode, phase: m.phase, visible: true, speed: m.v };
}

/**
 * Footpath pedestrians walk at a steady pace (step phase from distance). After the crash, anyone heading towards
 * the scene reacts (0.8–2 s) and decelerates at 1 m/s² to stop a few metres short, then stands looking at it;
 * people walking away keep going.
 */
export function pedestrian(i: number, t: number): Walker {
  const w = world();
  const side = i % 2 ? 1 : -1;
  const dir = i % 3 ? 1 : -1;
  const speed = 1.2 + (i % 4) * 0.1;
  const x0 = -360 + ((i * 53) % 820);
  const z = side * (9.2 + (i % 3) * 0.75);
  const X = w.rest[0];
  const tr = w.tImpact + 0.8 + (i % 4) * 0.4;
  const xr = x0 + dir * speed * tr;
  const dStop = 9 + (i % 5) * 1.8;
  const towards = (X - xr) * dir > 0;
  const brakeD = (speed * speed) / 2; // a = 1 m/s²
  let x = x0 + dir * speed * t, v = speed, look = false;
  if (t > tr && towards) {
    const xStop = Math.abs(X - xr) > dStop + brakeD ? X - dir * dStop : xr + dir * brakeD; // already close: stop where they are
    const L = Math.abs(xStop - xr);
    const tCruise = Math.max(0, (L - brakeD) / speed);
    const τ = t - tr;
    if (τ < tCruise) { x = xr + dir * speed * τ; }
    else {
      const τb = Math.min(τ - tCruise, speed);
      x = xr + dir * (speed * tCruise + speed * τb - 0.5 * τb * τb);
      v = Math.max(0, speed - τb);
      look = v < 0.05;
    }
  }
  const s = speed * Math.min(t, tr) + (t > tr ? Math.abs(x - xr) : 0);
  const yaw = look ? Math.atan2(X - x, w.rest[2] - z) : dir > 0 ? PI / 2 : -PI / 2;
  return { pos: [x, 0.15, z], yaw, mode: v > 0.05 ? 'walk' : 'stand', phase: (s / 1.45) * 2 * PI + i, visible: x > -420 && x < 540, speed: v };
}

// ---------------------------------------------------------------------------------------------- traffic
export interface TrafficCar { x: number; z: number; yaw: number; kind: 'car' | 'auto'; color: string; hazard?: boolean; visible?: boolean; wheel: number; braking?: boolean }
const PALETTE = ['#E8E6E1', '#9AA3AD', '#2C3E57', '#7A1F27', '#1E2A2E', '#C7C9CC', '#3D5A40', '#5B4B8A'];
/** Free-flowing traffic: constant speed per vehicle, evenly spaced per lane (no overlaps), wheels from distance. */
export function traffic(t: number): TrafficCar[] {
  const out: TrafficCar[] = [];
  const span = 900;
  const wrap = (v: number) => -300 + ((((v + 300) % span) + span) % span);
  const w = world();
  for (let i = 0; i < 24; i++) {
    const lane = [LANE_IN, OPP_IN, OPP_OUT, LANE_IN, OPP_IN, OPP_OUT][i % 6];
    const opp = lane > 0;
    const speed = opp ? 9 + (i % 3) * 0.8 : 12.5;
    const slot = Math.floor(i / 6);
    const x = wrap(slot * 225 + (i % 6) * 37 + (opp ? -1 : 1) * speed * t);
    let visible = true;
    if (!opp && t > w.tImpact - 2 && x > Math.min(w.rest[0], w.bikeRest[0]) - 140 && x < Math.max(w.rest[0], w.bikeRest[0]) + 110) visible = false;
    if (!opp && t < w.tImpact && Math.abs(x - cruise(t).x) < 30) visible = false;
    if (opp && t > T_SOS + 24 && x > w.ambStop[0] - 110 && x < w.ambStop[0] + 260) visible = false;
    out.push({ x, z: lane, yaw: opp ? PI : 0, kind: i % 7 === 3 ? 'auto' : 'car', color: PALETTE[i % PALETTE.length], visible, wheel: (x / 0.32) * (opp ? -1 : 1) });
  }
  return out;
}
export function queued(k: 0 | 1, t: number): TrafficCar {
  const w = world();
  const [x, z, yaw, braking] = sample(w.queue[k], Math.max(0, t), buf);
  return { x, z, yaw, kind: 'car', color: k ? '#2C3E57' : '#C7C9CC', hazard: t > w.tImpact + 3, visible: t > w.tImpact - 2 && t < RESCUE.depart + 4, wheel: x / 0.32, braking: braking > 0.5 };
}

// ---------------------------------------------------------------------------------------------- response
/** Response timings (absolute s). `arrive` is when the ambulance's speed reaches zero — the bake solves for it. */
export const RESCUE = {
  siren: T_SOS + 31, // bystanders hear it and clear a path
  arrive: T_SOS + 34.6,
  driverOut: T_SOS + 34.9,
  doors: T_SOS + 35.2,
  attendantOut: T_SOS + 35.7,
  stretcherOut: T_SOS + 38.2,
  lift: T_SOS + 43.7,
  load: T_SOS + 45.3,
  gone: T_SOS + 51.2,
  depart: T_SOS + 51.6,
};
export function ambulance(t: number): { x: number; z: number; yaw: number; wheel: number; lights: boolean; visible: boolean; doors: number } {
  const w = world();
  const [x, z, yaw, wheel] = sample(w.amb, Math.max(0, t), buf);
  const doors = seg(t, RESCUE.doors, RESCUE.doors + 0.8) * (1 - seg(t, RESCUE.gone - 0.6, RESCUE.gone));
  return { x, z, yaw, wheel, lights: true, visible: t > T_SOS + 24.5 && t < RESCUE.depart + 6, doors };
}
export function aside(k: 0 | 1 | 2, t: number): TrafficCar {
  const w = world();
  const [x, z, yaw] = sample(w.aside[k], Math.max(0, t), buf);
  return { x, z, yaw, kind: k === 1 ? 'auto' : 'car', color: ['#9AA3AD', '#E8C33A', '#7A1F27'][k], visible: t > T_SOS + 24.5 && t < RESCUE.depart, wheel: -x / 0.32 };
}
export function paramedic(i: 0 | 1, t: number): Walker {
  const w = world();
  const R = w.rest, A = w.ambStop;
  const st = stretcher(t);
  const f = [Math.cos(st.yaw), -Math.sin(st.yaw)];
  const end = (d: number): V3 => [st.pos[0] + d * f[0], 0.02, st.pos[2] + d * f[1]];
  // at a stretcher end: facing the way it moves while it rolls, turning to face it when it stops
  const along = (pos: V3, sign: number): Walker => ({ pos, yaw: lerpAngle(faceTo(pos, st.pos), Math.atan2(sign * f[0], sign * f[1]), clamp(st.speed / 0.7)), mode: st.speed > 0.1 ? 'walk' : 'stand', phase: (st.dist / 1.5) * 2 * PI, visible: st.visible, speed: st.speed });
  if (i === 0) {
    // the attendant rides in the back: out of the rear doors, straight to his side, kneels to assess;
    // then takes the near end of the stretcher (towards the ambulance) for the lift and leads it back
    const rear: V3 = [A[0] + 3.7, 0.02, A[2] - 0.5];
    if (t < RESCUE.attendantOut) return { pos: rear, yaw: 0, mode: 'stand', phase: 0, visible: false, speed: 0 };
    const kneel: V3 = [R[0] + 0.75, 0.02, R[2] + 0.15];
    if (t < RESCUE.lift - 1.3) {
      const m = travel(t, [rear, kneel], RESCUE.attendantOut, 2.4, 2.4, 1.7);
      return { pos: m.pos, yaw: facing(m, m.yaw, faceTo(kneel, R)), mode: m.v > 0.1 ? 'walk' : 'kneel', phase: m.phase, visible: true, speed: m.v };
    }
    if (t < RESCUE.load) {
      const nearEnd = end(-STRETCHER_HALF);
      const m = travel(t, [kneel, nearEnd], RESCUE.lift - 1.3, 1.2, 1.5, 1.4);
      return { pos: m.pos, yaw: facing(m, faceTo(kneel, R), faceTo(nearEnd, st.pos)), mode: m.v > 0.1 ? 'walk' : 'stand', phase: m.phase, visible: true, speed: m.v };
    }
    return along(end(-STRETCHER_HALF), -1);
  }
  // the driver: out of the cab, round to the rear, pulls the stretcher out and leads it to him (then pushes it back)
  const door: V3 = [A[0] - 1.2, 0.02, A[2] - 1.3];
  if (t < RESCUE.driverOut) return { pos: door, yaw: 0, mode: 'stand', phase: 0, visible: false, speed: 0 };
  if (t < RESCUE.stretcherOut) {
    const m = travel(t, [door, [A[0] + 1.6, 0.02, A[2] - 1.7], end(STRETCHER_HALF)], RESCUE.driverOut, 2.6, 2.5, 1.7);
    const e = end(STRETCHER_HALF);
    return { pos: m.pos, yaw: facing(m, m.yaw, faceTo(e, st.pos)), mode: m.v > 0.1 ? 'walk' : 'stand', phase: m.phase, visible: true, speed: m.v };
  }
  return along(end(STRETCHER_HALF), t < RESCUE.load ? 1 : -1);
}

/** Half the stretcher's length plus a step (where a paramedic stands at either end). */
const STRETCHER_HALF = 1.25;
/**
 * The stretcher rolls out of the rear doors (+x), swings round on its castors and is wheeled to lie alongside
 * him; then the same path in reverse back into the ambulance. Acceleration-limited; its heading follows the
 * path's tangent (a castored trolley turns smoothly, it doesn't snap).
 */
function stretcherPath() {
  const w = world();
  const R = w.rest, A = w.ambStop;
  const inside: V3 = [A[0] + 2.2, 0, A[2]];
  const out: V3 = [A[0] + 4.9, 0, A[2]];
  const bySide: V3 = [R[0] - 0.95, 0, R[2] - 0.1];
  return [inside, out, bySide];
}
function pathAt(pts: V3[], s: number): V3 {
  s = Math.max(0, s);
  let acc = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const L = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][2] - pts[k][2]);
    if (s <= acc + L || k === pts.length - 2) { const f = L ? clamp((s - acc) / L) : 0; return [lerp(pts[k][0], pts[k + 1][0], f), 0, lerp(pts[k][2], pts[k + 1][2], f)]; }
    acc += L;
  }
  return pts[pts.length - 1];
}
export function stretcher(t: number): { pos: V3; visible: boolean; yaw: number; speed: number; dist: number } {
  const pts = stretcherPath();
  const L = pts.slice(1).reduce((a, p, k) => a + Math.hypot(p[0] - pts[k][0], p[2] - pts[k][2]), 0);
  // arc length along the outbound path (inbound runs it backwards, so the trolley keeps its orientation)
  let s = 0, v = 0, dist = 0;
  if (t >= RESCUE.load) { const m = profile(L, 1.3, 1.0, t - RESCUE.load); s = L - m.s; v = m.v; dist = m.s; }
  else if (t >= RESCUE.stretcherOut) { const m = profile(L, 1.4, 1.2, t - RESCUE.stretcherOut); s = m.s; v = m.v; dist = m.s; }
  const pos = pathAt(pts, s);
  // heading = direction of the outbound tangent, smoothed over the trolley's wheelbase (0.9 m)
  const a = pathAt(pts, Math.max(0, s - 0.9)), b = pathAt(pts, Math.min(L, Math.max(s, 0.9)));
  const yaw = Math.atan2(-(b[2] - a[2]), b[0] - a[0]);
  const visible = t >= RESCUE.stretcherOut && t < RESCUE.gone;
  return { pos, visible, yaw, speed: v, dist };
}
export { wrapAngle };
