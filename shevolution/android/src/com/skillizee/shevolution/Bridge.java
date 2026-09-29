package com.skillizee.shevolution;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.telephony.TelephonyManager;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Locale;

/** window.ShevolutionNative.invoke(method, json) — the only door from the UI into the safety layer. */
final class Bridge {
    private final MainActivity a;
    private final Context c;
    private final Store store;
    private Ringtone ring;

    Bridge(MainActivity a) {
        this.a = a;
        this.c = a.getApplicationContext();
        this.store = new Store(c);
    }

    @JavascriptInterface
    public String invoke(String method, String json) {
        if (!MainActivity.HOST.equals(a.currentHost)) return err("not allowed"); // only our own pages may call in
        try {
            JSONObject args = json == null || json.isEmpty() ? new JSONObject() : new JSONObject(json);
            JSONObject r = handle(method, args);
            if (!r.has("ok")) r.put("ok", true);
            return r.toString();
        } catch (Exception e) {
            return err(e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage());
        }
    }

    private static String err(String m) {
        return "{\"ok\":false,\"error\":" + JSONObject.quote(m) + "}";
    }

    private boolean has(String p) {
        return c.checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED;
    }

    static String[] perms(String name) {
        switch (name) {
            case "location":
                return new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION};
            case "notifications":
                return Build.VERSION.SDK_INT >= 33 ? new String[]{Manifest.permission.POST_NOTIFICATIONS} : new String[0];
            case "sms":
                return Flavor.DIRECT_SMS ? new String[]{Manifest.permission.SEND_SMS} : null;
            case "receiveSms":
                return Flavor.DIRECT_SMS ? new String[]{Manifest.permission.RECEIVE_SMS} : null;
            case "phone":
                return new String[]{Manifest.permission.CALL_PHONE};
            default:
                return null;
        }
    }

    private boolean granted(String name) {
        String[] p = perms(name);
        if (p == null) return false;
        for (String x : p) if (has(x)) return true;
        return p.length == 0;
    }

    private JSONObject handle(String m, final JSONObject x) throws Exception {
        switch (m) {
            case "info": {
                JSONObject p = new JSONObject();
                for (String n : new String[]{"location", "notifications", "sms", "phone", "receiveSms"}) p.put(n, granted(n));
                TelephonyManager tm = c.getSystemService(TelephonyManager.class);
                String iso = tm == null ? "" : tm.getSimCountryIso();
                if ((iso == null || iso.isEmpty()) && tm != null) iso = tm.getNetworkCountryIso();
                LocationManager lm = c.getSystemService(LocationManager.class);
                boolean locOn = Build.VERSION.SDK_INT >= 28 ? lm.isLocationEnabled() : lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
                int bat = Sos.battery(c);
                return new JSONObject().put("version", Flavor.VERSION).put("sdk", Build.VERSION.SDK_INT)
                        .put("region", iso == null || iso.isEmpty() ? JSONObject.NULL : iso.toUpperCase(Locale.ROOT))
                        .put("directSms", Flavor.DIRECT_SMS).put("permissions", p)
                        .put("device", new JSONObject().put("registered", store.get("device") != null))
                        .put("network", Net.state(c)).put("battery", bat < 0 ? JSONObject.NULL : bat).put("locationEnabled", locOn);
            }
            case "requestPermission": {
                String name = x.optString("name");
                String[] p = perms(name);
                if (p == null) return new JSONObject().put("ok", false).put("error", "Not available in this build");
                if (granted(name)) return new JSONObject().put("granted", true);
                a.askPermission(name, p);
                return new JSONObject().put("granted", false).put("pending", true);
            }
            case "configure":
                store.put("config", x);
                return new JSONObject();
            case "setDevice":
                store.put("device", x);
                SyncJob.schedule(c);
                return new JSONObject();
            case "clearDevice":
                store.put("device", null);
                return new JSONObject();
            case "sosActivate": {
                JSONObject sos = Sos.activate(c);
                a.keepScreenOn(true);
                JSONArray ks = sos.optJSONArray("contacts"), out = new JSONArray();
                for (int i = 0; ks != null && i < ks.length(); i++) out.put(new JSONObject().put("id", ks.getJSONObject(i).optString("id")).put("name", ks.getJSONObject(i).optString("name")));
                return new JSONObject().put("sosId", sos.optString("sosId")).put("startedAt", sos.optString("startedAt")).put("contacts", out).put("alreadyActive", sos.optBoolean("alreadyActive"));
            }
            case "sosEnd":
                c.startService(new Intent(c, SosService.class).setAction(SosService.ACTION_END).putExtra("outcome", x.optString("outcome", "safe")));
                a.keepScreenOn(false);
                return new JSONObject();
            case "sosState":
                return Sos.snapshot(c);
            case "stopSound":
                c.startService(new Intent(c, SosService.class).setAction(SosService.ACTION_SILENCE));
                return new JSONObject();
            case "call": {
                String num = x.optString("number").replaceAll("[^0-9+]", "");
                // Android opens emergency numbers in the dialer only; other numbers are called directly only with permission.
                boolean direct = x.optBoolean("direct") && has(Manifest.permission.CALL_PHONE);
                a.startActivity(new Intent(direct ? Intent.ACTION_CALL : Intent.ACTION_DIAL, Uri.parse("tel:" + num)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                return new JSONObject().put("placed", direct ? "direct" : "dialer");
            }
            case "smsSend": {
                JSONArray to = x.optJSONArray("to");
                String body = x.optString("body"), tag = x.optString("tag", "msg");
                if (Sms.canSendDirect(c)) {
                    for (int i = 0; to != null && i < to.length(); i++) Sms.send(c, to.getJSONObject(i).optString("phone"), body, tag, to.getJSONObject(i).optString("id"));
                    return new JSONObject().put("mode", "direct");
                }
                String[] nums = new String[to == null ? 0 : to.length()];
                for (int i = 0; i < nums.length; i++) nums[i] = to.getJSONObject(i).optString("phone");
                boolean opened = Sms.compose(c, nums, body);
                for (int i = 0; to != null && i < to.length(); i++) Events.emit("sms_result", "tag", tag, "id", to.getJSONObject(i).optString("id"), "status", opened ? "composer" : "failed");
                return new JSONObject().put("mode", "composer");
            }
            case "smsCompose": {
                JSONArray n = x.optJSONArray("numbers");
                String[] nums = new String[n == null ? 0 : n.length()];
                for (int i = 0; i < nums.length; i++) nums[i] = n.getString(i);
                return new JSONObject().put("opened", Sms.compose(c, nums, x.optString("body")));
            }
            case "sosMessage": {
                // The SOS text for WhatsApp/email, with this contact's personal live link when they have one.
                JSONObject sos = store.get("sos");
                JSONObject cfg = store.config();
                String live = null;
                JSONArray ks = sos == null ? null : sos.optJSONArray("contacts");
                for (int i = 0; ks != null && i < ks.length(); i++) {
                    JSONObject k = ks.getJSONObject(i);
                    if (k.optString("id").equals(x.optString("contactId")) && k.has("token")) live = cfg.optString("origin") + "/e/" + k.optString("token");
                }
                JSONObject loc = sos == null ? null : sos.optJSONObject("lastLocation");
                return new JSONObject().put("text", Sms.fill(Sms.template(cfg, "sos", Sms.DEFAULT_SOS), cfg, loc, live, Sms.areaExtras(sos)));
            }
            case "whatsapp":
                return new JSONObject().put("opened", Sms.whatsapp(c, x.optString("phone"), x.optString("text")));
            case "email": {
                JSONArray to = x.optJSONArray("to");
                String[] list = new String[to == null ? 0 : to.length()];
                for (int i = 0; i < list.length; i++) list[i] = to.getString(i);
                return new JSONObject().put("opened", Sms.email(c, list, x.optString("subject"), x.optString("body")));
            }
            case "pickContact":
                a.pickContact();
                return new JSONObject();
            case "location":
                oneShotLocation();
                return new JSONObject();
            case "tripStart":
                Trips.start(c, x);
                return new JSONObject();
            case "tripEnd":
                Trips.end(c, x.optString("status"));
                return new JSONObject();
            case "tripExtend":
                Trips.extend(c, x.optString("dueAt"));
                return new JSONObject();
            case "tripState": {
                JSONObject t = store.get("trip");
                return new JSONObject().put("trip", t == null ? JSONObject.NULL : t);
            }
            case "openUrl":
                a.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(x.optString("url"))).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                return new JSONObject();
            case "openLocationSettings":
                a.startActivity(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                return new JSONObject();
            case "vibrate": {
                Vibrator v = c.getSystemService(Vibrator.class);
                JSONArray p = x.optJSONArray("pattern");
                if (v != null && p != null && Build.VERSION.SDK_INT >= 26) {
                    long[] w = new long[p.length()];
                    for (int i = 0; i < w.length; i++) w[i] = p.getLong(i);
                    v.vibrate(VibrationEffect.createWaveform(w, -1));
                }
                return new JSONObject();
            }
            case "ringtone": {
                if (ring != null) ring.stop();
                ring = null;
                if (x.optBoolean("play")) {
                    ring = RingtoneManager.getRingtone(c, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE));
                    if (ring != null) {
                        if (Build.VERSION.SDK_INT >= 28) ring.setLooping(true);
                        ring.play();
                    }
                }
                return new JSONObject();
            }
            case "consumeLaunch": {
                String t = a.consumeAlertToken();
                return new JSONObject().put("alertToken", t == null ? JSONObject.NULL : t);
            }
            default:
                throw new IllegalArgumentException("Unknown method " + m);
        }
    }

    /** A single current fix for Nearby Help, trips and check-ins. Falls back to the last known position, labelled. */
    private void oneShotLocation() {
        if (!has(Manifest.permission.ACCESS_FINE_LOCATION) && !has(Manifest.permission.ACCESS_COARSE_LOCATION)) {
            Events.emit("location_error", "error", "Location permission is off");
            return;
        }
        final LocationManager lm = c.getSystemService(LocationManager.class);
        final Handler h = new Handler(Looper.getMainLooper());
        final boolean[] done = {false};
        final LocationListener l = new LocationListener() {
            @Override
            public void onLocationChanged(Location loc) {
                if (done[0] || (loc.hasAccuracy() && loc.getAccuracy() > 200)) return;
                done[0] = true;
                lm.removeUpdates(this);
                Events.emit("location", "location", Store.fix(loc, false));
            }

            @Override
            public void onProviderDisabled(String p) {
            }

            @Override
            public void onProviderEnabled(String p) {
            }

            @Override
            public void onStatusChanged(String p, int s, Bundle b) {
            }
        };
        h.post(new Runnable() {
            @Override
            public void run() {
                try {
                    for (String p : new String[]{LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER}) {
                        if (lm.getAllProviders().contains(p)) lm.requestLocationUpdates(p, 1000, 0f, l, Looper.getMainLooper());
                    }
                } catch (SecurityException e) {
                    Events.emit("location_error", "error", "Location permission is off");
                }
            }
        });
        h.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (done[0]) return;
                done[0] = true;
                lm.removeUpdates(l);
                JSONObject lk = Trips.lastKnown(c);
                if (lk != null) Events.emit("location", "location", lk);
                else Events.emit("location_error", "error", "Location unavailable");
            }
        }, 20_000);
    }
}
