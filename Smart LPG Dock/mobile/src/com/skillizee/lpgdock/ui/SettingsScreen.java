package com.skillizee.lpgdock.ui;

import android.text.InputType;
import android.view.View;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;
import com.skillizee.lpgdock.services.Cloud;
import com.skillizee.lpgdock.services.Prefs;
import com.skillizee.lpgdock.services.Sessions;
import com.skillizee.lpgdock.sim.App;

/** Sound, motion, 3D quality, optional account, local history, and the honesty statement. */
public final class SettingsScreen extends Screen {
    LinearLayout account;
    TextView qAuto, qHigh, qLow, stored;
    boolean busy;

    public SettingsScreen(MainActivity a) {
        super(a);
    }

    @Override
    protected View build() {
        ScrollView sv = new ScrollView(a);
        LinearLayout c = Ui.col();
        c.setPadding(Ui.dp(16), Ui.dp(12), Ui.dp(16), Ui.dp(28));
        sv.addView(c);
        c.addView(Ui.text("Settings", 22, Ui.INK, true));

        LinearLayout s = Ui.card();
        s.addView(Ui.kicker("Alerts"));
        Ui.add(s, toggle("Sound cues", "Alarm, isolation and all-clear tones. Every cue also appears on screen.", !Prefs.muted(a), on -> {
            Prefs.muted(a, !on);
            a.refreshMute();
        }), 8);
        Ui.add(s, toggle("Vibration", "Short pulses on warning, critical and the simulated incident.", Prefs.vibration(a), on -> Prefs.vibration(a, on)), 8);
        Ui.add(c, s, 12);

        LinearLayout m = Ui.card();
        m.addView(Ui.kicker("Motion & 3D"));
        Ui.add(m, toggle("Reduced motion", "No camera shake or flash; the simulation still runs and shows every state in text. Applies when a 3D view opens.", Prefs.reducedMotion(a), on -> Prefs.reducedMotion(a, on)), 8);
        Ui.add(m, Ui.text("3D quality", 15, Ui.INK, true), 12);
        LinearLayout q = Ui.row();
        qAuto = Ui.button("Auto", "secondary", v -> quality("auto"));
        qHigh = Ui.button("High", "secondary", v -> quality("high"));
        qLow = Ui.button("Battery saver", "secondary", v -> quality("low"));
        q.addView(qAuto, Ui.weight(1));
        LinearLayout.LayoutParams p1 = Ui.weight(1), p2 = Ui.weight(1.4f);
        p1.leftMargin = p2.leftMargin = Ui.dp(6);
        q.addView(qHigh, p1);
        q.addView(qLow, p2);
        Ui.add(m, q, 6);
        Ui.add(m, Ui.text("Auto uses battery saver on devices with little memory. Takes effect next time a 3D view opens.", 12, Ui.INK_MUTED, false), 6);
        quality(Prefs.quality(a));
        Ui.add(c, m, 12);

        LinearLayout acc = Ui.card();
        acc.addView(Ui.kicker("Account · optional"));
        account = Ui.col();
        Ui.add(acc, account, 6);
        renderAccount(null);
        Ui.add(c, acc, 12);

        LinearLayout h = Ui.card();
        h.addView(Ui.kicker("History"));
        Ui.add(h, toggle("Save finished runs", "Keeps a summary of each finished main simulation on this device (and in your account when signed in).", Prefs.autoSave(a), on -> Prefs.autoSave(a, on)), 8);
        stored = Ui.text("", 13, Ui.INK_MUTED, false);
        Ui.add(h, stored, 10);
        Ui.add(h, Ui.button("Delete history on this device", "secondary", v -> {
            Sessions.clear(a);
            update();
        }), 8);
        Ui.add(c, h, 12);

        LinearLayout ab = Ui.card();
        ab.addView(Ui.kicker("About"));
        Ui.add(ab, Ui.text("Smart LPG Safety Dock", 17, Ui.INK, true), 6);
        Ui.add(ab, Ui.mono("Smart. Safe. Secure.  ·  v" + version() + "  ·  " + App.config.cylinderId, 11.5f, Ui.INK_MUTED), 2);
        Ui.add(ab, Ui.text("CONCEPT / PROTOTYPE. Every reading, warning, shutoff and incident in this app is SIMULATED by an illustrative model. "
                + "It does not detect real gas, does not control a real valve, and makes no claim of certified safety performance. "
                + "If you smell gas: do not switch anything on or off, close the cylinder valve if it is safe to do so, open doors and windows, leave, and call your LPG distributor’s emergency number.", 13, Ui.INK_SOFT, false), 8);
        Ui.add(c, ab, 12);
        update();
        return sv;
    }

    String version() {
        try {
            return a.getPackageManager().getPackageInfo(a.getPackageName(), 0).versionName;
        } catch (Exception e) {
            return "?";
        }
    }

    interface On {
        void set(boolean on);
    }

    View toggle(String title, String desc, boolean value, On on) {
        LinearLayout r = Ui.row();
        LinearLayout t = Ui.col();
        t.addView(Ui.text(title, 15, Ui.INK, true));
        t.addView(Ui.text(desc, 12, Ui.INK_MUTED, false));
        r.addView(t, Ui.weight(1));
        Switch sw = new Switch(a);
        sw.setChecked(value);
        sw.setContentDescription(title);
        sw.setMinimumHeight(Ui.dp(48));
        sw.setOnCheckedChangeListener((b, v) -> on.set(v));
        LinearLayout.LayoutParams p = Ui.lp(-2, -2);
        p.leftMargin = Ui.dp(10);
        r.addView(sw, p);
        r.setOnClickListener(v -> sw.toggle());
        return r;
    }

    void quality(String q) {
        Prefs.quality(a, q);
        TextView[] b = {qAuto, qHigh, qLow};
        String[] k = {"auto", "high", "low"};
        for (int i = 0; i < 3; i++) {
            boolean on = k[i].equals(q);
            b[i].setTextColor(on ? Ui.WHITE : Ui.INK);
            b[i].setBackground(Ui.round(on ? Ui.LPG_DARK : Ui.WHITE, 12, on ? 0 : Ui.LINE));
            b[i].setSelected(on);
        }
    }

    void renderAccount(String message) {
        account.removeAllViews();
        if (!Cloud.configured(a)) {
            account.addView(Ui.text("Cloud sync is not configured in this build.", 14, Ui.INK, true));
            Ui.add(account, Ui.text("Everything works without an account — runs are kept on this device. "
                    + "To enable sign-in, build the app with FIREBASE_API_KEY and FIREBASE_PROJECT_ID set (see FIREBASE_SETUP.md).", 12.5f, Ui.INK_MUTED, false), 4);
            return;
        }
        String email = Cloud.email(a);
        if (email != null) {
            account.addView(Ui.text("Signed in as " + email, 14, Ui.INK, true));
            Ui.add(account, Ui.text("Finished runs are also saved to your account (Firestore: simulationSessions, simulationEvents).", 12.5f, Ui.INK_MUTED, false), 4);
            Ui.add(account, Ui.button("Sign out", "secondary", v -> {
                Cloud.signOut(a);
                renderAccount("Signed out. Runs are kept on this device only.");
            }), 10);
        } else {
            account.addView(Ui.text("Sign in to keep your simulation history in the cloud. Not required for anything else.", 12.5f, Ui.INK_MUTED, false));
            final EditText em = new EditText(a), pw = new EditText(a);
            em.setHint("Email");
            em.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
            em.setSingleLine(true);
            pw.setHint("Password (6+ characters)");
            pw.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
            pw.setSingleLine(true);
            Ui.add(account, em, 8);
            Ui.add(account, pw, 4);
            LinearLayout r = Ui.row();
            r.addView(Ui.button("Sign in", "primary", v -> auth(em.getText().toString().trim(), pw.getText().toString(), false)), Ui.weight(1));
            LinearLayout.LayoutParams p = Ui.weight(1);
            p.leftMargin = Ui.dp(8);
            r.addView(Ui.button("Create account", "secondary", v -> auth(em.getText().toString().trim(), pw.getText().toString(), true)), p);
            Ui.add(account, r, 8);
            Ui.add(account, Ui.text("Google sign-in is available in the web app.", 11.5f, Ui.INK_FAINT, false), 6);
        }
        if (message != null) {
            TextView t = Ui.text(message, 13, message.startsWith("✓") || message.startsWith("Signed out") ? Ui.OK : Ui.DANGER, true);
            t.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_ASSERTIVE);
            Ui.add(account, t, 8);
        }
    }

    void auth(String email, String pw, boolean create) {
        if (busy) return;
        if (email.isEmpty() || pw.isEmpty()) {
            renderAccount("Enter an email and a password.");
            return;
        }
        busy = true;
        TextView wait = Ui.text("Contacting Firebase…", 13, Ui.INK_MUTED, true);
        Ui.add(account, wait, 8);
        new Thread(() -> {
            String msg;
            try {
                Cloud.signIn(a, email, pw, create);
                msg = "✓ " + (create ? "Account created. " : "Signed in. ") + "New runs will sync.";
            } catch (Exception e) {
                msg = e.getMessage() == null ? "Sign-in failed. Check your connection." : e.getMessage();
            }
            final String m = msg;
            a.runOnUiThread(() -> {
                busy = false;
                renderAccount(m);
            });
        }).start();
    }

    @Override
    public void update() {
        if (stored == null) return;
        int n = Sessions.list(a).length();
        stored.setText(n == 0 ? "No runs saved on this device." : n + " run" + (n == 1 ? "" : "s") + " saved on this device.");
    }
}
