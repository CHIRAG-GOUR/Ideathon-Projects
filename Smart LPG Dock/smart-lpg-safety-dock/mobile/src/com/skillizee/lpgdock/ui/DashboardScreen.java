package com.skillizee.lpgdock.ui;

import android.graphics.BitmapFactory;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import com.skillizee.lpgdock.engine.Engine;
import com.skillizee.lpgdock.sim.App;

public final class DashboardScreen extends Screen {
    TextView status, sub;
    TextView[] vals = new TextView[6];
    Parts.Telemetry tele;
    Parts.Timeline tl;

    public DashboardScreen(MainActivity a) {
        super(a);
    }

    @Override
    protected View build() {
        ScrollView sv = new ScrollView(a);
        LinearLayout c = Ui.col();
        c.setPadding(Ui.dp(16), Ui.dp(12), Ui.dp(16), Ui.dp(24));
        sv.addView(c);
        LinearLayout hero = Ui.card();
        hero.addView(Ui.kicker("Smart LPG Safety Dock  ·  SIMULATION"));
        status = Ui.text("● SYSTEM NORMAL", 28, Ui.OK, true);
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        Ui.add(hero, status, 6);
        sub = Ui.text("", 13, Ui.INK_MUTED, true);
        hero.addView(sub);
        try {
            ImageView img = new ImageView(a);
            img.setImageBitmap(BitmapFactory.decodeStream(a.getAssets().open("img/dock-closeup.jpg")));
            img.setAdjustViewBounds(true);
            img.setContentDescription("Concept render of the Smart LPG Dock under a blue LPG cylinder");
            img.setBackground(Ui.round(Ui.CREAM_100, 12, 0));
            img.setClipToOutline(true);
            Ui.add(hero, img, 12);
            Ui.add(hero, Ui.mono("Concept render · prototype", 10, Ui.INK_FAINT), 4);
        } catch (Exception ignored) {
            // image missing: the text dashboard still works
        }
        String[] k = {"Gas", "Temp", "Tilt", "Usage", "Dock", "Cylinder"};
        for (int i = 0; i < 6; i++) {
            LinearLayout r = Ui.row();
            r.addView(Ui.text(k[i], 14, Ui.INK_MUTED, true), Ui.weight(1));
            vals[i] = Ui.mono("", 15, Ui.INK);
            r.addView(vals[i]);
            Ui.add(hero, r, i == 0 ? 12 : 6);
        }
        Ui.add(hero, Ui.button("▶  START SIMULATION", "primary", v -> {
            App.main.start();
            a.go(MainActivity.SIM);
        }), 14);
        Ui.add(hero, Ui.button("RUN LEAK DEMO", "warn", v -> {
            App.main.restart("with", "scripted", true);
            a.go(MainActivity.SIM);
        }), 8);
        Ui.add(hero, Ui.button("OPEN 3D VIEW", "secondary", v -> a.go(MainActivity.DOCK)), 8);
        Ui.add(c, hero, 0);

        LinearLayout demo = Ui.card();
        demo.addView(Ui.kicker("Demo mode — no sign-in needed"));
        Ui.add(demo, Ui.button("RUN FULL SAFETY DEMO", "primary", v -> {
            App.main.restart("with", "scripted", true);
            a.go(MainActivity.SIM);
        }), 10);
        Ui.add(demo, Ui.text("Kitchen → chef cooking → leak → detection → simulated shutoff → contained → back to safe.", 12.5f, Ui.INK_MUTED, false), 4);
        Ui.add(demo, Ui.button("COMPARE BOTH", "dark", v -> {
            App.left.restart("without", "scripted", true);
            App.right.restart("with", "scripted", true);
            a.go(MainActivity.COMPARE);
        }), 10);
        Ui.add(demo, Ui.text("Same kitchen, same leak — without vs. with the Smart Dock, side by side.", 12.5f, Ui.INK_MUTED, false), 4);
        Ui.add(c, demo, 12);

        LinearLayout ev = Ui.card();
        ev.addView(Ui.kicker("Live events"));
        tl = new Parts.Timeline(5);
        Ui.add(ev, tl.view, 8);
        Ui.add(c, ev, 12);

        LinearLayout te = Ui.card();
        te.addView(Ui.kicker("Live telemetry · simulated"));
        tele = new Parts.Telemetry(false, a.wide() ? 3 : 1);
        Ui.add(te, tele.grid, 8);
        Ui.add(c, te, 12);
        return sv;
    }

    @Override
    public void update() {
        Engine.State s = App.main.state;
        String tone = Ui.safetyTone(s.safety);
        String st = "NORMAL".equals(s.safety) ? "SYSTEM NORMAL" : "SAFE".equals(s.safety) ? "SYSTEM SAFE" : Ui.safetyText(s.safety);
        status.setText(Ui.symbol(tone) + " " + st);
        status.setTextColor(Ui.fg(tone));
        sub.setText(Engine.headline(s) + " · " + (s.withDock() ? "WITH Smart Dock" : "WITHOUT Smart Dock"));
        vals[0].setText(Engine.f2(s.gas) + " ppm");
        vals[1].setText(Engine.f1(s.temp) + " °C");
        vals[2].setText(Engine.f1(s.tilt) + "°");
        vals[3].setText(s.usage);
        vals[4].setText("CONNECTED".equals(s.dock) ? "Connected" : "Not installed");
        vals[5].setText(App.config.cylinderId);
        tele.update(App.main);
        tl.update(App.main);
    }
}
