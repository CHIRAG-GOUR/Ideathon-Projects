'use client';
/**
 * LifeLine sound: synthesised with Web Audio (no audio files). Interface sounds for the app, plus the layered
 * score / ambience / effects engine used by the cinematic. Two buses — SFX and Music — each with its own switch,
 * and a master volume. Nothing plays before a user gesture.
 */
type Layer = { gain: GainNode; stop: () => void };

class Engine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfx!: GainNode;
  music!: GainNode;
  sfxOn = true;
  musicOn = true;
  volume = 0.9;
  noise: AudioBuffer | null = null;
  private layers = new Map<string, Layer>();

  unlock() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      const c = new AC();
      this.ctx = c;
      this.master = c.createGain();
      this.master.gain.value = this.volume;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -16;
      this.master.connect(comp).connect(c.destination);
      this.sfx = c.createGain();
      this.music = c.createGain();
      this.sfx.gain.value = this.sfxOn ? 1 : 0;
      this.music.gain.value = this.musicOn ? 0.6 : 0;
      this.sfx.connect(this.master);
      this.music.connect(this.master);
      const len = c.sampleRate * 3;
      this.noise = c.createBuffer(1, len, c.sampleRate);
      const d = this.noise.getChannelData(0);
      let b = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; d[i] = b * 3.5; }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }
  setSfx(on: boolean) { this.sfxOn = on; if (this.ctx) this.sfx.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05); }
  setMusic(on: boolean) { this.musicOn = on; if (this.ctx) this.music.gain.setTargetAtTime(on ? 0.6 : 0, this.ctx.currentTime, 0.1); }
  setVolume(v: number) { this.volume = v; if (this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }

  tone(freq: number, dur: number, o: { type?: OscillatorType; vol?: number; at?: number; to?: number; bus?: 'sfx' | 'music'; attack?: number } = {}) {
    const c = this.unlock();
    if (!c) return;
    const t = c.currentTime + (o.at ?? 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.15, t + (o.attack ?? 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(o.bus === 'music' ? this.music : this.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
  burst(dur: number, freq: number, vol = 0.3, at = 0, q = 1.2, type: BiquadFilterType = 'bandpass') {
    const c = this.unlock();
    if (!c || !this.noise) return;
    const t = c.currentTime + at;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.sfx);
    s.start(t, Math.random() * 2); s.stop(t + dur + 0.05);
  }

  // ---- interface
  click() { this.burst(0.03, 3600, 0.35); this.tone(1800, 0.05, { type: 'square', vol: 0.04 }); }
  tick(n: number) { this.tone(n >= 3 ? 1046 : n === 2 ? 880 : 740, 0.14, { vol: 0.12, type: 'triangle' }); }
  cancel() { this.tone(330, 0.14, { vol: 0.07 }); }
  activate() {
    this.tone(523, 0.22, { vol: 0.14, type: 'triangle' });
    this.tone(784, 0.26, { vol: 0.14, type: 'triangle', at: 0.12 });
    this.tone(1046, 0.5, { vol: 0.16, type: 'triangle', at: 0.24 });
    this.tone(2093, 0.4, { vol: 0.04, at: 0.3 });
    try { navigator.vibrate?.([80, 60, 160]); } catch { /* unsupported */ }
  }
  ping() { this.tone(1318, 0.22, { vol: 0.1 }); this.tone(1760, 0.35, { vol: 0.08, at: 0.1 }); }
  notify() { this.tone(988, 0.16, { vol: 0.12, type: 'triangle' }); this.tone(1319, 0.3, { vol: 0.12, type: 'triangle', at: 0.13 }); try { navigator.vibrate?.([120, 80, 120]); } catch { /* unsupported */ } }
  type() { this.burst(0.02, 5200, 0.06); }

  // ---- effects (cinematic)
  brake(at = 0) { // tyre screech: resonant noise sliding
    const c = this.unlock(); if (!c || !this.noise) return;
    const t = c.currentTime + at;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = 'bandpass'; f.Q.value = 18;
    f.frequency.setValueAtTime(2400, t); f.frequency.linearRampToValueAtTime(1500, t + 1.1);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    s.connect(f).connect(g).connect(this.sfx); s.start(t); s.stop(t + 1.3);
  }
  impact(at = 0) {
    this.burst(0.5, 180, 0.9, at, 0.8, 'lowpass');
    this.burst(0.25, 1400, 0.5, at, 0.7);
    this.tone(70, 0.5, { vol: 0.5, to: 38, at });
    this.burst(0.9, 3200, 0.18, at + 0.08, 0.6, 'highpass'); // debris
  }
  slide(at = 0) { this.burst(1.4, 900, 0.22, at, 0.5); }
  door(at = 0) { this.burst(0.12, 400, 0.4, at, 1, 'lowpass'); this.tone(120, 0.12, { vol: 0.2, at }); }

  // ---- continuous layers
  level(id: LayerId, vol: number, ramp = 1.2) {
    const c = this.unlock();
    if (!c || !this.noise) return;
    let l = this.layers.get(id);
    if (!l) {
      const def = LAYERS[id];
      const gain = c.createGain();
      gain.gain.value = 0.0001;
      gain.connect(def.bus === 'music' ? this.music : this.sfx);
      l = { gain, stop: def.build(c, gain, this.noise) };
      this.layers.set(id, l);
    }
    l.gain.gain.cancelScheduledValues(c.currentTime);
    l.gain.gain.setTargetAtTime(Math.max(0.0001, vol), c.currentTime, ramp / 3);
  }
  silenceAll(ramp = 0.6) { if (this.ctx) for (const l of this.layers.values()) l.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, ramp / 3); }
  stopAll() { for (const l of this.layers.values()) { try { l.stop(); } catch { /* stopped */ } l.gain.disconnect(); } this.layers.clear(); }
}

const osc = (c: AudioContext, type: OscillatorType, f: number) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; return o; };
const noiseSrc = (c: AudioContext, n: AudioBuffer) => { const s = c.createBufferSource(); s.buffer = n; s.loop = true; return s; };
type Build = (c: AudioContext, out: GainNode, n: AudioBuffer) => () => void;

const LAYERS: Record<string, { bus: 'sfx' | 'music'; build: Build }> = {
  // city: traffic rumble + distant horns
  city: { bus: 'sfx', build: (c, out, n) => {
    const s = noiseSrc(c, n), f = c.createBiquadFilter(), g = c.createGain(), lfo = osc(c, 'sine', 0.07), lg = c.createGain();
    f.type = 'lowpass'; f.frequency.value = 520; g.gain.value = 0.32; lg.gain.value = 0.12; lfo.connect(lg).connect(g.gain);
    s.connect(f).connect(g).connect(out); s.start(); lfo.start();
    const horns = setInterval(() => { if (Math.random() < 0.35) { const t = c.currentTime; [400, 505].forEach((hz) => { const o = osc(c, 'square', hz), hg = c.createGain(); hg.gain.setValueAtTime(0.0001, t); hg.gain.exponentialRampToValueAtTime(0.012, t + 0.02); hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(hg).connect(out); o.start(t); o.stop(t + 0.35); }); } }, 2600);
    return () => { s.stop(); lfo.stop(); clearInterval(horns); };
  } },
  wind: { bus: 'sfx', build: (c, out, n) => {
    const s = noiseSrc(c, n), f = c.createBiquadFilter(), g = c.createGain(), lfo = osc(c, 'sine', 0.3), lg = c.createGain();
    f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.6; lg.gain.value = 300; lfo.connect(lg).connect(f.frequency); g.gain.value = 0.18;
    s.connect(f).connect(g).connect(out); s.start(); lfo.start();
    return () => { s.stop(); lfo.stop(); };
  } },
  // classic single-cylinder motorcycle: low thump with firing pulses
  bike: { bus: 'sfx', build: (c, out) => {
    const o = osc(c, 'sawtooth', 46), o2 = osc(c, 'square', 23), f = c.createBiquadFilter(), g = c.createGain(), puls = osc(c, 'square', 11), pg = c.createGain();
    f.type = 'lowpass'; f.frequency.value = 260; g.gain.value = 0.07; pg.gain.value = 0.05; puls.connect(pg).connect(g.gain);
    o.connect(f); o2.connect(f); f.connect(g).connect(out); [o, o2, puls].forEach((x) => x.start());
    return () => [o, o2, puls].forEach((x) => x.stop());
  } },
  car: { bus: 'sfx', build: (c, out) => {
    const o = osc(c, 'sawtooth', 72), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.frequency.value = 340; g.gain.value = 0.06; o.connect(f).connect(g).connect(out); o.start();
    return () => o.stop();
  } },
  crowd: { bus: 'sfx', build: (c, out, n) => {
    const stops: (() => void)[] = [];
    [380, 620, 900].forEach((hz, i) => {
      const s = noiseSrc(c, n), f = c.createBiquadFilter(), g = c.createGain(), lfo = osc(c, 'sine', 2.3 + i * 1.7), lg = c.createGain();
      f.type = 'bandpass'; f.frequency.value = hz; f.Q.value = 3; g.gain.value = 0.05; lg.gain.value = 0.04; lfo.connect(lg).connect(g.gain);
      s.connect(f).connect(g).connect(out); s.start(); lfo.start(); stops.push(() => { s.stop(); lfo.stop(); });
    });
    return () => stops.forEach((x) => x());
  } },
  // ambulance siren (generic wail, fictional service)
  siren: { bus: 'sfx', build: (c, out) => {
    const o = osc(c, 'triangle', 760), lfo = osc(c, 'sine', 0.42), lg = c.createGain(), f = c.createBiquadFilter(), g = c.createGain();
    lg.gain.value = 260; lfo.connect(lg).connect(o.frequency); f.type = 'lowpass'; f.frequency.value = 2200; g.gain.value = 0.06;
    o.connect(f).connect(g).connect(out); o.start(); lfo.start();
    return () => { o.stop(); lfo.stop(); };
  } },
  hospital: { bus: 'sfx', build: (c, out, n) => {
    const s = noiseSrc(c, n), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.frequency.value = 220; g.gain.value = 0.12; s.connect(f).connect(g).connect(out); s.start();
    const beep = setInterval(() => { const t = c.currentTime; const o = osc(c, 'sine', 1046), bg = c.createGain(); bg.gain.setValueAtTime(0.0001, t); bg.gain.exponentialRampToValueAtTime(0.03, t + 0.01); bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); o.connect(bg).connect(out); o.start(t); o.stop(t + 0.15); }, 1000);
    return () => { s.stop(); clearInterval(beep); };
  } },
  room: { bus: 'sfx', build: (c, out, n) => {
    const s = noiseSrc(c, n), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.frequency.value = 160; g.gain.value = 0.18; s.connect(f).connect(g).connect(out); s.start();
    return () => s.stop();
  } },
  // ---- music
  calm: { bus: 'music', build: (c, out) => pad(c, out, [196, 246.9, 293.7, 392], 0.03, 0.12) },
  tension: { bus: 'music', build: (c, out) => {
    const a = osc(c, 'sawtooth', 55), b = osc(c, 'sawtooth', 55.5), f = c.createBiquadFilter(), sw = osc(c, 'sine', 0.06), sg = c.createGain(), g = c.createGain();
    f.type = 'lowpass'; f.frequency.value = 260; f.Q.value = 5; sg.gain.value = 140; sw.connect(sg).connect(f.frequency); g.gain.value = 0.1;
    a.connect(f); b.connect(f); f.connect(g).connect(out);
    const beat = osc(c, 'sine', 50), bg = c.createGain(), lfo = osc(c, 'square', 1.2), lg = c.createGain(); bg.gain.value = 0; lg.gain.value = 0.14; lfo.connect(lg).connect(bg.gain); beat.connect(bg).connect(out);
    [a, b, sw, beat, lfo].forEach((x) => x.start());
    return () => [a, b, sw, beat, lfo].forEach((x) => x.stop());
  } },
  response: { bus: 'music', build: (c, out) => {
    const stops: (() => void)[] = [];
    [110, 164.8, 220].forEach((hz) => { const o = osc(c, 'sawtooth', hz), f = c.createBiquadFilter(), g = c.createGain(), p = osc(c, 'square', 4), pg = c.createGain(); f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = 0.03; pg.gain.value = 0.025; p.connect(pg).connect(g.gain); o.connect(f).connect(g).connect(out); o.start(); p.start(); stops.push(() => { o.stop(); p.stop(); }); });
    return () => stops.forEach((x) => x());
  } },
  warm: { bus: 'music', build: (c, out) => pad(c, out, [261.6, 329.6, 392, 523.3], 0.04, 0.18) },
};
function pad(c: AudioContext, out: GainNode, notes: number[], vol: number, vib: number) {
  const stops: (() => void)[] = [];
  notes.forEach((hz, i) => {
    const o = osc(c, 'triangle', hz), g = c.createGain(), v = osc(c, 'sine', vib + i * 0.05), vg = c.createGain();
    g.gain.value = vol; vg.gain.value = vol * 0.4; v.connect(vg).connect(g.gain); o.connect(g).connect(out); o.start(); v.start();
    stops.push(() => { o.stop(); v.stop(); });
  });
  return () => stops.forEach((x) => x());
}

export type LayerId = 'city' | 'wind' | 'bike' | 'car' | 'crowd' | 'siren' | 'hospital' | 'room' | 'calm' | 'tension' | 'response' | 'warm';
export const LAYER_IDS: LayerId[] = ['city', 'wind', 'bike', 'car', 'crowd', 'siren', 'hospital', 'room', 'calm', 'tension', 'response', 'warm'];
export const sound = new Engine();

/** Spoken lines (cinematic dialogue, voice guidance) via the browser's speech synthesis, when available. */
export function speak(text: string, o: { rate?: number; pitch?: number; lang?: string } = {}) {
  try {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = o.rate ?? 1;
    u.pitch = o.pitch ?? 1;
    u.lang = o.lang ?? 'en-IN';
    u.volume = sound.volume;
    const v = speechSynthesis.getVoices().find((x) => x.lang === u.lang) ?? speechSynthesis.getVoices().find((x) => x.lang.startsWith('en'));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch { /* unsupported */ }
}
export const stopSpeaking = () => { try { speechSynthesis.cancel(); } catch { /* unsupported */ } };
