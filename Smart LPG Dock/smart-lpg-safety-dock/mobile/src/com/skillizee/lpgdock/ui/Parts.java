package com.skillizee.lpgdock.ui;

import android.graphics.Typeface;
import android.view.Gravity;
import android.view.View;
import android.widget.GridLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.skillizee.lpgdock.engine.Engine;
import com.skillizee.lpgdock.services.Prefs;
import com.skillizee.lpgdock.sim.SimController;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Reusable blocks built from the engine state only. */
public final class Parts {
    // ------------------------------------------------------------------ telemetry cards
    public static final class Telemetry {
        public final GridLayout grid;
        final Widgets.TCard gas, temp, tilt, usage, cyl, dock, safety;
        final boolean compact;

        public Telemetry(boolean compact, int columns) {
            this.compact = compact;
            grid = new GridLayout(Ui.ctx);
            grid.setColumnCount(columns);
            gas = card("Gas detection", "gas");
            temp = card("Temperature", "temp");
            tilt = card("Cylinder tilt", "tilt");
            usage = card("Usage", "flow");
            cyl = compact ? null : card("Cylinder", "text");
            dock = compact ? null : card("Dock", "text");
            safety = compact ? null : card("Safety state", "text");
        }

        Widgets.TCard card(String t, String k) {
            Widgets.TCard c = new Widgets.TCard(Ui.ctx, t, k, compact);
            GridLayout.LayoutParams p = new GridLayout.LayoutParams(GridLayout.spec(GridLayout.UNDEFINED), GridLayout.spec(GridLayout.UNDEFINED, 1f));
            p.width = 0;
            p.setMargins(Ui.dp(4), Ui.dp(4), Ui.dp(4), Ui.dp(4));
            grid.addView(c, p);
            return c;
        }

        public void update(SimController sc) {
            Engine.State s = sc.state;
            Engine.Config c = sc.config;
            String at = "t+" + Engine.clock(s.t) + (s.withDock() ? "" : " · no sensor (simulated truth)");
            int g = Engine.levelOf("gas", s.gas, c), tp = Engine.levelOf("temp", s.temp, c), tl = Engine.levelOf("tilt", s.tilt, c);
            gas.set(Engine.f2(s.gas), "ppm", Ui.LEVEL[g], Ui.levelTone(g), at, Widgets.series(s.history, "gas", 60), c.thGas[1], c.thGas[2]);
            temp.set(Engine.f1(s.temp), "°C", Ui.LEVEL[tp], Ui.levelTone(tp), at, Widgets.series(s.history, "temp", 60), c.thTemp[1], c.thTemp[0]);
            tilt.set(Engine.f1(s.tilt), "°", Ui.LEVEL[tl], Ui.levelTone(tl), at, Widgets.series(s.history, "tilt", 60), c.thTilt[1], c.thTilt[0]);
            String ut = "ABNORMAL".equals(s.usage) ? (s.levels[3] >= 2 ? "warn" : "info") : "HIGH".equals(s.usage) ? "info" : "ok";
            usage.set(Engine.f2(s.flow), "kg/h", s.usage, ut, at, Widgets.series(s.history, "flow", 60), Double.NaN, c.abnormalFlow);
            if (cyl != null) {
                int pct = (int) Math.round(s.cylinderKg / c.cylinderCapacityKg * 100);
                cyl.set(c.cylinderId, "", "ISOLATED".equals(s.supply) ? "ISOLATED" : s.incidentAt >= 0 ? "DAMAGED (SIM)" : "CONNECTED", "ISOLATED".equals(s.supply) ? "isolated" : s.incidentAt >= 0 ? "danger" : "ok", String.format(Locale.US, "%.2f kg LPG · %d%% of %.0f kg", s.cylinderKg, pct, c.cylinderCapacityKg), null, Double.NaN, 1);
                boolean d = "CONNECTED".equals(s.dock);
                dock.set(d ? c.dockId : "—", "", d ? "CONNECTED" : "NOT INSTALLED", d ? "ok" : "neutral", d ? "Supply valve: " + s.supply + " · simulated" : "Nothing is monitored in this scenario", null, Double.NaN, 1);
                safety.set(Ui.safetyText(s.safety), "", s.phase, Ui.safetyTone(s.safety), at + " · alarm " + ("none".equals(s.alarm) ? "off" : s.alarm), null, Double.NaN, 1);
            }
        }
    }

    // ------------------------------------------------------------------ transport
    public static final class Transport {
        public final LinearLayout view;
        final TextView play;
        final TextView[] speeds = new TextView[3];
        static final double[] SP = {0.5, 1, 2};
        final SimController[] sims;

        public Transport(MainActivity a, SimController... sims) {
            this.sims = sims;
            view = Ui.row();
            play = Ui.button("▶  Start", "primary", v -> {
                if (sims[0].running) for (SimController s : sims) s.pause();
                else for (SimController s : sims) s.start();
                a.sound.play("click");
                update();
            });
            view.addView(play, Ui.weight(1.2f));
            TextView restart = Ui.button("↻  Restart", "secondary", v -> {
                for (SimController s : sims) s.restart();
                update();
            });
            LinearLayout.LayoutParams p = Ui.weight(1.1f);
            p.leftMargin = Ui.dp(8);
            view.addView(restart, p);
            for (int i = 0; i < 3; i++) {
                final double x = SP[i];
                speeds[i] = Ui.button((x == 0.5 ? "0.5" : String.valueOf((int) x)) + "×", "secondary", v -> {
                    for (SimController s : sims) s.speed = x;
                    Prefs.speed(a, x);
                    update();
                });
                speeds[i].setContentDescription("Speed " + x + " times");
                LinearLayout.LayoutParams q = Ui.weight(0.7f);
                q.leftMargin = Ui.dp(6);
                speeds[i].setPadding(Ui.dp(4), 0, Ui.dp(4), 0);
                view.addView(speeds[i], q);
            }
            update();
        }

        public void update() {
            boolean run = sims[0].running;
            play.setText(run ? "❚❚  Pause" : "▶  Start");
            play.setBackground(Ui.round(run ? Ui.INK : Ui.LPG_DARK, 12, 0));
            for (int i = 0; i < 3; i++) {
                boolean on = sims[0].speed == SP[i];
                speeds[i].setTextColor(on ? Ui.WHITE : Ui.INK);
                speeds[i].setBackground(Ui.round(on ? Ui.LPG : Ui.WHITE, 12, on ? 0 : Ui.LINE));
            }
        }
    }

    // ------------------------------------------------------------------ fault injection
    public static View faults(MainActivity a, SimController sim) {
        LinearLayout box = Ui.col();
        box.addView(Ui.kicker("▲ Simulation controls · fault injection"));
        String[][] f = {{"leak", "Gas leak", "Start / increase a simulated leak"}, {"heat", "Temperature rise", "Heat near the cylinder"}, {"tilt", "Cylinder tilt", "Tip the cylinder"}, {"usage", "Unusual usage", "High flow, no cooking"}};
        GridLayout g = new GridLayout(a);
        g.setColumnCount(2);
        for (String[] x : f) {
            LinearLayout b = Ui.col();
            b.setBackground(Ui.round(Ui.CREAM_100, 12, Ui.LINE));
            b.setPadding(Ui.dp(10), Ui.dp(10), Ui.dp(10), Ui.dp(10));
            b.addView(Ui.text(x[1], 14, Ui.INK, true));
            b.addView(Ui.text(x[2], 11.5f, Ui.INK_MUTED, false));
            b.setClickable(true);
            b.setFocusable(true);
            b.setContentDescription("Inject simulated fault: " + x[1]);
            b.setOnClickListener(v -> sim.inject(x[0]));
            GridLayout.LayoutParams p = new GridLayout.LayoutParams(GridLayout.spec(GridLayout.UNDEFINED), GridLayout.spec(GridLayout.UNDEFINED, 1f));
            p.width = 0;
            p.setMargins(Ui.dp(3), Ui.dp(3), Ui.dp(3), Ui.dp(3));
            g.addView(b, p);
        }
        Ui.add(box, g, 6);
        Ui.add(box, Ui.button("Clear faults", "ghost", v -> sim.clearFaults()), 4);
        Ui.add(box, Ui.text("These change the simulation only. They are not instructions for real LPG equipment.", 11, Ui.INK_FAINT, false), 2);
        return box;
    }

    // ------------------------------------------------------------------ narration + state machine + outcome
    public static String[] narration(Engine.State s) {
        if (s.withDock()) {
            if ("CONTAINED".equals(s.outcome)) return new String[] {"5", "INCIDENT CONTAINED", "relieved".equals(s.chefAction) ? "Gas back to baseline, supply isolated, chef safe — and relieved." : "Readings are back to normal. No simulated blast occurred."};
            if (Engine.hasEvent(s, "chef_exited") || "walking".equals(s.chefAction)) return new String[] {"4", "CHEF RESPONSE", "Warned early, the chef turns off the burner and calmly leaves the cooking area."};
            if (Engine.hasEvent(s, "shutoff")) return new String[] {"3", "SAFETY RESPONSE", "ISOLATED".equals(s.supply) ? "LPG SUPPLY ISOLATED — simulated automatic shutoff complete." : "SIMULATED AUTOMATIC SHUTOFF — the actuator is closing the supply."};
            if (Engine.hasEvent(s, "warning")) return new String[] {"2", "EARLY WARNING", "NORMAL → WARNING. Beacon, sound and app alert — long before the gas gets dangerous."};
            if (Engine.hasEvent(s, "anomaly")) return new String[] {"1", "GAS ANOMALY DETECTED", "The dock’s gas sensor sees the rise within seconds."};
            if (Engine.hasEvent(s, "leak_introduced")) return new String[] {"1", "LEAK BEGINS", "A simulated leak starts at the regulator. The dock is watching."};
            return new String[] {"0", "PROTECTED", "Chef cooking normally. Smart Dock active and monitoring."};
        }
        if ("RECOVERY".equals(s.phase)) return new String[] {"5", "INCIDENT ESCALATION", "Without early detection the simulated leak escalated. Simulation frozen."};
        if (Engine.hasEvent(s, "incident")) return new String[] {"5", "SIMULATED INCIDENT", "For demonstration only — not a prediction of real LPG behaviour."};
        if (Engine.hasEvent(s, "chef_fleeing")) return new String[] {"4", "CHEF LEAVES", "The chef gets out of the immediate kitchen zone — with seconds to spare."};
        if (Engine.hasEvent(s, "danger")) return new String[] {"3", "DANGER — NO EARLY WARNING", "Nothing warned the chef. They only notice once it is already dangerous."};
        if (Engine.hasEvent(s, "leak_introduced")) return new String[] {"2", "LEAK BEGINS", "Gas concentration slowly rises. Nobody is measuring it."};
        return new String[] {"1", "NORMAL", "Chef cooking normally. No monitoring installed."};
    }

    static final String[] WITH = {"IDLE", "COOKING", "ANOMALY", "WARNING", "CRITICAL", "RESPONSE", "CONTAINED"};
    static final String[] WITHOUT = {"IDLE", "COOKING", "LEAK", "DANGER", "INCIDENT", "RECOVERY"};

    public static final class Scenario {
        public final LinearLayout view;
        final TextView step, title, body, machine, outcome;
        final LinearLayout outcomeBox;

        public Scenario() {
            view = Ui.col();
            LinearLayout r = Ui.row();
            r.setGravity(Gravity.TOP);
            step = Ui.mono("START", 11, Ui.WHITE);
            step.setPadding(Ui.dp(8), Ui.dp(6), Ui.dp(8), Ui.dp(6));
            r.addView(step);
            LinearLayout t = Ui.col();
            t.setPadding(Ui.dp(10), 0, 0, 0);
            title = Ui.text("", 16, Ui.INK, true);
            body = Ui.text("", 13, Ui.INK_MUTED, false);
            t.addView(title);
            t.addView(body);
            r.addView(t, Ui.weight(1));
            view.addView(r);
            machine = Ui.mono("", 11, Ui.INK_MUTED);
            Ui.add(view, machine, 10);
            outcomeBox = Ui.col();
            outcomeBox.setPadding(Ui.dp(12), Ui.dp(12), Ui.dp(12), Ui.dp(12));
            outcome = Ui.text("", 13, Ui.INK, false);
            outcomeBox.addView(outcome);
            Ui.add(view, outcomeBox, 10);
            title.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        }

        public void update(Engine.State s) {
            String[] n = narration(s);
            String tone = s.withDock() ? (n[0].equals("5") ? "ok" : Integer.parseInt(n[0]) >= 2 ? "warn" : "info") : Integer.parseInt(n[0]) >= 3 ? "danger" : n[0].equals("2") ? "warn" : "info";
            step.setText(n[0].equals("0") ? "START" : "STEP " + n[0]);
            step.setBackground(Ui.round("ok".equals(tone) ? Ui.OK : "warn".equals(tone) ? Ui.ORANGE : "danger".equals(tone) ? Ui.DANGER : Ui.LPG_DARK, 8, 0));
            title.setText(n[1]);
            body.setText(n[2]);
            StringBuilder m = new StringBuilder();
            for (String p : s.withDock() ? WITH : WITHOUT) {
                if (m.length() > 0) m.append(" → ");
                m.append(p.equals(s.phase) ? "[" + p + "]" : p);
            }
            machine.setText("STATE: " + m);
            if ("CONTAINED".equals(s.outcome)) {
                outcomeBox.setVisibility(View.VISIBLE);
                outcomeBox.setBackground(Ui.round(Ui.OK_BG, 14, 0xFFCDEEDB));
                outcome.setText("INCIDENT CONTAINED\nGas " + Engine.f2(s.gas) + " ppm · Temperature " + Engine.f1(s.temp) + " °C · Tilt " + Engine.f1(s.tilt) + "°\nDock SAFE · Cylinder ISOLATED\nNO SIMULATED BLAST OCCURRED");
                outcome.setTextColor(Ui.OK);
                outcome.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
            } else if ("ESCALATION".equals(s.outcome)) {
                outcomeBox.setVisibility(View.VISIBLE);
                outcomeBox.setBackground(Ui.round(Ui.DANGER_BG, 14, 0xFFFAD3D0));
                outcome.setText("INCIDENT ESCALATION\nLeak → late notice → simulated incident.\nSIMULATED INCIDENT — FOR DEMONSTRATION ONLY");
                outcome.setTextColor(Ui.DANGER);
                outcome.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
            } else outcomeBox.setVisibility(View.GONE);
        }
    }

    // ------------------------------------------------------------------ event timeline
    public static final class Timeline {
        public final LinearLayout view;
        int shown = -1;
        String session = "";
        final int max;

        public Timeline(int max) {
            this.max = max;
            view = Ui.col();
            view.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        }

        public void update(SimController sc) {
            Engine.State s = sc.state;
            if (s.events.size() == shown && sc.sessionId.equals(session)) return;
            shown = s.events.size();
            session = sc.sessionId;
            view.removeAllViews();
            if (s.events.isEmpty()) {
                view.addView(Ui.text("No events yet — start the simulation.", 13, Ui.INK_MUTED, false));
                return;
            }
            SimpleDateFormat f = new SimpleDateFormat("HH:mm:ss", Locale.getDefault());
            for (int i = s.events.size() - 1, n = 0; i >= 0 && n < max; i--, n++) {
                Engine.Event e = s.events.get(i);
                LinearLayout row = Ui.row();
                row.setGravity(Gravity.TOP);
                TextView dot = Ui.text("●", 12, "critical".equals(e.level) ? Ui.RED : "warning".equals(e.level) ? Ui.ORANGE : "success".equals(e.level) ? Ui.GREEN : "notice".equals(e.level) ? Ui.LPG : Ui.INK_FAINT, true);
                row.addView(dot);
                LinearLayout t = Ui.col();
                t.setPadding(Ui.dp(8), 0, 0, 0);
                t.addView(Ui.mono(f.format(new Date(sc.startedAtWall + (long) (e.t * 1000))) + " · sim " + Engine.clock(e.t), 10.5f, Ui.INK_FAINT));
                t.addView(Ui.text(e.text, 13.5f, "critical".equals(e.level) ? Ui.DANGER : "warning".equals(e.level) ? Ui.WARN : "success".equals(e.level) ? Ui.OK : Ui.INK, true));
                row.addView(t, Ui.weight(1));
                Ui.add(view, row, n == 0 ? 0 : 8);
            }
        }
    }
}
