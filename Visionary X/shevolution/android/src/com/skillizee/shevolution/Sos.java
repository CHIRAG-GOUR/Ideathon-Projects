package com.skillizee.shevolution;

import android.content.Context;
import android.content.Intent;
import android.os.BatteryManager;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The SOS record and everything derived from it. One SOS id = one event (activation is idempotent).
 * All state lives in Store so an SOS survives the UI closing, the process dying or the phone being offline.
 */
final class Sos {
    static final Object LOCK = new Object();

    static boolean isActive(JSONObject sos) {
        return sos != null && "active".equals(sos.optString("status"));
    }

    /** Creates the SOS (or returns the running one) and starts the foreground service. Returns in milliseconds. */
    static JSONObject activate(Context c) throws JSONException {
        Store s = new Store(c);
        synchronized (LOCK) {
            JSONObject sos = s.get("sos");
            if (isActive(sos)) {
                sos.put("alreadyActive", true);
                return sos;
            }
            JSONObject cfg = s.config();
            JSONArray in = cfg.optJSONArray("contacts");
            JSONArray contacts = new JSONArray();
            boolean anyLive = false;
            for (int i = 0; in != null && i < in.length(); i++) {
                JSONObject x = in.getJSONObject(i);
                boolean sms = x.optBoolean("sms") && !x.isNull("phone") && x.optString("phone").length() > 4;
                JSONObject k = new JSONObject();
                k.put("id", x.optString("id"));
                k.put("name", x.optString("name"));
                k.put("phone", x.isNull("phone") ? JSONObject.NULL : x.optString("phone"));
                k.put("email", x.optString("email", ""));
                k.put("priority", x.optInt("priority", 0));
                k.put("sms", sms);
                k.put("smsStatus", sms ? "pending" : "skipped");
                k.put("via", JSONObject.NULL);
                k.put("smsAt", JSONObject.NULL);
                k.put("attempts", 0);
                String token = x.optString("token", "");
                if (token.isEmpty()) token = Store.randomId(18);
                k.put("token", token);
                anyLive = true;
                contacts.put(k);
            }
            boolean device = s.get("device") != null;
            sos = new JSONObject();
            String sosId = Store.randomId(16);
            sos.put("sosId", sosId);
            sos.put("publicToken", Store.randomId(18));
            sos.put("startedAt", Store.iso(System.currentTimeMillis()));
            sos.put("status", "active");
            sos.put("endedAt", JSONObject.NULL);
            sos.put("contacts", contacts);
            sos.put("lastLocation", JSONObject.NULL);
            sos.put("locationFailed", false);
            sos.put("live", !device ? "off" : anyLive ? "pending" : "off");
            sos.put("liveDetail", !device ? "Sign in to share live location" : anyLive ? "Starting…" : "No verified live-location contacts");
            sos.put("cloud", device ? "pending" : "off");
            sos.put("responders", new JSONArray());
            sos.put("smsDispatched", false);
            sos.put("escalated", false);
            s.put("sos", sos);
            s.putArray("sosQueue", new JSONArray());
        }
        Intent i = new Intent(c, SosService.class).setAction(SosService.ACTION_SOS);
        if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i);
        else c.startService(i);
        return new Store(c).get("sos");
    }

    /** How a contact's SMS looks on the SOS screen. Only carrier/provider results count as sent. */
    static String[] contactUi(JSONObject k) {
        String st = k.optString("smsStatus");
        String via = k.optString("via");
        if ("submitted".equals(st)) return new String[]{"ok", "provider".equals(via) ? "Alerted · server SMS" : "Alerted · SMS sent"};
        if ("delivered".equals(st)) return new String[]{"ok", "Alerted · SMS delivered"};
        if ("failed".equals(st)) return new String[]{"failed", "SMS failed" + (k.has("error") ? " · " + k.optString("error") : "")};
        if ("not_permitted".equals(st)) return new String[]{"queued", "Tap Send in Messages"};
        if ("queued".equals(st)) return new String[]{"queued", "Waiting for signal"};
        if ("skipped".equals(st)) return new String[]{"off", "No SMS channel"};
        return new String[]{"pending", "Sending…"};
    }

    static void emitContact(JSONObject k) {
        String[] ui = contactUi(k);
        Events.emit("sos_contact", "id", k.optString("id"), "state", ui[0], "detail", ui[1]);
    }

    /** Updates one contact's SMS result (from the carrier callback or the server) and tells the UI. */
    static void setSms(Context c, String contactId, String status, String via, String error) {
        Store s = new Store(c);
        synchronized (LOCK) {
            JSONObject sos = s.get("sos");
            if (sos == null) return;
            JSONArray ks = sos.optJSONArray("contacts");
            for (int i = 0; ks != null && i < ks.length(); i++) {
                JSONObject k = ks.optJSONObject(i);
                if (!contactId.equals(k.optString("id"))) continue;
                // Never downgrade a delivered/sent result to an older pending one.
                String prev = k.optString("smsStatus");
                if ("delivered".equals(prev) && !"delivered".equals(status)) return;
                try {
                    k.put("smsStatus", status);
                    if (via != null) k.put("via", via);
                    if ("submitted".equals(status) || "delivered".equals(status)) k.put("smsAt", Store.iso(System.currentTimeMillis()));
                    if (error != null) k.put("error", error);
                    else k.remove("error");
                } catch (JSONException ignored) {
                }
                s.put("sos", sos);
                emitContact(k);
                return;
            }
        }
    }

    static int battery(Context c) {
        BatteryManager b = c.getSystemService(BatteryManager.class);
        return b == null ? -1 : b.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
    }

    /**
     * Sends the whole SOS state to the server (idempotent; retried until acknowledged). Blocking.
     * Returns true when the server has everything, including the end of the SOS.
     */
    static boolean sync(Context c) {
        Store s = new Store(c);
        JSONObject sos;
        JSONArray queue;
        synchronized (LOCK) {
            sos = s.get("sos");
            queue = s.getArray("sosQueue");
        }
        if (sos == null) return true;
        try {
            if (s.get("device") == null) {
                update(s, "cloud", "off", null, null);
                Events.emit("sos_cloud", "state", "off");
                return !isActive(sos); // nothing to deliver without an account
            }
            int n = Math.min(queue.length(), 200);
            JSONArray locs = new JSONArray();
            for (int i = 0; i < n; i++) locs.put(queue.get(i));
            JSONArray tokens = new JSONArray(), dev = new JSONArray();
            JSONArray ks = sos.optJSONArray("contacts");
            for (int i = 0; ks != null && i < ks.length(); i++) {
                JSONObject k = ks.getJSONObject(i);
                if (k.has("token")) tokens.put(new JSONObject().put("contactId", k.optString("id")).put("tokenHash", Store.sha256(k.optString("token"))));
                if (k.optBoolean("sms") && !"provider".equals(k.optString("via"))) {
                    String st = k.optString("smsStatus");
                    dev.put(new JSONObject().put("contactId", k.optString("id")).put("status", st)
                            .put("at", k.isNull("smsAt") ? JSONObject.NULL : k.optString("smsAt"))
                            .put("via", "not_permitted".equals(st) ? "composer" : "device"));
                }
            }
            JSONObject cfg = s.config();
            int bat = battery(c);
            JSONObject payload = new JSONObject()
                    .put("sosId", sos.optString("sosId")).put("startedAt", sos.optString("startedAt"))
                    .put("status", sos.optString("status")).put("endedAt", sos.isNull("endedAt") ? JSONObject.NULL : sos.optString("endedAt"))
                    .put("locations", locs).put("shareTokens", tokens).put("deviceSms", dev)
                    .put("battery", bat < 0 ? JSONObject.NULL : bat).put("network", Net.state(c))
                    .put("region", cfg.optString("region", "IN").length() == 2 ? cfg.optString("region", "IN") : "IN");
            Net.Result r = Net.post(s, "/sos/sync", payload);
            if (r.code == -1) {
                update(s, "cloud", "queued", null, null);
                Events.emit("sos_cloud", "state", "queued");
                if (!"off".equals(sos.optString("live"))) {
                    update(s, "live", "queued", "liveDetail", "Waiting for network");
                    Events.emit("sos_live", "state", "queued", "detail", "Waiting for network");
                }
                SyncJob.schedule(c);
                return false;
            }
            if (!r.ok()) {
                String why = r.code == 401 ? "Signed out on this phone" : "Server error " + r.code;
                update(s, "cloud", "failed", null, null);
                Events.emit("sos_cloud", "state", "failed");
                if (r.code != 401) SyncJob.schedule(c);
                return r.code == 400 || r.code == 401 || r.code == 403; // permanent: stop retrying
            }
            applyServer(c, s, r.body, n);
            return !isActive(s.get("sos"));
        } catch (JSONException e) {
            return false;
        }
    }

    private static void applyServer(Context c, Store s, JSONObject body, int sent) throws JSONException {
        synchronized (LOCK) {
            JSONArray q = s.getArray("sosQueue");
            JSONArray rest = new JSONArray();
            for (int i = sent; i < q.length(); i++) rest.put(q.get(i));
            s.putArray("sosQueue", rest);
            JSONObject sos = s.get("sos");
            if (sos == null) return;
            JSONObject alerts = body == null ? null : body.optJSONObject("alerts");
            JSONArray ks = sos.optJSONArray("contacts");
            int shared = 0, unverified = 0;
            for (int i = 0; ks != null && i < ks.length(); i++) {
                JSONObject k = ks.getJSONObject(i);
                JSONObject a = alerts == null ? null : alerts.optJSONObject(k.optString("id"));
                if (a == null) continue;
                if ("shared".equals(a.optString("live"))) shared++;
                if ("not_verified".equals(a.optString("live"))) unverified++;
                JSONObject sms = a.optJSONObject("sms");
                if (sms != null && "provider".equals(sms.optString("via"))) {
                    String st = sms.optString("status");
                    String mine = k.optString("smsStatus");
                    boolean deviceOk = "submitted".equals(mine) || "delivered".equals(mine);
                    if (!deviceOk && ("submitted".equals(st) || "delivered".equals(st) || "failed".equals(st))) {
                        k.put("smsStatus", st).put("via", "provider");
                        emitContact(k);
                    }
                }
            }
            String live = shared > 0 ? "ok" : "off";
            String detail = shared > 0 ? "Sharing with " + shared : unverified > 0 ? "Contacts not verified yet" : "No live-location contacts";
            sos.put("live", live).put("liveDetail", detail).put("cloud", "ok");
            JSONArray responders = body == null ? null : body.optJSONArray("responders");
            if (responders != null) sos.put("responders", responders);
            s.put("sos", sos);
            Events.emit("sos_live", "state", live, "detail", detail);
            Events.emit("sos_cloud", "state", "ok");
            if (responders != null && responders.length() > 0) Events.emit("sos_responders", "names", responders);
        }
    }

    private static void update(Store s, String k1, String v1, String k2, String v2) throws JSONException {
        synchronized (LOCK) {
            JSONObject sos = s.get("sos");
            if (sos == null) return;
            sos.put(k1, v1);
            if (k2 != null) sos.put(k2, v2);
            s.put("sos", sos);
        }
    }

    /** Snapshot for the UI (sosState). */
    static JSONObject snapshot(Context c) throws JSONException {
        JSONObject sos = new Store(c).get("sos");
        JSONObject o = new JSONObject().put("ok", true);
        if (!isActive(sos)) return o.put("active", false);
        JSONArray out = new JSONArray();
        JSONArray ks = sos.optJSONArray("contacts");
        for (int i = 0; ks != null && i < ks.length(); i++) {
            JSONObject k = ks.getJSONObject(i);
            String[] ui = contactUi(k);
            out.put(new JSONObject().put("id", k.optString("id")).put("name", k.optString("name")).put("state", ui[0]).put("detail", ui[1]));
        }
        return o.put("active", true).put("sosId", sos.optString("sosId")).put("startedAt", sos.optString("startedAt"))
                .put("location", sos.opt("lastLocation")).put("locationFailed", sos.optBoolean("locationFailed"))
                .put("contacts", out).put("live", sos.optString("live")).put("liveDetail", sos.optString("liveDetail"))
                .put("cloud", sos.optString("cloud")).put("network", Net.state(c))
                .put("responders", sos.optJSONArray("responders") == null ? new JSONArray() : sos.optJSONArray("responders"))
                .put("soundOn", SosService.sirenPlaying);
    }
}
