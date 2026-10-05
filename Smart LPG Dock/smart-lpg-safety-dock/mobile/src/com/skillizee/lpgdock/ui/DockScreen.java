package com.skillizee.lpgdock.ui;

import android.view.View;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.TextView;
import com.skillizee.lpgdock.engine.Engine;
import com.skillizee.lpgdock.gl.Models;
import com.skillizee.lpgdock.gl.ProductRenderer;
import com.skillizee.lpgdock.gl.SceneView;
import com.skillizee.lpgdock.sim.App;
import java.util.Locale;

/** 3D product view: tap a component for its information. Concept / prototype — no certified accuracy claimed. */
public final class DockScreen extends Screen {
    ProductRenderer r;
    SceneView gl;
    TextView name, text, spec, live;
    LinearLayout flow;

    public DockScreen(MainActivity a) {
        super(a);
    }

    String[] info(int i) {
        Engine.Config c = App.config;
        switch (Models.PARTS[i]) {
            case "gas": return new String[] {"GAS DETECTION", "Monitors simulated gas concentration and triggers the safety workflow when configured thresholds are exceeded.", String.format(Locale.US, "Simulated thresholds: anomaly %.2f · warning %.2f · critical %.2f ppm", c.thGas[0], c.thGas[1], c.thGas[2])};
            case "temp": return new String[] {"TEMPERATURE SENSOR", "Watches the temperature beside the cylinder. Unusual heat near LPG is treated as an early warning sign.", String.format(Locale.US, "Simulated thresholds: %.0f / %.0f / %.0f °C", c.thTemp[0], c.thTemp[1], c.thTemp[2])};
            case "tilt": return new String[] {"TILT SENSOR (IMU)", "Measures how far the cylinder leans. A tipped cylinder can strain the regulator joint.", String.format(Locale.US, "Simulated thresholds: %.0f° / %.0f° / %.0f°", c.thTilt[0], c.thTilt[1], c.thTilt[2])};
            case "dock": return new String[] {"DOCK BASE · LOAD CELLS", "A weighing platform under the cylinder. Weight over time gives remaining LPG and the usage pattern — e.g. gas flowing with no cooking.", String.format(Locale.US, "Simulated: abnormal above %.1f kg/h for %.0f s", c.abnormalFlow, c.abnormalSustainSec)};
            case "status": return new String[] {"STATUS & CONNECTION RING", "Green = normal · amber = warning · red = critical · blue = supply isolated. The same state is reported to the app.", "Every state is also shown as text — never colour alone"};
            case "shutoff": return new String[] {"SIMULATED SHUTOFF MECHANISM", "A clamp-on actuator that turns the regulator to OFF. In this prototype the shutoff is SIMULATED — no real valve is controlled by the app.", String.format(Locale.US, "Simulated: closes %.0f s after a confirmed warning, %.0f s travel", c.confirmSec, c.valveTravelSec)};
            case "controller": return new String[] {"CONTROLLER MODULE", "Runs the safety engine (the same logic as this app's dock engine), drives the beacon and buzzer, and reports telemetry.", "Concept: microcontroller + Wi-Fi/BLE"};
            case "regulator": return new String[] {"REGULATOR & HOSE", "The standard regulator and hose to the stove. The simulated actuator acts on the regulator's supply knob.", "Unmodified standard parts (concept)"};
            default: return new String[] {"LPG CYLINDER · " + c.cylinderId, "Commercial cylinder (blue) standing on the dock. The dock does not modify the cylinder.", String.format(Locale.US, "Simulated contents %.1f kg of %.0f kg", c.cylinderKg, c.cylinderCapacityKg)};
        }
    }

    @Override
    protected View build() {
        LinearLayout outer = Ui.col();
        r = new ProductRenderer(App.main);
        gl = new SceneView(a, r, new SceneView.Orbit() {
            public void orbit(float dy, float dp) {
                r.autoRotate = false;
                r.yaw += dy;
                r.pitch = Math.max(-0.2f, Math.min(1.3f, r.pitch + dp));
            }

            public void zoom(float f) {
                r.dist = Math.max(1.2f, Math.min(5f, r.dist * f));
            }

            public void tap(float x, float y) {
                int p = r.pick(x, y);
                if (p >= 0) {
                    r.selected = p;
                    r.autoRotate = false;
                    a.runOnUiThread(() -> select(p));
                }
            }
        });
        FrameLayout box = new FrameLayout(a);
        box.addView(gl, new FrameLayout.LayoutParams(-1, -1));
        box.setBackground(Ui.round(Ui.CREAM_100, 16, Ui.LINE));
        box.setClipToOutline(true);
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-1, (int) (a.screenH() * 0.40f));
        bp.setMargins(Ui.dp(10), Ui.dp(8), Ui.dp(10), 0);
        outer.addView(box, bp);
        ScrollView sv = new ScrollView(a);
        LinearLayout c = Ui.col();
        c.setPadding(Ui.dp(16), Ui.dp(8), Ui.dp(16), Ui.dp(24));
        sv.addView(c);
        outer.addView(sv, new LinearLayout.LayoutParams(-1, 0, 1f));
        LinearLayout ex = Ui.row();
        ex.addView(Ui.text("Exploded view", 13, Ui.INK_SOFT, true));
        SeekBar sb = new SeekBar(a);
        sb.setMax(100);
        sb.setProgress(55);
        sb.setContentDescription("Exploded view amount");
        sb.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            public void onProgressChanged(SeekBar s, int p, boolean u) {
                r.explode = p / 100f;
            }

            public void onStartTrackingTouch(SeekBar s) {}

            public void onStopTrackingTouch(SeekBar s) {}
        });
        ex.addView(sb, Ui.weight(1));
        c.addView(ex);
        live = Ui.chip("LIVE LED · NORMAL", "ok");
        Ui.add(c, live, 6);
        LinearLayout card = Ui.card();
        card.addView(Ui.kicker("Component · tap the 3D model"));
        name = Ui.text("", 20, Ui.INK, true);
        Ui.add(card, name, 4);
        text = Ui.text("", 14, Ui.INK_SOFT, false);
        Ui.add(card, text, 6);
        spec = Ui.mono("", 11.5f, Ui.INK_SOFT);
        spec.setBackground(Ui.round(Ui.CREAM_100, 8, Ui.LINE));
        spec.setPadding(Ui.dp(10), Ui.dp(8), Ui.dp(10), Ui.dp(8));
        Ui.add(card, spec, 8);
        Ui.add(card, Ui.mono("CONCEPT / PROTOTYPE", 10, Ui.INK_FAINT), 6);
        Ui.add(c, card, 10);
        LinearLayout list = Ui.card();
        list.addView(Ui.kicker("Components"));
        for (int i = 0; i < Models.PARTS.length; i++) {
            final int k = new int[] {3, 4, 5, 2, 6, 7, 8, 0, 1}[i];
            TextView b = Ui.button(info(k)[0], "secondary", v -> {
                r.selected = k;
                r.autoRotate = false;
                select(k);
            });
            Ui.add(list, b, 6);
        }
        Ui.add(c, list, 10);
        LinearLayout how = Ui.card();
        how.addView(Ui.kicker("How the dock works · follows the live simulation"));
        flow = Ui.col();
        Ui.add(how, flow, 8);
        Ui.add(how, Ui.button("Run it live", "primary", v -> {
            App.main.restart("with", "scripted", true);
            a.go(MainActivity.SIM);
        }), 10);
        Ui.add(c, how, 10);
        select(3);
        return outer;
    }

    void select(int i) {
        String[] x = info(i);
        name.setText(x[0]);
        text.setText("“" + x[1] + "”");
        spec.setText(x[2]);
    }

    static final String[] STEPS = {"LPG CYLINDER", "SMART DOCK", "SENSORS", "DATA", "SAFETY ENGINE", "ALERT", "SIMULATED SHUTOFF", "INCIDENT CONTAINED"};

    static int stage(Engine.State s) {
        if (!s.withDock()) return -1;
        switch (s.phase) {
            case "IDLE": return 1;
            case "COOKING": return 3;
            case "ANOMALY": return 4;
            case "WARNING": case "CRITICAL": return 5;
            case "RESPONSE": return 6;
            case "CONTAINED": return 7;
            default: return -1;
        }
    }

    @Override
    public void update() {
        Engine.State s = App.main.state;
        Ui.setChip(live, "LIVE LED · " + Ui.safetyText(s.safety), Ui.safetyTone(s.safety));
        int st = stage(s);
        flow.removeAllViews();
        for (int i = 0; i < STEPS.length; i++) {
            boolean cur = i == st;
            TextView t = Ui.mono((i + 1) + "  " + STEPS[i] + (cur ? "   ◀ LIVE" : ""), 12.5f, cur ? Ui.WHITE : st >= 0 && i > st ? Ui.INK_FAINT : Ui.INK);
            t.setBackground(Ui.round(cur ? Ui.LPG_DARK : Ui.WHITE, 10, cur ? 0 : Ui.LINE));
            t.setPadding(Ui.dp(10), Ui.dp(8), Ui.dp(10), Ui.dp(8));
            Ui.add(flow, t, i == 0 ? 0 : 4);
            if (i < STEPS.length - 1) {
                TextView arrow = Ui.text("↓", 12, Ui.INK_FAINT, true);
                arrow.setPadding(Ui.dp(14), 0, 0, 0);
                flow.addView(arrow);
            }
        }
    }

    @Override
    public void show() {
        gl.onResume();
    }

    @Override
    public void hide() {
        gl.onPause();
    }
}
