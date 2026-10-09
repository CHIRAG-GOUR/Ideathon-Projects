package com.skillizee.shevolution;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Safe Trip and Safety Timer on the phone: the "Are you safe?" reminder at the due time and, if the user
 * turned on automatic alerts and doesn't answer within the grace period, one text to the chosen contacts.
 * Works offline; the server only backs this up if the phone goes silent.
 */
final class Trips {
    static final String DUE = "com.skillizee.shevolution.TRIP_DUE", ESCALATE = "com.skillizee.shevolution.TRIP_ESCALATE", SAFE = "com.skillizee.shevolution.TRIP_SAFE";

    static void start(Context c, JSONObject t) throws JSONException {
        t.put("status", "active");
        new Store(c).put("trip", t);
        schedule(c, t);
        if ("trip".equals(t.optString("kind")) && t.optJSONObject("destination") != null
                && c.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            Intent i = new Intent(c, SosService.class).setAction(SosService.ACTION_TRIP);
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i);
            else c.startService(i);
        }
    }

    static void schedule(Context c, JSONObject t) {
        long due = Store.parseIso(t.optString("dueAt"));
        alarm(c, DUE, due);
        if (t.optBoolean("autoEscalate")) alarm(c, ESCALATE, due + t.optInt("graceMin", 5) * 60_000L);
        else cancel(c, ESCALATE);
    }

    static void extend(Context c, String dueAt) throws JSONException {
        Store s = new Store(c);
        JSONObject t = s.get("trip");
        if (t == null) return;
        t.put("dueAt", dueAt);
        s.put("trip", t);
        c.getSystemService(NotificationManager.class).cancel(Notifs.ID_TRIP);
        schedule(c, t);
    }

    static void end(Context c, String status) {
        Store s = new Store(c);
        s.put("trip", null);
        cancel(c, DUE);
        cancel(c, ESCALATE);
        c.getSystemService(NotificationManager.class).cancel(Notifs.ID_TRIP);
        try {
            c.startService(new Intent(c, SosService.class).setAction(SosService.ACTION_STOP_TRIP));
        } catch (RuntimeException ignored) {
        }
    }

    private static PendingIntent pi(Context c, String action) {
        return PendingIntent.getBroadcast(c, action.hashCode(), new Intent(action).setClass(c, AlarmReceiver.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void alarm(Context c, String action, long at) {
        c.getSystemService(AlarmManager.class).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi(c, action));
    }

    private static void cancel(Context c, String action) {
        c.getSystemService(AlarmManager.class).cancel(pi(c, action));
    }

    static void notifyDue(Context c, JSONObject t) {
        Intent open = new Intent().putExtra("screen", "trip");
        Notification n = Notifs.builder(c, Notifs.SAFETY)
                .setContentTitle("Are you safe?")
                .setContentText(t.optBoolean("autoEscalate") ? "Check in now — otherwise your contacts get a text in " + t.optInt("graceMin", 5) + " min." : "Your " + t.optString("label") + " check-in time has passed.")
                .setContentIntent(Notifs.openApp(c, 20, open))
                .addAction(new Notification.Action.Builder(null, "I'm safe", PendingIntent.getBroadcast(c, 21, new Intent(SAFE).setClass(c, AlarmReceiver.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)).build())
                .setCategory(Notification.CATEGORY_REMINDER)
                .setPriority(Notification.PRIORITY_MAX)
                .setAutoCancel(true)
                .build();
        c.getSystemService(NotificationManager.class).notify(Notifs.ID_TRIP, n);
    }

    static void notifyArrived(Context c, JSONObject t) {
        Notification n = Notifs.builder(c, Notifs.SAFETY)
                .setContentTitle("You made it?")
                .setContentText("You're near " + (t.optJSONObject("destination") != null ? t.optJSONObject("destination").optString("name") : "your destination") + ". Tap to confirm you arrived safely.")
                .setContentIntent(Notifs.openApp(c, 22, new Intent().putExtra("screen", "trip")))
                .addAction(new Notification.Action.Builder(null, "I arrived safely", PendingIntent.getBroadcast(c, 23, new Intent(SAFE).setClass(c, AlarmReceiver.class).putExtra("arrived", true), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)).build())
                .setAutoCancel(true)
                .build();
        c.getSystemService(NotificationManager.class).notify(Notifs.ID_TRIP, n);
    }

    /** Grace period over with no answer: text the chosen contacts once (from this phone) and tell the server. */
    static void escalate(Context c) {
        Store s = new Store(c);
        JSONObject t = s.get("trip");
        if (t == null || !t.optBoolean("autoEscalate") || t.optBoolean("escalated")) return;
        try {
            t.put("escalated", true);
        } catch (JSONException ignored) {
        }
        s.put("trip", t);
        JSONObject cfg = s.config();
        JSONArray ids = t.optJSONArray("contactIds");
        JSONArray contacts = cfg.optJSONArray("contacts");
        JSONObject loc = t.optJSONObject("lastLocation");
        if (loc == null) loc = lastKnown(c); // Safety Timer: no tracking, so the phone's last known position, labelled as such
        int sent = 0;
        if (Sms.canSendDirect(c)) {
            for (int i = 0; contacts != null && i < contacts.length(); i++) {
                JSONObject k = contacts.optJSONObject(i);
                if (ids == null || !ids.toString().contains("\"" + k.optString("id") + "\"") || k.isNull("phone")) continue;
                try {
                    JSONObject ex = new JSONObject().put("label", t.optString("label")).put("due", Sms.time(Store.parseIso(t.optString("dueAt")), cfg.optString("timeZone", "Asia/Kolkata")));
                    Sms.send(c, k.optString("phone"), Sms.fill(Sms.template(cfg, "trip", "SAFE TRIP OVERDUE\n{name} started \"{label}\" and has not checked in (due {due}).\n{locline}\n{coords}\nPlease call {name}.\n- Shevolution"), cfg, loc, null, ex), "trip", k.optString("id"));
                    sent++;
                } catch (Exception ignored) {
                }
            }
        }
        Outbox.add(c, "/trips/update", tripUpdate(t, "escalated"));
        Notification n = Notifs.builder(c, Notifs.SAFETY)
                .setContentTitle(sent > 0 ? "Your Safety Circle was alerted" : "You didn't check in")
                .setContentText(sent > 0 ? "Texted " + sent + " contact(s) with your last known location." : "Open Shevolution to check in or text your circle.")
                .setContentIntent(Notifs.openApp(c, 24, new Intent().putExtra("screen", "trip")))
                .setAutoCancel(true)
                .build();
        c.getSystemService(NotificationManager.class).notify(Notifs.ID_TRIP, n);
    }

    static JSONObject lastKnown(Context c) {
        if (c.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
                && c.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) return null;
        LocationManager lm = c.getSystemService(LocationManager.class);
        Location best = null;
        for (String p : lm.getAllProviders()) {
            try {
                Location x = lm.getLastKnownLocation(p);
                if (x != null && (best == null || x.getTime() > best.getTime())) best = x;
            } catch (SecurityException ignored) {
            }
        }
        return best == null ? null : Store.fix(best, true);
    }

    static JSONObject tripUpdate(JSONObject t, String action) {
        try {
            return new JSONObject().put("tripId", t.optString("tripId")).put("action", action);
        } catch (JSONException e) {
            return new JSONObject();
        }
    }
}
