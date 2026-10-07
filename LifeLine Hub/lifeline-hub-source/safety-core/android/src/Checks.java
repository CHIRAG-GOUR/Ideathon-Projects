package @PKG@;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Periodic safety checks on the phone (same timeline as safety-core/shared/src/checks.ts):
 * WAITING → DUE ("Are you safe?") → WARNING (asked again) → ESCALATED (the user's policy runs: text the chosen
 * contacts with the last known location, or start a full SOS). Works offline; the server is told via the outbox.
 * While checks run, the foreground service keeps the last known location current (visible notification).
 */
final class Checks {
    static final String DUE = Flavor.PKG + ".CHECK_DUE", WARN = Flavor.PKG + ".CHECK_WARN", ESC = Flavor.PKG + ".CHECK_ESC", OK = Flavor.PKG + ".CHECK_OK";

    static JSONObject plan(Context c) {
        return new Store(c).get("checkPlan");
    }

    static boolean active(Context c) {
        JSONObject p = plan(c);
        return p != null && p.optBoolean("active");
    }

    static String label(Context c) {
        JSONObject p = plan(c);
        return p == null ? "" : p.optString("label");
    }

    static String dueText(Context c) {
        JSONObject p = plan(c);
        if (p == null || p.isNull("nextDueAt")) return "";
        return Sms.time(Store.parseIso(p.optString("nextDueAt")), new Store(c).config().optString("timeZone", "Asia/Kolkata"));
    }

    static String summary(Context c) {
        JSONObject p = plan(c);
        return p == null || !p.optBoolean("active") ? "Off" : p.optString("label") + " · next check " + dueText(c);
    }

    static void start(Context c, JSONObject plan, JSONObject location) throws JSONException {
        plan.put("active", true);
        new Store(c).put("checkPlan", plan);
        schedule(c, plan);
        JSONObject input = new JSONObject().put("label", plan.optString("label")).put("intervalMin", plan.optInt("intervalMin")).put("graceMin", plan.optInt("graceMin"))
                .put("policy", plan.optString("policy", "notify")).put("contactIds", plan.optJSONArray("contactIds") == null ? new JSONArray() : plan.optJSONArray("contactIds"));
        Outbox.add(c, "/checks/start", new JSONObject().put("plan", input).put("location", location == null ? JSONObject.NULL : location));
        service(c, SosService.ACTION_CHECKS_ON);
        Events.emit("check_state", "state", "WAITING");
    }

    static void confirm(Context c, JSONObject location) {
        Store s = new Store(c);
        JSONObject p = s.get("checkPlan");
        if (p == null || !p.optBoolean("active")) return;
        long now = System.currentTimeMillis();
        try {
            p.put("nextDueAt", Store.iso(now + p.optInt("intervalMin", 30) * 60_000L)).put("lastConfirmedAt", Store.iso(now)).put("escalatedAt", JSONObject.NULL);
            s.put("checkPlan", p);
            if (location == null) {
                String lf = s.getString("lastFix");
                location = lf == null ? null : new JSONObject(lf);
            }
            Outbox.add(c, "/checks/confirm", new JSONObject().put("location", location == null ? JSONObject.NULL : location).put("at", Store.iso(now)));
        } catch (JSONException ignored) {
        }
        c.getSystemService(NotificationManager.class).cancel(Notifs.ID_CHECK);
        schedule(c, p);
        Events.emit("check_state", "state", "WAITING");
    }

    static void stop(Context c) {
        Store s = new Store(c);
        JSONObject p = s.get("checkPlan");
        if (p != null) {
            try {
                p.put("active", false).put("nextDueAt", JSONObject.NULL);
            } catch (JSONException ignored) {
            }
            s.put("checkPlan", p);
        }
        for (String a : new String[]{DUE, WARN, ESC}) c.getSystemService(AlarmManager.class).cancel(pi(c, a));
        c.getSystemService(NotificationManager.class).cancel(Notifs.ID_CHECK);
        Outbox.add(c, "/checks/stop", new JSONObject());
        service(c, SosService.ACTION_CHECKS_OFF);
        Events.emit("check_state", "state", "OFF");
    }

    static void schedule(Context c, JSONObject p) {
        if (p == null || !p.optBoolean("active") || p.isNull("nextDueAt")) return;
        long due = Store.parseIso(p.optString("nextDueAt"));
        long g = p.optInt("graceMin", 5) * 60_000L;
        AlarmManager am = c.getSystemService(AlarmManager.class);
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, due, pi(c, DUE));
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, due + g, pi(c, WARN));
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, due + 2 * g, pi(c, ESC));
    }

    private static PendingIntent pi(Context c, String action) {
        return PendingIntent.getBroadcast(c, action.hashCode(), new Intent(action).setClass(c, AlarmReceiver.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void service(Context c, String action) {
        try {
            Intent i = new Intent(c, SosService.class).setAction(action);
            if (Build.VERSION.SDK_INT >= 26 && SosService.ACTION_CHECKS_ON.equals(action)) c.startForegroundService(i);
            else c.startService(i);
        } catch (RuntimeException ignored) {
            // Started from the background without a foreground service: alarms still fire; prompts still show.
        }
    }

    /** Alarm fired: prompt, warn, or escalate — only if this cycle is still unanswered. */
    static void onAlarm(Context c, String action) {
        JSONObject p = plan(c);
        if (p == null || !p.optBoolean("active") || p.isNull("nextDueAt")) return;
        long due = Store.parseIso(p.optString("nextDueAt"));
        if (System.currentTimeMillis() < due - 30_000) return; // confirmed in the meantime: a newer cycle is scheduled
        if (DUE.equals(action)) prompt(c, false);
        else if (WARN.equals(action)) {
            prompt(c, true);
            report(c, "warning");
        } else if (ESC.equals(action)) escalate(c, p);
        Events.emit("check_state", "state", DUE.equals(action) ? "DUE" : WARN.equals(action) ? "WARNING" : "ESCALATED");
    }

    private static void prompt(Context c, boolean warning) {
        Notification.Builder b = Notifs.builder(c, Notifs.CHECK)
                .setContentTitle(warning ? "Second check: are you safe?" : "Are you safe?")
                .setContentText(warning ? "No answer yet. If you don't answer, your chosen contacts will be alerted." : "Tap \"I'm safe\" to confirm.")
                .setContentIntent(Notifs.openApp(c, 40, new Intent().putExtra("screen", "checks")))
                .addAction(new Notification.Action.Builder(null, "I'm safe", pi(c, OK)).build())
                .setCategory(Notification.CATEGORY_ALARM).setPriority(Notification.PRIORITY_MAX).setAutoCancel(true);
        Notification n = b.build();
        if (warning) n.flags |= Notification.FLAG_INSISTENT;
        c.getSystemService(NotificationManager.class).notify(Notifs.ID_CHECK, n);
    }

    private static void escalate(Context c, JSONObject p) {
        Store s = new Store(c);
        if (!p.isNull("escalatedAt")) return;
        try {
            p.put("escalatedAt", Store.iso(System.currentTimeMillis()));
            s.put("checkPlan", p);
        } catch (JSONException ignored) {
        }
        JSONObject loc = null;
        try {
            String lf = s.getString("lastFix");
            if (lf != null) loc = new JSONObject(lf).put("lastKnown", true);
        } catch (JSONException ignored) {
        }
        if ("sos".equals(p.optString("policy"))) {
            try {
                Sos.activate(c, "check");
                report(c, "sos");
            } catch (Exception e) {
                report(c, "escalated");
            }
            return;
        }
        JSONObject cfg = s.config();
        JSONArray ids = p.optJSONArray("contactIds");
        JSONArray contacts = cfg.optJSONArray("contacts");
        int sent = 0;
        if (Sms.canSendDirect(c)) {
            for (int i = 0; contacts != null && i < contacts.length(); i++) {
                JSONObject k = contacts.optJSONObject(i);
                if (ids == null || !ids.toString().contains("\"" + k.optString("id") + "\"") || k.isNull("phone") || !k.optBoolean("sms")) continue;
                try {
                    Sms.send(c, k.optString("phone"), Sms.fill(Sms.template(cfg, "check"), cfg, loc, null, Sms.extras(null, "label", p.optString("label"), "due", dueText(c))), "check", k.optString("id"));
                    sent++;
                } catch (Exception ignored) {
                }
            }
        }
        report(c, "escalated");
        Notification n = Notifs.builder(c, Notifs.CHECK)
                .setContentTitle(sent > 0 ? "Your contacts were alerted" : "Missed safety check")
                .setContentText(sent > 0 ? "Texted " + sent + " contact(s) with your last known location." : "Could not text automatically — open the app to alert your contacts.")
                .setContentIntent(Notifs.openApp(c, 41, new Intent().putExtra("screen", "checks")))
                .addAction(new Notification.Action.Builder(null, "I'm safe", pi(c, OK)).build())
                .setAutoCancel(true).build();
        c.getSystemService(NotificationManager.class).notify(Notifs.ID_CHECK, n);
    }

    private static void report(Context c, String type) {
        try {
            String lf = new Store(c).getString("lastFix");
            Outbox.add(c, "/checks/event", new JSONObject().put("type", type).put("at", Store.iso(System.currentTimeMillis())).put("location", lf == null ? JSONObject.NULL : new JSONObject(lf)));
        } catch (JSONException ignored) {
        }
    }
}
