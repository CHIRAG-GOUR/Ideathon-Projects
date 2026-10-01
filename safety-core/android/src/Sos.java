package @PKG@;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The SOS record and everything derived from it. One SOS id = one event (activation is idempotent).
 * All state lives in Store, so an SOS survives the UI closing, the process dying or the phone being offline.
 */
final class Sos {
    static final Object LOCK = new Object();

    static boolean isActive(JSONObject sos) {
        return sos != null && "active".equals(sos.optString("status"));
    }

    /** Creates the SOS (or returns the running one) and starts the foreground service. Returns in milliseconds. */
    static JSONObject activate(Context c, String trigger) throws JSONException {
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
                boolean hasPhone = !x.isNull("phone") && x.optString("phone").length() > 4;
                boolean sms = x.optBoolean("sms") && hasPhone;
                JSONObject k = new JSONObject()
                        .put("id", x.optString("id")).put("name", x.optString("name"))
                        .put("phone", hasPhone ? x.optString("phone") : JSONObject.NULL)
                        .put("email", x.isNull("email") ? "" : x.optString("email", ""))
                        .put("role", x.optString("role", "friend"))
                        .put("sms", sms).put("whatsapp", x.optBoolean("whatsapp") && hasPhone).put("emailOn", x.optBoolean("email_on"))
                        .put("smsStatus", sms ? "pending" : "skipped").put("via", JSONObject.NULL).put("smsAt", JSONObject.NULL).put("attempts", 0);
                if (x.optBoolean("live")) {
                    k.put("token", Store.randomId(18)); // opaque, per contact; only its SHA-256 ever leaves the phone
                    anyLive = true;
                }
                contacts.put(k);
            }
            boolean device = s.get("device") != null;
            sos = new JSONObject()
                    .put("sosId", Store.randomId(16)).put("trigger", trigger == null ? "sos" : trigger)
                    .put("startedAt", Store.iso(System.currentTimeMillis())).put("status", "active").put("endedAt", JSONObject.NULL)
                    .put("contacts", contacts).put("lastLocation", JSONObject.NULL).put("area", JSONObject.NULL).put("locationFailed", false)
                    .put("live", !device ? "off" : anyLive ? "pending" : "off")
                    .put("liveDetail", !device ? "Sign in to share live location" : anyLive ? "Starting…" : "No live-location contacts")
                    .put("cloud", device ? "pending" : "off").put("responders", new JSONArray())
                    .put("smsDispatched", false).put("escalated", false);
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
        String st = k.optString("smsStatus"), via = k.optString("via");
        if ("submitted".equals(st)) return new String[]{"ok", "provider".equals(via) ? "Alerted · server SMS" : "Alerted · SMS sent"};
        if ("delivered".equals(st)) return new String[]{"ok", "Alerted · SMS delivered"};
        if ("failed".equals(st)) return new String[]{"failed", "Unable to text this contact" + (k.has("error") ? " · " + k.optString("error") : "")};
        if ("not_permitted".equals(st)) return new String[]{"queued", "Tap Send in Messages"};
        if ("queued".equals(st)) return new String[]{"queued", "Waiting for signal"};
        if ("skipped".equals(st)) return new String[]{"off", k.optBoolean("whatsapp") || k.optBoolean("emailOn") ? "WhatsApp / email only" : "No SMS channel"};
        return new String[]{"pending", "Sending…"};
    }

    static void emitContact(JSONObject k) {
        String[] ui = contactUi(k);
        Events.emit("sos_contact", "id", k.optString("id"), "state", ui[0], "detail", ui[1]);
    }

    static void setSms(Context c, String contactId, String status, String via, String error) {
        Store s = new Store(c);
        synchronized (LOCK) {
            JSONObject sos = s.get("sos");
            if (sos == null) return;
            JSONArray ks = sos.optJSONArray("contacts");
            for (int i = 0; ks != null && i < ks.length(); i++) {
                JSONObject k = ks.optJSONObject(i);
                if (!contactId.equals(k.optString("id"))) continue;
                if ("delivered".equals(k.optString("smsStatus")) && !"delivered".equals(status)) return;
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

    static boolean charging(Context c) {
        Intent i = c.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        int st = i == null ? -1 : i.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
        return st == BatteryManager.BATTERY_STATUS_CHARGING || st == BatteryManager.BATTERY_STATUS_FULL;
    }

    /** Sends the whole SOS state (idempotent; retried until acknowledged). Blocking. True when the server has everything. */
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
                return !isActive(sos);
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
                    dev.put(new JSONObject().put("contactId", k.optString("id")).put("status", st).put("at", k.isNull("smsAt") ? JSONObject.NULL : k.optString("smsAt")).put("via", "not_permitted".equals(st) ? "composer" : "device"));
                }
            }
            JSONObject cfg = s.config();
            int bat = battery(c);
            String region = cfg.optString("region", "IN");
            JSONObject payload = new JSONObject()
                    .put("sosId", sos.optString("sosId")).put("trigger", sos.optString("trigger", "sos")).put("startedAt", sos.optString("startedAt"))
                    .put("status", sos.optString("status")).put("endedAt", sos.isNull("endedAt") ? JSONObject.NULL : sos.optString("endedAt"))
                    .put("locations", locs).put("area", sos.isNull("area") ? JSONObject.NULL : sos.optString("area"))
                    .put("shareTokens", tokens).put("deviceSms", dev)
                    .put("battery", bat < 0 ? JSONObject.NULL : bat).put("network", Net.state(c))
                    .put("region", region.length() == 2 ? region : "IN").put("source", "android");
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
                update(s, "cloud", "failed", null, null);
                Events.emit("sos_cloud", "state", "failed");
                if (r.code != 401) SyncJob.schedule(c);
                return r.code == 400 || r.code == 401 || r.code == 403;
            }
            applyServer(s, r.body, n);
            return !isActive(s.get("sos"));
        } catch (JSONException e) {
            return false;
        }
    }

    private static void applyServer(Store s, JSONObject body, int sent) throws JSONException {
        synchronized (LOCK) {
            JSONArray q = s.getArray("sosQueue");
            JSONArray rest = new JSONArray();
            for (int i = sent; i < q.length(); i++) rest.put(q.get(i));
            s.putArray("sosQueue", rest);
            JSONObject sos = s.get("sos");
            if (sos == null) return;
            JSONObject alerts = body == null ? null : body.optJSONObject("alerts");
            JSONArray ks = sos.optJSONArray("contacts");
            int shared = 0;
            for (int i = 0; ks != null && i < ks.length(); i++) {
                JSONObject k = ks.getJSONObject(i);
                JSONObject a = alerts == null ? null : alerts.optJSONObject(k.optString("id"));
                if (a == null) continue;
                if ("shared".equals(a.optString("live"))) shared++;
                JSONObject sms = a.optJSONObject("sms");
                if (sms != null && "provider".equals(sms.optString("via"))) {
                    String st = sms.optString("status"), mine = k.optString("smsStatus");
                    boolean deviceOk = "submitted".equals(mine) || "delivered".equals(mine);
                    if (!deviceOk && ("submitted".equals(st) || "delivered".equals(st) || "failed".equals(st))) {
                        k.put("smsStatus", st).put("via", "provider");
                        emitContact(k);
                    }
                }
            }
            String live = shared > 0 ? "ok" : "off";
            String detail = shared > 0 ? "Sharing with " + shared : "No live-location contacts";
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
        return o.put("active", true).put("sosId", sos.optString("sosId")).put("startedAt", sos.optString("startedAt")).put("trigger", sos.optString("trigger", "sos"))
                .put("location", sos.opt("lastLocation")).put("area", sos.opt("area")).put("locationFailed", sos.optBoolean("locationFailed"))
                .put("contacts", out).put("live", sos.optString("live")).put("liveDetail", sos.optString("liveDetail"))
                .put("cloud", sos.optString("cloud")).put("network", Net.state(c))
                .put("responders", sos.optJSONArray("responders") == null ? new JSONArray() : sos.optJSONArray("responders"))
                .put("soundOn", SosService.sirenPlaying);
    }
}
