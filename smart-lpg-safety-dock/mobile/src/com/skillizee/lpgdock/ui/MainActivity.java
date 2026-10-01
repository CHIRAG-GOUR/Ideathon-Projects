package com.skillizee.lpgdock.ui;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.Context;
import android.content.res.Configuration;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import com.skillizee.lpgdock.engine.Engine;
import com.skillizee.lpgdock.services.Cloud;
import com.skillizee.lpgdock.services.Prefs;
import com.skillizee.lpgdock.services.Sessions;
import com.skillizee.lpgdock.services.Sound;
import com.skillizee.lpgdock.sim.App;
import com.skillizee.lpgdock.sim.SimController;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONObject;

/** Single activity: top bar, bottom navigation (phones) or a side rail (tablets), and eight screens. */
public final class MainActivity extends Activity implements SimController.Listener {
    public static final int DASH = 0, SIM = 1, COMPARE = 2, DOCK = 3, TELE = 4, EVENTS = 5, PRESENT = 6, SETTINGS = 7;
    static final String[] NAMES = {"Dashboard", "Simulation", "Compare", "Smart Dock", "Telemetry", "Events", "Presentation", "Settings"};
    static final String[] GLYPH = {"⌂", "▶", "⇆", "◎", "∿", "≡", "▣", "⚙"};
    static final int[] TABS = {DASH, SIM, COMPARE, DOCK};

    public Sound sound;
    final Screen[] screens = new Screen[8];
    int current = -1;
    FrameLayout content;
    View more;
    TextView status, mute;
    final TextView[] nav = new TextView[8];
    TextView moreTab;
    final Set<String> saved = new HashSet<>();

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Ui.ctx = this;
        App.init(this);
        sound = new Sound(this);
        for (SimController s : new SimController[] {App.main, App.left, App.right}) s.add(this);
        chrome();
        go(b == null ? DASH : b.getInt("screen", DASH));
    }

    @Override
    protected void onSaveInstanceState(Bundle o) {
        super.onSaveInstanceState(o);
        o.putInt("screen", current);
    }

    // ------------------------------------------------------------------ layout helpers used by the screens
    public boolean landscape() {
        return getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE;
    }

    public boolean wide() {
        return getResources().getConfiguration().screenWidthDp >= 720;
    }

    public int screenH() {
        return getResources().getDisplayMetrics().heightPixels;
    }

    public boolean lowQuality() {
        String q = Prefs.quality(this);
        if ("low".equals(q)) return true;
        if ("high".equals(q)) return false;
        ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        return am == null || am.isLowRamDevice() || am.getMemoryClass() < 160;
    }

    // ------------------------------------------------------------------ chrome
    void chrome() {
        boolean rail = wide();
        LinearLayout root = Ui.col();
        root.setBackgroundColor(Ui.CREAM);

        LinearLayout top = Ui.row();
        top.setBackgroundColor(Ui.WHITE);
        top.setPadding(Ui.dp(12), Ui.dp(6), Ui.dp(6), Ui.dp(6));
        top.setElevation(Ui.dp(2));
        ImageView logo = new ImageView(this);
        logo.setImageResource(getApplicationInfo().icon);
        logo.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        top.addView(logo, Ui.lp(Ui.dp(34), Ui.dp(34)));
        LinearLayout name = Ui.col();
        name.setPadding(Ui.dp(8), 0, 0, 0);
        TextView t1 = Ui.text("Smart LPG Dock", 16, Ui.INK, true);
        t1.setSingleLine(true);
        name.addView(t1);
        name.addView(Ui.mono("SIMULATION · PROTOTYPE", 9, Ui.INK_FAINT));
        top.addView(name, Ui.weight(1));
        status = Ui.chip("NORMAL", "ok");
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        top.addView(status, Ui.lp(-2, -2));
        mute = Ui.text("", 20, Ui.INK_SOFT, false);
        mute.setGravity(Gravity.CENTER);
        mute.setMinWidth(Ui.dp(48));
        mute.setMinHeight(Ui.dp(48));
        mute.setOnClickListener(v -> {
            Prefs.muted(this, !Prefs.muted(this));
            refreshMute();
        });
        top.addView(mute);
        refreshMute();
        root.addView(top, Ui.fill());

        content = new FrameLayout(this);
        if (rail) {
            LinearLayout mid = Ui.row();
            mid.setGravity(Gravity.TOP);
            ScrollView rs = new ScrollView(this);
            LinearLayout side = Ui.col();
            side.setBackgroundColor(Ui.WHITE);
            side.setPadding(Ui.dp(8), Ui.dp(10), Ui.dp(8), Ui.dp(10));
            for (int i = 0; i < 8; i++) {
                final int k = i;
                TextView n = Ui.text(GLYPH[i] + "   " + NAMES[i], 14.5f, Ui.INK_SOFT, true);
                n.setGravity(Gravity.CENTER_VERTICAL);
                n.setMinHeight(Ui.dp(48));
                n.setPadding(Ui.dp(14), 0, Ui.dp(14), 0);
                n.setOnClickListener(v -> go(k));
                nav[i] = n;
                Ui.add(side, n, i == 0 ? 0 : 4);
            }
            rs.addView(side);
            rs.setBackgroundColor(Ui.WHITE);
            mid.addView(rs, new LinearLayout.LayoutParams(Ui.dp(220), -1));
            mid.addView(content, new LinearLayout.LayoutParams(0, -1, 1f));
            root.addView(mid, new LinearLayout.LayoutParams(-1, 0, 1f));
        } else {
            root.addView(content, new LinearLayout.LayoutParams(-1, 0, 1f));
            LinearLayout bar = Ui.row();
            bar.setBackgroundColor(Ui.WHITE);
            bar.setElevation(Ui.dp(8));
            String[] label = {"Home", "Simulate", "Compare", "Dock"};
            for (int i = 0; i < TABS.length; i++) {
                final int k = TABS[i];
                nav[k] = tab(GLYPH[k], label[i], v -> go(k));
                bar.addView(nav[k], Ui.weight(1));
            }
            moreTab = tab("☰", "More", v -> toggleMore());
            bar.addView(moreTab, Ui.weight(1));
            root.addView(bar, Ui.fill());
        }
        setContentView(root);
        more = null;
    }

    TextView tab(String glyph, String label, View.OnClickListener on) {
        TextView t = Ui.text(glyph + "\n" + label, 11.5f, Ui.INK_MUTED, true);
        t.setGravity(Gravity.CENTER);
        t.setMinHeight(Ui.dp(56));
        t.setLineSpacing(0, 1.05f);
        t.setOnClickListener(on);
        t.setContentDescription(label);
        return t;
    }

    void toggleMore() {
        if (more != null) {
            closeMore();
            return;
        }
        FrameLayout scrim = new FrameLayout(this);
        scrim.setBackgroundColor(0x66101820);
        scrim.setOnClickListener(v -> closeMore());
        LinearLayout sheet = Ui.col();
        sheet.setBackground(Ui.round(Ui.WHITE, 20, 0));
        sheet.setPadding(Ui.dp(12), Ui.dp(14), Ui.dp(12), Ui.dp(14));
        sheet.setClickable(true);
        sheet.addView(Ui.kicker("More"));
        for (int k : new int[] {TELE, EVENTS, PRESENT, SETTINGS}) {
            TextView n = Ui.text(GLYPH[k] + "   " + NAMES[k], 16, k == current ? Ui.LPG_DARK : Ui.INK, true);
            n.setGravity(Gravity.CENTER_VERTICAL);
            n.setMinHeight(Ui.dp(52));
            n.setPadding(Ui.dp(10), 0, Ui.dp(10), 0);
            if (k == current) n.setBackground(Ui.round(Ui.LPG_50, 12, 0));
            n.setOnClickListener(v -> go(k));
            Ui.add(sheet, n, 4);
        }
        FrameLayout.LayoutParams p = new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM);
        p.setMargins(Ui.dp(10), 0, Ui.dp(10), Ui.dp(10));
        scrim.addView(sheet, p);
        content.addView(scrim, new FrameLayout.LayoutParams(-1, -1));
        more = scrim;
        moreTab.setTextColor(Ui.LPG_DARK);
    }

    void closeMore() {
        if (more != null) content.removeView(more);
        more = null;
        if (moreTab != null) moreTab.setTextColor(current >= TELE ? Ui.LPG_DARK : Ui.INK_MUTED);
    }

    void refreshMute() {
        boolean m = Prefs.muted(this);
        mute.setText(m ? "🔇" : "🔊");
        mute.setContentDescription(m ? "Sound off. Tap to turn sound on" : "Sound on. Tap to mute");
    }

    Screen screen(int i) {
        if (screens[i] == null) {
            switch (i) {
                case SIM: screens[i] = new SimulationScreen(this); break;
                case COMPARE: screens[i] = new CompareScreen(this); break;
                case DOCK: screens[i] = new DockScreen(this); break;
                case TELE: screens[i] = new TelemetryScreen(this); break;
                case EVENTS: screens[i] = new EventsScreen(this); break;
                case PRESENT: screens[i] = new PresentationScreen(this); break;
                case SETTINGS: screens[i] = new SettingsScreen(this); break;
                default: screens[i] = new DashboardScreen(this);
            }
        }
        return screens[i];
    }

    /** Navigate. Screens are built once and kept; only the visible one updates or renders 3D. */
    public void go(int i) {
        closeMore();
        if (i == current && content.getChildCount() > 0) return;
        if (current >= 0 && screens[current] != null) screens[current].hide();
        current = i;
        content.removeAllViews();
        View v = screen(i).view();
        if (v.getParent() != null) ((ViewGroup) v.getParent()).removeView(v);
        content.addView(v, new FrameLayout.LayoutParams(-1, -1));
        screens[i].show();
        screens[i].update();
        for (int k = 0; k < 8; k++) {
            if (nav[k] == null) continue;
            boolean on = k == i;
            nav[k].setTextColor(on ? Ui.LPG_DARK : Ui.INK_MUTED);
            nav[k].setBackground(on && wide() ? Ui.round(Ui.LPG_50, 12, 0) : null);
            nav[k].setSelected(on);
        }
        if (moreTab != null) moreTab.setTextColor(i >= TELE ? Ui.LPG_DARK : Ui.INK_MUTED);
        setTitle(NAMES[i] + " — Smart LPG Dock");
        refreshStatus();
    }

    void refreshStatus() {
        Engine.State s = (current == COMPARE ? App.right : App.main).state;
        String st = "NORMAL".equals(s.safety) || "SAFE".equals(s.safety) ? s.safety : Ui.safetyText(s.safety);
        Ui.setChip(status, st, Ui.safetyTone(s.safety));
        status.setContentDescription("Simulated safety state: " + st);
    }

    // ------------------------------------------------------------------ simulation events
    @Override
    public void onChange(SimController c) {
        sound.watch(c);
        if (c == App.main) persist(c);
        if (current >= 0 && screens[current] != null) screens[current].update();
        refreshStatus();
    }

    /** Saves each finished main run once: on the device always, to Firestore too when signed in. */
    void persist(SimController c) {
        if (!c.isFinished() || saved.contains(c.sessionId) || !Prefs.autoSave(this)) return;
        saved.add(c.sessionId);
        final JSONObject o;
        try {
            o = Sessions.summarise(c);
        } catch (Exception e) {
            return;
        }
        final boolean cloud = Cloud.email(this) != null;
        if (cloud) try { o.put("cloud", "saving"); } catch (Exception ignored) {}
        Sessions.add(this, o);
        if (!cloud) return;
        final Context app = getApplicationContext();
        new Thread(() -> {
            try {
                Cloud.saveSession(app, o);
                o.put("cloud", "saved");
            } catch (Exception e) {
                try {
                    o.put("cloud", "failed");
                    o.put("cloudError", e.getMessage() == null ? "network error" : e.getMessage());
                } catch (Exception ignored) {
                }
            }
            Sessions.add(app, o);
            runOnUiThread(() -> {
                if (current >= 0 && screens[current] != null) screens[current].update();
            });
        }).start();
    }

    // ------------------------------------------------------------------ lifecycle
    @Override
    protected void onResume() {
        super.onResume();
        App.clock.resume();
        if (current >= 0 && screens[current] != null) screens[current].show();
    }

    @Override
    protected void onPause() {
        // Simulations and 3D pause while the app is not visible.
        App.clock.pause();
        if (current >= 0 && screens[current] != null) screens[current].hide();
        super.onPause();
    }

    @Override
    public void onConfigurationChanged(Configuration c) {
        super.onConfigurationChanged(c);
        // Rotation keeps the simulations running; only the layouts are rebuilt for the new shape.
        int keep = current;
        if (keep >= 0 && screens[keep] != null) screens[keep].hide();
        for (int i = 0; i < screens.length; i++) screens[i] = null;
        current = -1;
        for (int i = 0; i < 8; i++) nav[i] = null;
        moreTab = null;
        chrome();
        go(keep < 0 ? DASH : keep);
    }

    @Override
    public void onBackPressed() {
        if (more != null) closeMore();
        else if (current != DASH) go(DASH);
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        for (SimController s : new SimController[] {App.main, App.left, App.right}) s.remove(this);
        super.onDestroy();
    }
}
