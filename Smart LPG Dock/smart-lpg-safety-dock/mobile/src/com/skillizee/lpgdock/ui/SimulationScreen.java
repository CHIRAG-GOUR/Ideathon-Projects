package com.skillizee.lpgdock.ui;

import android.view.View;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import com.skillizee.lpgdock.engine.Engine;
import com.skillizee.lpgdock.sim.App;

public final class SimulationScreen extends Screen {
    KitchenPanel kitchen;
    Parts.Transport transport;
    Parts.Scenario scenario;
    Parts.Telemetry tele;
    Parts.Timeline tl;
    TextView title, status, segWith, segWithout, segScript, segFree;

    public SimulationScreen(MainActivity a) {
        super(a);
    }

    @Override
    protected View build() {
        boolean land = a.landscape();
        LinearLayout outer = land ? Ui.row() : Ui.col();
        kitchen = new KitchenPanel(a, App.main);
        ScrollView sv = new ScrollView(a);
        LinearLayout c = Ui.col();
        c.setPadding(Ui.dp(16), Ui.dp(10), Ui.dp(16), Ui.dp(24));
        sv.addView(c);
        if (land) {
            outer.addView(kitchen.view, new LinearLayout.LayoutParams(0, -1, 1.3f));
            outer.addView(sv, new LinearLayout.LayoutParams(0, -1, 1f));
        } else {
            LinearLayout.LayoutParams kp = new LinearLayout.LayoutParams(-1, (int) (a.screenH() * 0.40f));
            kp.setMargins(Ui.dp(10), Ui.dp(8), Ui.dp(10), 0);
            outer.addView(kitchen.view, kp);
            outer.addView(sv, new LinearLayout.LayoutParams(-1, 0, 1f));
        }
        title = Ui.text("", 20, Ui.INK, true);
        c.addView(title);
        status = Ui.mono("", 12, Ui.INK_MUTED);
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        Ui.add(c, status, 4);
        LinearLayout seg = Ui.row();
        segWithout = segBtn("Without dock", v -> App.main.restart("without", App.main.mode, false));
        segWith = segBtn("With Smart Dock", v -> App.main.restart("with", App.main.mode, false));
        seg.addView(segWithout, Ui.weight(1));
        seg.addView(segWith, Ui.weight(1));
        Ui.add(c, seg, 10);
        LinearLayout seg2 = Ui.row();
        segScript = segBtn("Scripted leak 00:08", v -> App.main.restart(App.main.scenario, "scripted", false));
        segFree = segBtn("Free play", v -> App.main.restart(App.main.scenario, "free", false));
        seg2.addView(segScript, Ui.weight(1));
        seg2.addView(segFree, Ui.weight(1));
        Ui.add(c, seg2, 6);
        transport = new Parts.Transport(a, App.main);
        Ui.add(c, transport.view, 10);
        LinearLayout sc = Ui.card();
        scenario = new Parts.Scenario();
        sc.addView(scenario.view);
        Ui.add(c, sc, 12);
        LinearLayout t = Ui.card();
        t.addView(Ui.kicker("Live telemetry"));
        tele = new Parts.Telemetry(true, 2);
        Ui.add(t, tele.grid, 6);
        Ui.add(c, t, 12);
        LinearLayout f = Ui.card();
        f.addView(Parts.faults(a, App.main));
        Ui.add(c, f, 12);
        LinearLayout e = Ui.card();
        e.addView(Ui.kicker("Event timeline"));
        tl = new Parts.Timeline(30);
        Ui.add(e, tl.view, 8);
        Ui.add(c, e, 12);
        return outer;
    }

    TextView segBtn(String label, View.OnClickListener on) {
        TextView b = Ui.button(label, "secondary", on);
        b.setTextSize(13);
        return b;
    }

    void seg(TextView b, boolean on) {
        b.setTextColor(on ? Ui.WHITE : Ui.INK_SOFT);
        b.setBackground(Ui.round(on ? Ui.INK : Ui.WHITE, 12, on ? 0 : Ui.LINE));
    }

    @Override
    public void update() {
        Engine.State s = App.main.state;
        title.setText(s.withDock() ? "WITH SMART LPG DOCK" : "WITHOUT SMART DOCK");
        status.setText(s.phase + " · t " + Engine.clock(s.t) + " · " + Engine.headline(s));
        seg(segWith, s.withDock());
        seg(segWithout, !s.withDock());
        seg(segScript, "scripted".equals(s.mode));
        seg(segFree, "free".equals(s.mode));
        transport.update();
        scenario.update(s);
        tele.update(App.main);
        tl.update(App.main);
        kitchen.update();
    }

    @Override
    public void show() {
        kitchen.onResume();
    }

    @Override
    public void hide() {
        kitchen.onPause();
    }
}
