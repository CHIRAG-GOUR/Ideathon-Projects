package com.skillizee.lpgdock.ui;

import android.view.View;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import com.skillizee.lpgdock.engine.Engine;
import com.skillizee.lpgdock.sim.App;
import com.skillizee.lpgdock.telemetry.TelemetryProvider;

/** All values arrive through a TelemetryProvider; the hardware provider shows "—" until a dock is paired. */
public final class TelemetryScreen extends Screen {
    final TelemetryProvider sim = new TelemetryProvider.Simulation(App.main), hw = new TelemetryProvider.FutureHardware();
    TelemetryProvider current = sim;
    TextView sourceInfo, chip, segSim, segHw;
    Parts.Telemetry tele;
    Widgets.GasChart chart;
    LinearLayout simBox, hwBox, table;

    public TelemetryScreen(MainActivity a) {
        super(a);
    }

    @Override
    protected View build() {
        ScrollView sv = new ScrollView(a);
        LinearLayout c = Ui.col();
        c.setPadding(Ui.dp(16), Ui.dp(12), Ui.dp(16), Ui.dp(24));
        sv.addView(c);
        c.addView(Ui.text("Telemetry", 22, Ui.INK, true));
        Ui.add(c, Ui.text("Every value comes through a TelemetryProvider — the screen does not know whether it is simulated or real.", 13, Ui.INK_MUTED, false), 4);
        LinearLayout seg = Ui.row();
        segSim = Ui.button("Simulation provider", "secondary", v -> current = sim);
        segHw = Ui.button("Hardware (future)", "secondary", v -> current = hw);
        seg.addView(segSim, Ui.weight(1));
        seg.addView(segHw, Ui.weight(1));
        Ui.add(c, seg, 10);
        chip = Ui.chip("CONNECTED", "ok");
        Ui.add(c, chip, 8);
        sourceInfo = Ui.text("", 12.5f, Ui.INK_MUTED, false);
        Ui.add(c, sourceInfo, 4);
        simBox = Ui.col();
        tele = new Parts.Telemetry(false, a.wide() ? 3 : 1);
        simBox.addView(tele.grid);
        LinearLayout ch = Ui.card();
        ch.addView(Ui.kicker("Gas concentration · simulated · dock thresholds"));
        chart = new Widgets.GasChart(a, App.config.thGas[1]);
        Ui.add(ch, chart, 8);
        Ui.add(ch, Ui.button("Run leak demo", "secondary", v -> App.main.restart("with", "scripted", true)), 8);
        Ui.add(simBox, ch, 12);
        LinearLayout tb = Ui.card();
        tb.addView(Ui.kicker("Data table · last 10 samples"));
        table = Ui.col();
        Ui.add(tb, table, 6);
        Ui.add(simBox, tb, 12);
        Ui.add(c, simBox, 12);
        hwBox = Ui.card();
        hwBox.addView(Ui.text("No dock hardware paired", 18, Ui.INK, true));
        Ui.add(hwBox, Ui.text("Readings would appear here from a physical Smart Dock. Nothing is invented while no device is connected.", 13, Ui.INK_MUTED, false), 4);
        Ui.add(hwBox, Ui.mono("Gas —   Temperature —   Tilt —   Flow —", 14, Ui.INK_FAINT), 10);
        Ui.add(c, hwBox, 12);
        return sv;
    }

    @Override
    public void update() {
        boolean isSim = current == sim;
        segSim.setTextColor(isSim ? Ui.WHITE : Ui.INK);
        segSim.setBackground(Ui.round(isSim ? Ui.INK : Ui.WHITE, 12, isSim ? 0 : Ui.LINE));
        segHw.setTextColor(!isSim ? Ui.WHITE : Ui.INK);
        segHw.setBackground(Ui.round(!isSim ? Ui.INK : Ui.WHITE, 12, !isSim ? 0 : Ui.LINE));
        Ui.setChip(chip, current.connected() ? "CONNECTED" : "NOT CONNECTED", current.connected() ? "ok" : "neutral");
        sourceInfo.setText(current.label() + " — " + current.detail());
        simBox.setVisibility(isSim ? View.VISIBLE : View.GONE);
        hwBox.setVisibility(isSim ? View.GONE : View.VISIBLE);
        if (!isSim) return;
        current.read();
        tele.update(App.main);
        chart.set(App.main.state, null);
        table.removeAllViews();
        table.addView(Ui.mono("t      gas    temp   tilt   flow", 11, Ui.INK_MUTED));
        java.util.List<Engine.Sample> h = App.main.state.history;
        for (int i = h.size() - 1; i >= Math.max(0, h.size() - 10); i--) {
            Engine.Sample s = h.get(i);
            table.addView(Ui.mono(String.format(java.util.Locale.US, "%s  %.3f  %5.2f  %5.2f  %.2f", Engine.clock(s.t), s.gas, s.temp, s.tilt, s.flow), 11.5f, Ui.INK));
        }
    }
}
