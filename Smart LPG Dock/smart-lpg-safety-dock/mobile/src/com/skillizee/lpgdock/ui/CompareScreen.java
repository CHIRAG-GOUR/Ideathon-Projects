package com.skillizee.lpgdock.ui;

import android.view.View;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import com.skillizee.lpgdock.engine.Engine;
import com.skillizee.lpgdock.sim.App;
import com.skillizee.lpgdock.sim.SimController;

/** Without vs. with the dock: one GL view rendering both kitchens, two engines on one clock. */
public final class CompareScreen extends Screen {
    KitchenPanel kitchen;
    Parts.Transport transport;
    TextView clock;
    final TextView[] head = new TextView[2], vals = new TextView[2];
    final Parts.Scenario[] sc = new Parts.Scenario[2];
    LinearLayout table;
    Widgets.GasChart chart;
    static final String[][] ROWS = {
        {"Cooking begins", "cooking_started", "cooking_started"},
        {"Leak introduced", "leak_introduced", "leak_introduced"},
        {"Gas detected / rising", "gas_rising", "anomaly"},
        {"Warning threshold", "", "warning"},
        {"Safety response", "", "shutoff"},
        {"Supply isolated", "", "isolated"},
        {"Chef leaves", "chef_fleeing", "burner_off"},
        {"Outcome", "incident", "contained"},
    };

    public CompareScreen(MainActivity a) {
        super(a);
    }

    @Override
    protected View build() {
        LinearLayout outer = Ui.col();
        kitchen = new KitchenPanel(a, App.left, App.right);
        LinearLayout.LayoutParams kp = new LinearLayout.LayoutParams(-1, (int) (a.screenH() * (a.landscape() ? 0.55f : 0.42f)));
        kp.setMargins(Ui.dp(10), Ui.dp(8), Ui.dp(10), 0);
        outer.addView(kitchen.view, kp);
        TextView legend = Ui.mono(a.landscape() ? "LEFT: WITHOUT SMART DOCK      RIGHT: WITH SMART DOCK" : "TOP: WITHOUT SMART DOCK   ·   BOTTOM: WITH SMART DOCK", 10.5f, Ui.INK_MUTED);
        legend.setPadding(Ui.dp(16), Ui.dp(4), Ui.dp(16), 0);
        outer.addView(legend);
        ScrollView sv = new ScrollView(a);
        LinearLayout c = Ui.col();
        c.setPadding(Ui.dp(16), Ui.dp(8), Ui.dp(16), Ui.dp(24));
        sv.addView(c);
        outer.addView(sv, new LinearLayout.LayoutParams(-1, 0, 1f));
        clock = Ui.mono("SIM CLOCK 00:00", 16, Ui.INK);
        c.addView(clock);
        transport = new Parts.Transport(a, App.left, App.right);
        Ui.add(c, transport.view, 8);
        for (int i = 0; i < 2; i++) {
            LinearLayout card = Ui.card();
            head[i] = Ui.mono(i == 0 ? "WITHOUT SMART DOCK" : "WITH SMART DOCK", 13, Ui.WHITE);
            head[i].setBackground(Ui.round(i == 0 ? Ui.INK : Ui.LPG_DARK, 10, 0));
            head[i].setPadding(Ui.dp(10), Ui.dp(6), Ui.dp(10), Ui.dp(6));
            card.addView(head[i]);
            vals[i] = Ui.mono("", 13, Ui.INK);
            Ui.add(card, vals[i], 8);
            sc[i] = new Parts.Scenario();
            Ui.add(card, sc[i].view, 8);
            Ui.add(c, card, 12);
        }
        LinearLayout t = Ui.card();
        t.addView(Ui.kicker("Synchronised event timeline"));
        table = Ui.col();
        Ui.add(t, table, 8);
        Ui.add(c, t, 12);
        LinearLayout ch = Ui.card();
        ch.addView(Ui.kicker("Simulated gas · both runs"));
        LinearLayout lg = Ui.row();
        TextView l1 = Ui.text("━ Without dock", 12, Ui.INK_SOFT, true), l2 = Ui.text("━ With Smart Dock", 12, Ui.INK_SOFT, true);
        l1.setTextColor(Ui.BURNT);
        l2.setTextColor(Ui.LPG);
        lg.addView(l1);
        lg.addView(Ui.text("    ", 12, 0, false));
        lg.addView(l2);
        Ui.add(ch, lg, 6);
        chart = new Widgets.GasChart(a, App.config.thGas[1]);
        Ui.add(ch, chart, 6);
        Ui.add(c, ch, 12);
        return outer;
    }

    @Override
    public void update() {
        SimController[] s = {App.left, App.right};
        clock.setText("SIM CLOCK " + Engine.clock(Math.max(App.left.state.t, App.right.state.t)));
        for (int i = 0; i < 2; i++) {
            Engine.State st = s[i].state;
            String out = "ESCALATION".equals(st.outcome) ? "INCIDENT ESCALATION" : "CONTAINED".equals(st.outcome) ? "INCIDENT CONTAINED" : st.phase;
            head[i].setText((i == 0 ? "WITHOUT SMART DOCK" : "WITH SMART DOCK") + "  ·  " + out);
            vals[i].setText("Gas " + Engine.f2(st.gas) + " ppm   Temp " + Engine.f1(st.temp) + " °C   Tilt " + Engine.f1(st.tilt) + "°");
            sc[i].update(st);
        }
        table.removeAllViews();
        for (String[] r : ROWS) {
            LinearLayout row = Ui.row();
            row.addView(Ui.text(r[0], 13, Ui.INK, true), Ui.weight(1.4f));
            row.addView(cell(App.left.state, r[1], r[1].isEmpty() ? "no dock → none" : "not yet", r[0].equals("Outcome") ? Ui.DANGER : Ui.INK), Ui.weight(1));
            row.addView(cell(App.right.state, r[2], "not yet", r[0].equals("Outcome") ? Ui.OK : Ui.INK), Ui.weight(1));
            Ui.add(table, row, 6);
        }
        chart.set(App.left.state, App.right.state);
        transport.update();
        kitchen.update();
    }

    TextView cell(Engine.State s, String kind, String empty, int col) {
        Engine.Event e = kind.isEmpty() ? null : Engine.event(s, kind);
        return e == null ? Ui.mono(empty, 11, Ui.INK_FAINT) : Ui.mono(Engine.clock(e.t), 12.5f, col);
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
