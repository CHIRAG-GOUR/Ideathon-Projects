package com.skillizee.lpgdock.ui;

import android.graphics.BitmapFactory;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import com.skillizee.lpgdock.engine.Engine;
import com.skillizee.lpgdock.services.Cloud;
import com.skillizee.lpgdock.sim.App;
import java.util.ArrayList;
import java.util.Locale;
import java.util.TreeSet;

/** Ten-chapter pitch with live parts: the chapters run the real engine, nothing is a recording. */
public final class PresentationScreen extends Screen {
    static final String[][] CH = {
        {"01 · The problem", "Gas leaks are invisible — and people notice late.",
            "• LPG cooks food in homes, dhabas and restaurant kitchens every day.\n• A leak at the regulator or hose gives no warning on its own.\n• By the time someone smells it, the safe window may already be gone."},
        {"02 · LPG safety risk", "Four things that go wrong around a cylinder.",
            "Leaks, heat near the cylinder, a tipped cylinder straining the regulator, and gas flowing when nobody is cooking. Each can be watched for — continuously — by something sitting right under the cylinder."},
        {"03 · Smart Dock", "A dock under the cylinder that never stops watching.",
            "No change to the cylinder or the stove. The dock carries the sensors, a status ring, a buzzer/beacon and a shutoff actuator on the regulator. Smart. Safe. Secure."},
        {"04 · Sensor system", "Four sensors, one safety engine.",
            "Readings feed a deterministic safety engine with three levels — anomaly, warning, critical. The thresholds below are the simulation’s configured values."},
        {"05 · Live monitoring", "Every value, live — from one engine.",
            "These cards are running right now. Start the demo and watch them change: gas, temperature, tilt and usage, with trends and status in words — not colour alone."},
        {"06 · Leak detection", "", ""},
        {"07 · Without Smart Dock", "Leak → no warning → late notice → simulated incident.",
            "Same kitchen, same chef, same leak. Nobody is measuring the gas. The chef notices only at DANGER and gets out. The incident that follows is a simulated educational visualisation."},
        {"08 · With Smart Dock", "Leak → early warning → simulated shutoff → contained.",
            "The dock warns the chef within seconds, isolates the supply, and the gas clears. The chef walks out calmly — and breathes out. No simulated blast occurs."},
        {"09 · Why early detection matters", "Seconds of warning change the outcome.",
            "Both runs start from identical conditions. The only difference is whether something is watching."},
        {"10 · Prototype → hardware", "From simulator to a real dock.",
            "1. Today: interactive prototype — web + Android, one simulation engine, honest labels.\n2. Next: hardware telemetry provider (load cells, gas sensor, IMU, temperature) — the app UI stays the same.\n3. Then: bench testing, a tested shutoff actuator, and safety certification before any real-world use."},
    };

    int ch;
    final TreeSet<Integer> viewed = new TreeSet<>();
    long startedAt;
    boolean visible;
    LinearLayout dots, body;
    ScrollView scroll;
    TextView counter, prev, next;
    // live parts of the current chapter (null when the chapter has none)
    KitchenPanel kitchen;
    Parts.Telemetry tele;
    Widgets.GasChart chart;
    Parts.Scenario scenario;
    TextView hint;
    String sceneFor;

    public PresentationScreen(MainActivity a) {
        super(a);
    }

    @Override
    protected View build() {
        LinearLayout outer = Ui.col();
        outer.setBackgroundColor(Ui.CREAM);
        dots = Ui.row();
        dots.setGravity(Gravity.CENTER);
        dots.setPadding(0, Ui.dp(10), 0, Ui.dp(4));
        for (int i = 0; i < CH.length; i++) {
            final int k = i;
            View d = new View(a);
            d.setContentDescription("Chapter " + (i + 1) + ": " + CH[i][0].substring(5));
            d.setOnClickListener(v -> goTo(k));
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(Ui.dp(10), Ui.dp(10));
            p.setMargins(Ui.dp(4), Ui.dp(8), Ui.dp(4), Ui.dp(8));
            dots.addView(d, p);
        }
        outer.addView(dots, Ui.fill());
        scroll = new ScrollView(a);
        body = Ui.col();
        body.setPadding(Ui.dp(18), Ui.dp(6), Ui.dp(18), Ui.dp(24));
        scroll.addView(body);
        outer.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1f));
        LinearLayout bar = Ui.row();
        bar.setBackgroundColor(Ui.WHITE);
        bar.setPadding(Ui.dp(12), Ui.dp(8), Ui.dp(12), Ui.dp(8));
        prev = Ui.button("‹  Back", "secondary", v -> goTo(ch - 1));
        next = Ui.button("Next  ›", "primary", v -> goTo(ch + 1));
        counter = Ui.mono("", 12, Ui.INK_MUTED);
        counter.setGravity(Gravity.CENTER);
        bar.addView(prev, Ui.weight(1));
        bar.addView(counter, Ui.weight(0.8f));
        bar.addView(next, Ui.weight(1));
        outer.addView(bar, Ui.fill());
        startedAt = System.currentTimeMillis();
        render();
        return outer;
    }

    void goTo(int i) {
        int k = Math.max(0, Math.min(CH.length - 1, i));
        if (k == ch && body.getChildCount() > 0) return;
        ch = k;
        render();
        scroll.scrollTo(0, 0);
    }

    void render() {
        viewed.add(ch);
        dropLive();
        body.removeAllViews();
        for (int i = 0; i < dots.getChildCount(); i++) {
            View d = dots.getChildAt(i);
            LinearLayout.LayoutParams p = (LinearLayout.LayoutParams) d.getLayoutParams();
            p.width = Ui.dp(i == ch ? 26 : 10);
            d.setLayoutParams(p);
            d.setBackground(Ui.round(i == ch ? Ui.LPG : 0xFFC9D1DB, 99, 0));
            d.setSelected(i == ch);
        }
        counter.setText((ch + 1) + " / " + CH.length);
        prev.setEnabled(ch > 0);
        prev.setAlpha(ch > 0 ? 1 : 0.4f);
        next.setText(ch == CH.length - 1 ? "Finish" : "Next  ›");
        next.setOnClickListener(v -> {
            if (ch == CH.length - 1) finish();
            else goTo(ch + 1);
        });

        String[] c = CH[ch];
        Engine.Config cf = App.config;
        String title = c[1], text = c[2];
        if (ch == 5) {
            title = "Detect at " + num(cf.thGas[0]) + " ppm. Warn at " + num(cf.thGas[1]) + ". Act within a second.";
            text = "The dock confirms a warning for " + num(cf.confirmSec) + " s, then the simulated actuator isolates the supply (" + num(cf.valveTravelSec) + " s travel). The exhaust clears the remaining gas.";
        }
        TextView k = Ui.mono(c[0].toUpperCase(Locale.US), 12, Ui.LPG);
        k.setLetterSpacing(0.16f);
        body.addView(k);
        TextView t = Ui.text(title, 25, Ui.INK, true);
        Ui.heading(t);
        Ui.add(body, t, 6);
        Ui.add(body, Ui.text(text, 15, Ui.INK_SOFT, false), 10);
        View vis = visual();
        if (vis != null) Ui.add(body, vis, 16);
        Ui.add(body, Ui.mono("CONCEPT / PROTOTYPE · ALL VALUES SIMULATED", 10, Ui.INK_FAINT), 18);
    }

    static String num(double v) {
        return v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v);
    }

    View image(String asset, String desc) {
        try {
            ImageView img = new ImageView(a);
            img.setImageBitmap(BitmapFactory.decodeStream(a.getAssets().open(asset)));
            img.setAdjustViewBounds(true);
            img.setContentDescription(desc);
            img.setBackground(Ui.round(Ui.CREAM_100, 16, 0));
            img.setClipToOutline(true);
            return img;
        } catch (Exception e) {
            return null;
        }
    }

    View visual() {
        Engine.Config cf = App.config;
        switch (ch) {
            case 0: return image("img/kitchen-without.jpg", "Concept render: restaurant kitchen with an LPG cylinder and no safety dock");
            case 1: {
                LinearLayout g = Ui.col();
                String[][] r = {{"Gas leak", "Regulator, hose or valve leaks LPG into the kitchen."}, {"Heat", "A hot stove or oven too close to the cylinder."}, {"Tilt", "A knocked or tipped cylinder strains the regulator."}, {"Unusual usage", "Gas flowing fast when nobody is cooking."}};
                for (int i = 0; i < r.length; i++) {
                    LinearLayout card = Ui.card();
                    card.addView(Ui.text("▲  " + r[i][0], 16, Ui.INK, true));
                    Ui.add(card, Ui.text(r[i][1], 13.5f, Ui.INK_MUTED, false), 4);
                    Ui.add(g, card, i == 0 ? 0 : 8);
                }
                return g;
            }
            case 2: return image("img/dock-exploded.jpg", "Concept render: exploded view of the Smart Dock parts");
            case 3: {
                LinearLayout g = Ui.col();
                String[][] r = {
                    {"Gas", "Anomaly " + num(cf.thGas[0]) + " · warning " + num(cf.thGas[1]) + " · critical " + num(cf.thGas[2]) + " ppm"},
                    {"Temperature", num(cf.thTemp[0]) + " / " + num(cf.thTemp[1]) + " / " + num(cf.thTemp[2]) + " °C near the cylinder"},
                    {"Tilt", num(cf.thTilt[0]) + "° / " + num(cf.thTilt[1]) + "° / " + num(cf.thTilt[2]) + "° lean"},
                    {"Usage", "Flow above " + num(cf.abnormalFlow) + " kg/h for " + num(cf.abnormalSustainSec) + " s"}};
                for (int i = 0; i < r.length; i++) {
                    LinearLayout card = Ui.card();
                    card.addView(Ui.text(r[i][0], 16, Ui.LPG_DARK, true));
                    Ui.add(card, Ui.mono(r[i][1], 12.5f, Ui.INK_SOFT), 4);
                    Ui.add(g, card, i == 0 ? 0 : 8);
                }
                return g;
            }
            case 4: {
                LinearLayout g = Ui.col();
                tele = new Parts.Telemetry(true, 2);
                g.addView(tele.grid, Ui.fill());
                Ui.add(g, runButton("with"), 10);
                tele.update(App.main);
                return g;
            }
            case 5: {
                LinearLayout g = Ui.card();
                g.addView(Ui.kicker("Simulated gas · live"));
                chart = new Widgets.GasChart(a, cf.thGas[1]);
                Ui.add(g, chart, 6);
                Ui.add(g, runButton("with"), 10);
                chart.set(App.main.state, null);
                return g;
            }
            case 6: return scene("without");
            case 7: return scene("with");
            case 8: return whyEarly();
            case 9: {
                LinearLayout g = Ui.col();
                View img = image("img/kitchen-with.jpg", "Concept render: the same kitchen with the Smart Dock installed");
                if (img != null) g.addView(img, Ui.fill());
                Ui.add(g, Ui.button("OPEN HOW THE DOCK WORKS", "secondary", v -> a.go(MainActivity.DOCK)), 12);
                return g;
            }
            default: return null;
        }
    }

    TextView runButton(String scen) {
        return Ui.button("▶  RUN LIVE DEMO", "with".equals(scen) ? "primary" : "dark", v -> {
            App.main.restart(scen, "scripted", true);
            a.sound.play("click");
        });
    }

    View scene(String scen) {
        LinearLayout g = Ui.col();
        sceneFor = scen;
        kitchen = new KitchenPanel(a, App.main);
        g.addView(kitchen.view, new LinearLayout.LayoutParams(-1, Math.max(Ui.dp(240), (int) (a.screenH() * 0.38f))));
        LinearLayout row = Ui.row();
        row.addView(runButton(scen), Ui.weight(1));
        TextView full = Ui.button("Full simulation", "secondary", v -> {
            App.main.restart(scen, "scripted", true);
            a.go(MainActivity.SIM);
        });
        LinearLayout.LayoutParams p = Ui.weight(1);
        p.leftMargin = Ui.dp(8);
        row.addView(full, p);
        Ui.add(g, row, 10);
        LinearLayout card = Ui.card();
        scenario = new Parts.Scenario();
        card.addView(scenario.view);
        hint = Ui.text("Press “Run live demo” — this is the real simulation, not a recording.", 13, Ui.INK_MUTED, false);
        Ui.add(card, hint, 6);
        Ui.add(g, card, 10);
        if (visible) kitchen.onResume();
        updateLive();
        return g;
    }

    /** Runs both scenarios headless on the Java engine — the same numbers the web app computes. */
    static Engine.State run(String scen, double seconds) {
        Engine.State s = Engine.create(scen, "scripted", App.config);
        int steps = (int) Math.round(seconds / App.config.stepSec);
        for (int i = 0; i < steps; i++) Engine.step(s, App.config);
        return s;
    }

    static double at(Engine.State s, String kind) {
        Engine.Event e = Engine.event(s, kind);
        return e == null ? Double.NaN : e.t;
    }

    View whyEarly() {
        Engine.State w = run("with", 40), o = run("without", 40);
        double leak = App.config.leakAtSec, warn = at(w, "warning"), iso = at(w, "isolated"), cont = at(w, "contained"), danger = at(o, "danger"), inc = at(o, "incident");
        LinearLayout g = Ui.col();
        LinearLayout a1 = Ui.col();
        a1.setBackground(Ui.round(Ui.INK, 16, 0));
        a1.setPadding(Ui.dp(16), Ui.dp(14), Ui.dp(16), Ui.dp(14));
        a1.addView(Ui.mono("WITHOUT DOCK · FIRST NOTICE", 11, 0xFFC9D1DB));
        a1.addView(Ui.text(Engine.clock(danger), 34, Ui.WHITE, true));
        a1.addView(Ui.text(String.format(Locale.US, "%.1f s after the leak starts — already at DANGER", danger - leak), 13, 0xFFE3E8EE, false));
        g.addView(a1, Ui.fill());
        LinearLayout b1 = Ui.col();
        b1.setBackground(Ui.round(Ui.LPG, 16, 0));
        b1.setPadding(Ui.dp(16), Ui.dp(14), Ui.dp(16), Ui.dp(14));
        b1.addView(Ui.mono("WITH DOCK · EARLY WARNING", 11, Ui.LPG_100));
        b1.addView(Ui.text(Engine.clock(warn), 34, Ui.WHITE, true));
        b1.addView(Ui.text(String.format(Locale.US, "%.1f s after the leak starts — %.1f s earlier, supply isolated at %s", warn - leak, danger - warn, Engine.clock(iso)), 13, Ui.LPG_100, false));
        Ui.add(g, b1, 10);
        LinearLayout tab = Ui.card();
        LinearLayout h = Ui.row();
        h.addView(Ui.kicker("In this simulation"), Ui.weight(1.4f));
        h.addView(Ui.kicker("Without"), Ui.weight(1));
        h.addView(Ui.kicker("With dock"), Ui.weight(1));
        tab.addView(h);
        Object[][] rows = {{"Leak starts", leak, leak, "", ""}, {"First warning to the chef", danger, warn, "", ""}, {"Gas supply stops", Double.NaN, iso, "", ""}, {"Outcome", inc, cont, "simulated incident", "contained"}};
        for (Object[] r : rows) {
            LinearLayout row = Ui.row();
            row.addView(Ui.text((String) r[0], 13, Ui.INK, true), Ui.weight(1.4f));
            double x = (Double) r[1], y = (Double) r[2];
            row.addView(cellCol(Double.isNaN(x) ? "— never" : Engine.clock(x), (String) r[3], Ui.INK, Ui.DANGER), Ui.weight(1));
            row.addView(cellCol(Engine.clock(y), (String) r[4], Ui.LPG_DARK, Ui.OK), Ui.weight(1));
            Ui.add(tab, row, 8);
        }
        Ui.add(g, tab, 12);
        Ui.add(g, Ui.text("Times come from the simulation’s illustrative model and thresholds (dock-config.json, shared with the web app). They show the principle — earlier detection buys time — not measured real-world performance.", 12, Ui.INK_MUTED, false), 10);
        Ui.add(g, Ui.button("COMPARE BOTH LIVE", "primary", v -> {
            App.left.restart("without", "scripted", true);
            App.right.restart("with", "scripted", true);
            a.go(MainActivity.COMPARE);
        }), 12);
        return g;
    }

    LinearLayout cellCol(String v, String label, int col, int labelCol) {
        LinearLayout c = Ui.col();
        c.addView(Ui.mono(v, 13, col));
        if (!label.isEmpty()) c.addView(Ui.text(label, 11, labelCol, true));
        return c;
    }

    void dropLive() {
        if (kitchen != null) kitchen.onPause();
        kitchen = null;
        tele = null;
        chart = null;
        scenario = null;
        hint = null;
        sceneFor = null;
    }

    void updateLive() {
        if (tele != null) tele.update(App.main);
        if (chart != null) chart.set(App.main.state, null);
        if (kitchen != null) {
            kitchen.update();
            Engine.State s = App.main.state;
            boolean mine = s.scenario.equals(sceneFor) && s.t > 0;
            scenario.view.setVisibility(mine ? View.VISIBLE : View.GONE);
            hint.setVisibility(mine ? View.GONE : View.VISIBLE);
            if (mine) scenario.update(s);
        }
    }

    void finish() {
        final ArrayList<Integer> list = new ArrayList<>(viewed);
        final long t0 = startedAt;
        if (Cloud.email(a) != null) {
            new Thread(() -> {
                try {
                    Cloud.savePresentation(a, list, t0);
                } catch (Exception ignored) {
                    // History is optional; the presentation itself never depends on the network.
                }
            }).start();
        }
        viewed.clear();
        startedAt = System.currentTimeMillis();
        ch = 0;
        render();
        a.go(MainActivity.DASH);
    }

    @Override
    public void update() {
        updateLive();
    }

    @Override
    public void show() {
        visible = true;
        if (kitchen != null) kitchen.onResume();
    }

    @Override
    public void hide() {
        visible = false;
        if (kitchen != null) kitchen.onPause();
    }
}
