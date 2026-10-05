package com.skillizee.lpgdock.engine;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Smart LPG Dock simulation engine — a line-by-line port of shared/src/engine.ts.
 * Same config (shared/dock-config.json, bundled as an asset), same fixed step, same events.
 * mobile/test/Parity.java checks this port against the TypeScript reference traces.
 *
 * Layers per step: director (script + faults) → physics (simplified, illustrative) → dock safety engine
 * (with-dock scenario only) or the unmonitored path → chef behaviour.
 */
public final class Engine {
    private Engine() {}

    public static final double NONE = -1;

    // ------------------------------------------------------------------ config
    public static final class Config {
        public String cylinderId, dockId;
        public double stepSec;
        public double bGas, bTemp, bTilt, cookingFlow, cylinderKg, cylinderCapacityKg;
        public double[] thGas = new double[3], thTemp = new double[3], thTilt = new double[3];
        public double abnormalFlow, abnormalSustainSec;
        public double confirmSec, valveTravelSec, clearHoldSec, clearGas;
        public double leakK, leakP, ventTauSec;
        public double leakAtSec, cookingAtSec;
        public double dangerGas, incidentGas, reactionSec, incidentSec, tiltLeakDeg, heatLeakTemp;
        public double heatTargetC, heatRatePerSec, heatDurationSec, tiltTargetDeg, tiltRatePerSec, usageFlow, coolTauSec;
        public double calmSpeed, fleeSpeed, relievedAfterSec;
        public double[] stove, chefCook, cylinder;
        public double[][] path;

        public static Config parse(String json) throws Exception {
            JSONObject j = new JSONObject(json);
            Config c = new Config();
            c.cylinderId = j.getString("cylinderId");
            c.dockId = j.getString("dockId");
            c.stepSec = j.getDouble("stepSec");
            JSONObject b = j.getJSONObject("baseline");
            c.bGas = b.getDouble("gas");
            c.bTemp = b.getDouble("temp");
            c.bTilt = b.getDouble("tilt");
            c.cookingFlow = b.getDouble("cookingFlow");
            c.cylinderKg = b.getDouble("cylinderKg");
            c.cylinderCapacityKg = b.getDouble("cylinderCapacityKg");
            JSONObject th = j.getJSONObject("thresholds");
            c.thGas = levels(th.getJSONObject("gas"));
            c.thTemp = levels(th.getJSONObject("temp"));
            c.thTilt = levels(th.getJSONObject("tilt"));
            c.abnormalFlow = th.getJSONObject("usage").getDouble("abnormalFlow");
            c.abnormalSustainSec = th.getJSONObject("usage").getDouble("abnormalSustainSec");
            JSONObject d = j.getJSONObject("dock");
            c.confirmSec = d.getDouble("confirmSec");
            c.valveTravelSec = d.getDouble("valveTravelSec");
            c.clearHoldSec = d.getDouble("clearHoldSec");
            c.clearGas = d.getDouble("clearGas");
            JSONObject l = j.getJSONObject("leak");
            c.leakK = l.getDouble("k");
            c.leakP = l.getDouble("p");
            c.ventTauSec = l.getDouble("ventTauSec");
            JSONObject s = j.getJSONObject("script");
            c.leakAtSec = s.getDouble("leakAtSec");
            c.cookingAtSec = s.getDouble("cookingAtSec");
            JSONObject u = j.getJSONObject("unprotected");
            c.dangerGas = u.getDouble("dangerGas");
            c.incidentGas = u.getDouble("incidentGas");
            c.reactionSec = u.getDouble("reactionSec");
            c.incidentSec = u.getDouble("incidentSec");
            c.tiltLeakDeg = u.getDouble("tiltLeakDeg");
            c.heatLeakTemp = u.getDouble("heatLeakTemp");
            JSONObject f = j.getJSONObject("faults");
            c.heatTargetC = f.getDouble("heatTargetC");
            c.heatRatePerSec = f.getDouble("heatRatePerSec");
            c.heatDurationSec = f.getDouble("heatDurationSec");
            c.tiltTargetDeg = f.getDouble("tiltTargetDeg");
            c.tiltRatePerSec = f.getDouble("tiltRatePerSec");
            c.usageFlow = f.getDouble("usageFlow");
            c.coolTauSec = f.getDouble("coolTauSec");
            JSONObject ch = j.getJSONObject("chef");
            c.calmSpeed = ch.getDouble("calmSpeed");
            c.fleeSpeed = ch.getDouble("fleeSpeed");
            c.relievedAfterSec = ch.getDouble("relievedAfterSec");
            JSONObject k = j.getJSONObject("kitchen");
            c.stove = vec(k.getJSONArray("stove"));
            c.chefCook = vec(k.getJSONArray("chefCook"));
            c.cylinder = vec(k.getJSONArray("cylinder"));
            JSONArray p = k.getJSONArray("path");
            c.path = new double[p.length()][];
            for (int i = 0; i < p.length(); i++) c.path[i] = vec(p.getJSONArray(i));
            return c;
        }

        private static double[] levels(JSONObject o) throws Exception {
            return new double[] {o.getDouble("anomaly"), o.getDouble("warning"), o.getDouble("critical")};
        }

        private static double[] vec(JSONArray a) throws Exception {
            double[] v = new double[a.length()];
            for (int i = 0; i < v.length; i++) v[i] = a.getDouble(i);
            return v;
        }
    }

    // ------------------------------------------------------------------ state
    public static final class Event {
        public final int seq;
        public final double t;
        public final String kind, level, text;

        Event(int seq, double t, String kind, String level, String text) {
            this.seq = seq;
            this.t = t;
            this.kind = kind;
            this.level = level;
            this.text = text;
        }
    }

    public static final class Sample {
        public final double t, gas, temp, tilt, flow;

        Sample(double t, double gas, double temp, double tilt, double flow) {
            this.t = t;
            this.gas = gas;
            this.temp = temp;
            this.tilt = tilt;
            this.flow = flow;
        }
    }

    public static final class State {
        public String scenario, mode;
        public double t;
        public String phase = "IDLE";
        public double gas, temp, tilt, flow, cylinderKg;
        public String usage = "IDLE", supply = "OPEN", dock, safety, alarm = "none";
        public boolean burner;
        public int[] levels = new int[4]; // gas, temp, tilt, usage
        // leak
        public boolean leakActive, leakIntroduced;
        public double leakTau, leakMult = 1, leakExcess;
        // faults
        public double heatAt = NONE, usageSince = NONE;
        public boolean faultTilt, faultUsage;
        // chef
        public String chefAction = "idle";
        public double chefX, chefZ, chefHeading = Math.PI, chefSince;
        public int chefWp;
        // timers
        public double warningAt = NONE, shutoffAt = NONE, isolatedAt = NONE, clearSince = NONE, dangerAt = NONE, incidentAt = NONE, containedAt = NONE;
        public boolean gasRisingLogged, heatBoost, usageLogged;
        public String outcome = "NONE";
        public final List<Event> events = new ArrayList<>();
        public final List<Sample> history = new ArrayList<>();
        public int seq;

        public boolean withDock() {
            return "with".equals(scenario);
        }
    }

    public static State create(String scenario, String mode, Config c) {
        State s = new State();
        s.scenario = scenario;
        s.mode = mode;
        s.gas = c.bGas;
        s.temp = c.bTemp;
        s.tilt = c.bTilt;
        s.cylinderKg = c.cylinderKg;
        s.dock = "with".equals(scenario) ? "CONNECTED" : "NOT_INSTALLED";
        s.safety = "with".equals(scenario) ? "NORMAL" : "UNMONITORED";
        s.chefX = c.chefCook[0];
        s.chefZ = c.chefCook[2];
        s.history.add(new Sample(0, c.bGas, c.bTemp, c.bTilt, 0));
        return s;
    }

    // ------------------------------------------------------------------ helpers (same text as the TS engine)
    static double r2(double x) {
        return Math.round(x * 100) / 100.0;
    }

    public static String f2(double v) {
        return String.format(Locale.US, "%.2f", v);
    }

    public static String f1(double v) {
        return String.format(Locale.US, "%.1f", v);
    }

    /** Number printed the way JavaScript prints it in a template string (62 → "62", 0.5 → "0.5"). */
    static String js(double v) {
        if (v == Math.rint(v) && Math.abs(v) < 1e15) return String.valueOf((long) v);
        String s = Double.toString(v);
        return s;
    }

    public static String clock(double t) {
        return String.format(Locale.US, "%02d:%02d", (int) Math.floor(t / 60), (int) Math.floor(t % 60));
    }

    public static int levelOf(String sensor, double v, Config c) {
        double[] th = "gas".equals(sensor) ? c.thGas : "temp".equals(sensor) ? c.thTemp : c.thTilt;
        return v >= th[2] ? 3 : v >= th[1] ? 2 : v >= th[0] ? 1 : 0;
    }

    static void emit(State s, String kind, String level, String text) {
        s.events.add(new Event(++s.seq, r2(s.t), kind, level, text));
    }

    static void setChef(State s, String action) {
        if (!s.chefAction.equals(action)) {
            s.chefAction = action;
            s.chefSince = s.t;
        }
    }

    static void startLeak(State s, String text) {
        s.leakActive = true;
        s.leakIntroduced = true;
        if ("COOKING".equals(s.phase) && "without".equals(s.scenario)) s.phase = "LEAK";
        emit(s, "leak_introduced", "notice", text);
    }

    /** SIMULATION CONTROL (fault injection) — never a real-world instruction. */
    public static void inject(State s, String f, Config c) {
        if (!"NONE".equals(s.outcome)) {
            emit(s, "fault_ignored", "info", "Simulation finished — restart to inject new faults");
            return;
        }
        switch (f) {
            case "leak":
                if ("ISOLATED".equals(s.supply)) {
                    emit(s, "fault_ignored", "info", "Supply is isolated — the simulated leak cannot flow");
                    return;
                }
                if (!s.leakActive) startLeak(s, "Fault injected: simulated gas leak at the regulator");
                else {
                    s.leakMult *= 1.5;
                    emit(s, "leak_increased", "notice", "Fault injected: leak rate ×" + f2(s.leakMult));
                }
                break;
            case "heat":
                s.heatAt = s.t;
                emit(s, "fault_heat", "notice", "Fault injected: temperature rise near the cylinder (towards " + js(c.heatTargetC) + " °C)");
                break;
            case "tilt":
                s.faultTilt = true;
                emit(s, "fault_tilt", "notice", "Fault injected: cylinder tilt (towards " + js(c.tiltTargetDeg) + "°)");
                break;
            default:
                s.faultUsage = true;
                emit(s, "fault_usage", "notice", "Fault injected: unusual usage — high gas flow with no cooking load");
        }
    }

    public static void clearFaults(State s) {
        s.heatAt = NONE;
        s.faultTilt = false;
        s.faultUsage = false;
        s.usageSince = NONE;
        if (s.leakActive) s.leakActive = false;
        emit(s, "faults_cleared", "info", "Simulation faults cleared");
    }

    public static void step(State s, Config c) {
        double dt = c.stepSec;
        s.t = Math.round((s.t + dt) * 1e6) / 1e6;
        director(s, c);
        physics(s, dt, c);
        if (s.withDock()) dock(s, c);
        else unprotected(s, c);
        chef(s, dt, c);
        if (Math.abs(s.t / 0.5 - Math.round(s.t / 0.5)) < 1e-6) {
            s.history.add(new Sample(s.t, s.gas, s.temp, s.tilt, s.flow));
            if (s.history.size() > 240) s.history.remove(0);
        }
    }

    /** Advance by (speed-scaled) wall-clock seconds; returns the leftover to carry into the next call. */
    public static double advance(State s, double seconds, double carry, Config c) {
        double acc = carry + seconds;
        int n = 0;
        while (acc >= c.stepSec - 1e-9 && n < 400) {
            step(s, c);
            acc -= c.stepSec;
            n++;
        }
        return acc;
    }

    // ------------------------------------------------------------------ 1. director
    static void director(State s, Config c) {
        if ("IDLE".equals(s.phase) && s.t >= c.cookingAtSec) {
            s.phase = "COOKING";
            s.burner = true;
            setChef(s, "cooking");
            emit(s, "cooking_started", "info", "Cooking session started");
        }
        if ("scripted".equals(s.mode) && !s.leakIntroduced && s.t >= c.leakAtSec && "OPEN".equals(s.supply) && "NONE".equals(s.outcome))
            startLeak(s, "Simulated gas leak introduced at the regulator");
    }

    // ------------------------------------------------------------------ 2. physics (illustrative)
    static void physics(State s, double dt, Config c) {
        boolean sourceOn = s.leakActive && !"ISOLATED".equals(s.supply) && s.incidentAt == NONE;
        if (sourceOn) {
            double t0 = s.leakTau;
            s.leakTau = t0 + dt;
            s.leakExcess += s.leakMult * c.leakK * (Math.pow(s.leakTau, c.leakP) - Math.pow(t0, c.leakP));
        } else {
            s.leakExcess *= Math.exp(-dt / c.ventTauSec);
        }
        s.gas = c.bGas + s.leakExcess;

        boolean heatOn = s.heatAt != NONE && s.t - s.heatAt < c.heatDurationSec;
        if (s.incidentAt != NONE && s.t - s.incidentAt < 1.0) s.temp += (78 - s.temp) * (1 - Math.exp(-dt / 0.25));
        else if (heatOn) s.temp = Math.min(c.heatTargetC, s.temp + c.heatRatePerSec * dt);
        else {
            double target = c.bTemp + (s.burner ? 0.3 : 0.1);
            double tau = s.temp > c.bTemp + 2 ? c.coolTauSec : 60;
            s.temp += (target - s.temp) * (1 - Math.exp(-dt / tau));
        }

        if (s.incidentAt != NONE) s.tilt = Math.min(34, s.tilt + 40 * dt);
        else if (s.faultTilt) s.tilt = Math.min(c.tiltTargetDeg, s.tilt + c.tiltRatePerSec * dt);
        else s.tilt = Math.max(c.bTilt, s.tilt - c.tiltRatePerSec * dt);

        boolean isolated = "ISOLATED".equals(s.supply) || s.incidentAt != NONE;
        s.flow = isolated ? 0 : (s.faultUsage ? c.usageFlow : s.burner ? c.cookingFlow : 0) + (sourceOn ? 0.06 : 0);
        s.cylinderKg = Math.max(0, s.cylinderKg - (s.flow / 3600) * dt);
        s.usage = s.flow < 0.01 ? "IDLE" : s.flow < 0.8 ? "NORMAL" : s.flow < c.abnormalFlow ? "HIGH" : "ABNORMAL";
        if ("ABNORMAL".equals(s.usage)) {
            if (s.usageSince == NONE) s.usageSince = s.t;
        } else s.usageSince = NONE;
    }

    // ------------------------------------------------------------------ 3. Smart Dock safety engine
    static final String[] SENSORS = {"gas", "temp", "tilt", "usage"};
    static final String[] NAMES = {"GAS", "TEMPERATURE", "TILT", "USAGE"};

    static String reading(State s, int k) {
        switch (k) {
            case 0: return f2(s.gas) + " ppm";
            case 1: return f1(s.temp) + " °C";
            case 2: return f1(s.tilt) + "°";
            default: return f2(s.flow) + " kg/h";
        }
    }

    static int worst(State s, int lvl) {
        for (int i = 0; i < 4; i++) if (s.levels[i] >= lvl) return i;
        return 0;
    }

    static void dock(State s, Config c) {
        boolean usageHeld = s.usageSince != NONE && s.t - s.usageSince >= c.abnormalSustainSec;
        s.levels[0] = levelOf("gas", s.gas, c);
        s.levels[1] = levelOf("temp", s.temp, c);
        s.levels[2] = levelOf("tilt", s.tilt, c);
        s.levels[3] = usageHeld ? 2 : "ABNORMAL".equals(s.usage) ? 1 : 0;
        int max = Math.max(Math.max(s.levels[0], s.levels[1]), Math.max(s.levels[2], s.levels[3]));

        if ("OPEN".equals(s.supply) && "NONE".equals(s.outcome)) {
            if (max >= 1 && "NORMAL".equals(s.safety)) {
                int k = worst(s, 1);
                s.safety = "ANOMALY";
                if ("COOKING".equals(s.phase)) s.phase = "ANOMALY";
                emit(s, "anomaly", "notice", NAMES[k] + " ANOMALY DETECTED — " + reading(s, k));
            }
            if (max >= 2 && s.warningAt == NONE) {
                int k = worst(s, 2);
                s.warningAt = s.t;
                s.safety = "WARNING";
                s.phase = "WARNING";
                s.alarm = "warning";
                emit(s, "warning", "warning", "Safety threshold exceeded — " + NAMES[k] + " " + reading(s, k) + " · Smart Dock alarm on");
            }
            if (max >= 3 && !"CRITICAL".equals(s.safety)) {
                int k = worst(s, 3);
                s.safety = "CRITICAL";
                s.phase = "CRITICAL";
                s.alarm = "critical";
                emit(s, "critical", "critical", "CRITICAL — " + NAMES[k] + " " + reading(s, k));
            }
            if (s.warningAt != NONE && (s.t - s.warningAt >= c.confirmSec - 1e-9 || max >= 3)) {
                s.shutoffAt = s.t;
                s.supply = "CLOSING";
                s.phase = "RESPONSE";
                emit(s, "shutoff", "warning", "Simulated automatic shutoff initiated");
            }
        } else if ("CLOSING".equals(s.supply) && s.t - s.shutoffAt >= c.valveTravelSec - 1e-9) {
            s.supply = "ISOLATED";
            s.isolatedAt = s.t;
            s.safety = "ISOLATED";
            if (s.burner) s.burner = false;
            emit(s, "isolated", "success", "LPG SUPPLY ISOLATED (simulated)");
        } else if ("ISOLATED".equals(s.supply) && "NONE".equals(s.outcome)) {
            boolean chefSafe = "exited".equals(s.chefAction) || "relieved".equals(s.chefAction);
            boolean clear = s.gas < c.clearGas && s.levels[1] == 0 && s.levels[2] == 0 && s.levels[3] == 0 && chefSafe;
            if (!clear) s.clearSince = NONE;
            else if (s.clearSince == NONE) s.clearSince = s.t;
            else if (s.t - s.clearSince >= c.clearHoldSec - 1e-9) {
                s.phase = "CONTAINED";
                s.safety = "SAFE";
                s.alarm = "none";
                s.outcome = "CONTAINED";
                s.containedAt = s.t;
                emit(s, "contained", "success", "INCIDENT CONTAINED — no simulated blast occurred");
            }
        }
    }

    // ------------------------------------------------------------------ 3b. no dock: nobody is warned
    static void unprotected(State s, Config c) {
        if (s.incidentAt != NONE) {
            if ("INCIDENT".equals(s.phase) && s.t - s.incidentAt >= c.incidentSec - 1e-9) {
                s.phase = "RECOVERY";
                s.outcome = "ESCALATION";
                emit(s, "recovery", "info", "Simulation frozen — outcome: INCIDENT ESCALATION");
            }
            return;
        }
        if (!s.leakActive && s.tilt >= c.tiltLeakDeg && "OPEN".equals(s.supply)) startLeak(s, "Cylinder tilt strains the regulator — simulated leak begins (unnoticed)");
        if (s.leakActive && !s.heatBoost && s.temp >= c.heatLeakTemp) {
            s.heatBoost = true;
            s.leakMult *= 2;
            emit(s, "heat_leak", "notice", "High temperature near the cylinder — simulated leak worsens (unnoticed)");
        }
        if ("ABNORMAL".equals(s.usage) && !s.usageLogged) {
            s.usageLogged = true;
            emit(s, "usage_unnoticed", "notice", "Unusual usage pattern — nobody is monitoring it");
        }
        if (s.leakActive && !s.gasRisingLogged && s.gas >= c.thGas[1]) {
            s.gasRisingLogged = true;
            emit(s, "gas_rising", "notice", "Gas level rising — " + f2(s.gas) + " ppm (no alarm, no sensor)");
        }
        if (s.dangerAt == NONE && s.gas >= c.dangerGas) {
            s.dangerAt = s.t;
            s.phase = "DANGER";
            emit(s, "danger", "critical", "DANGER — " + f2(s.gas) + " ppm with no early warning");
        }
        if (s.gas >= c.incidentGas) {
            s.incidentAt = s.t;
            s.phase = "INCIDENT";
            s.burner = false;
            s.leakActive = false;
            emit(s, "incident", "critical", "SIMULATED INCIDENT — FOR DEMONSTRATION ONLY");
        }
    }

    // ------------------------------------------------------------------ 4. chef
    static void chef(State s, double dt, Config c) {
        double since = s.t - s.chefSince;
        String a = s.chefAction;
        if (s.withDock()) {
            if (s.warningAt != NONE && ("cooking".equals(a) || "idle".equals(a))) {
                setChef(s, "alerted");
                emit(s, "chef_alerted", "warning", "Chef alerted by the Smart Dock alarm");
            } else if ("alerted".equals(a) && since >= 0.6) {
                if (s.burner) {
                    s.burner = false;
                    emit(s, "burner_off", "info", "Chef stopped cooking — burner off");
                }
                setChef(s, "walking");
            } else if ("exited".equals(a) && "CONTAINED".equals(s.outcome) && s.t - s.containedAt >= c.relievedAfterSec - 1e-9) {
                setChef(s, "relieved");
                emit(s, "relieved", "success", "All clear — chef relieved (“whew”)");
            }
        } else {
            if (s.dangerAt != NONE && ("cooking".equals(a) || "idle".equals(a))) {
                setChef(s, "noticing");
                emit(s, "chef_noticed", "warning", "Chef notices the problem — too late for an early warning");
            } else if ("noticing".equals(a) && since >= c.reactionSec - 1e-9) {
                setChef(s, "fleeing");
                emit(s, "chef_fleeing", "warning", "Chef leaves the cooking area");
            }
        }
        if ("walking".equals(s.chefAction) || "fleeing".equals(s.chefAction)) {
            double speed = "walking".equals(s.chefAction) ? c.calmSpeed : c.fleeSpeed;
            double budget = speed * dt;
            while (budget > 0 && s.chefWp < c.path.length) {
                double tx = c.path[s.chefWp][0], tz = c.path[s.chefWp][2];
                double dx = tx - s.chefX, dz = tz - s.chefZ;
                double d = Math.hypot(dx, dz);
                s.chefHeading = Math.atan2(dx, dz);
                if (d <= budget) {
                    s.chefX = tx;
                    s.chefZ = tz;
                    budget -= d;
                    s.chefWp++;
                } else {
                    s.chefX += (dx / d) * budget;
                    s.chefZ += (dz / d) * budget;
                    budget = 0;
                }
            }
            if (s.chefWp >= c.path.length) {
                setChef(s, "exited");
                s.chefHeading = Math.PI / 3;
                emit(s, "chef_exited", "info", "Chef is out of the immediate kitchen zone");
            }
        }
    }

    public static String headline(State s) {
        if (s.withDock()) {
            switch (s.phase) {
                case "IDLE": return "Smart Dock ready";
                case "COOKING": return "PROTECTED — cooking normally";
                case "ANOMALY": return "GAS ANOMALY DETECTED";
                case "WARNING": return "EARLY WARNING — alarm sounding";
                case "CRITICAL": return "CRITICAL — shutting off supply";
                case "RESPONSE": return "ISOLATED".equals(s.supply) ? "LPG SUPPLY ISOLATED" : "SIMULATED AUTOMATIC SHUTOFF";
                case "CONTAINED": return "INCIDENT CONTAINED";
                default: return s.phase;
            }
        }
        switch (s.phase) {
            case "IDLE": return "No monitoring installed";
            case "COOKING": return "Cooking — no monitoring";
            case "LEAK": return "Leak in progress — nobody knows";
            case "DANGER": return "DANGER — no early warning";
            case "INCIDENT": return "SIMULATED INCIDENT";
            case "RECOVERY": return "INCIDENT ESCALATION";
            default: return s.phase;
        }
    }

    public static boolean hasEvent(State s, String kind) {
        for (Event e : s.events) if (e.kind.equals(kind)) return true;
        return false;
    }

    public static Event event(State s, String kind) {
        for (Event e : s.events) if (e.kind.equals(kind)) return e;
        return null;
    }
}
