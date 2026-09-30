package com.skillizee.shevolution;

import android.content.Context;
import android.content.SharedPreferences;
import android.location.Location;
import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Everything the safety layer needs survives app kills and reboots here (private app storage).
 * The SOS works from this data alone: no network and no JavaScript required.
 */
final class Store {
    private static final SecureRandom RNG = new SecureRandom();
    private final SharedPreferences p;

    Store(Context c) {
        p = c.getApplicationContext().getSharedPreferences("shevolution", Context.MODE_PRIVATE);
    }

    JSONObject get(String key) {
        String s = p.getString(key, null);
        if (s == null) return null;
        try {
            return new JSONObject(s);
        } catch (JSONException e) {
            return null;
        }
    }

    void put(String key, JSONObject v) {
        if (v == null) p.edit().remove(key).commit();
        else p.edit().putString(key, v.toString()).commit();
    }

    JSONArray getArray(String key) {
        try {
            return new JSONArray(p.getString(key, "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    void putArray(String key, JSONArray v) {
        p.edit().putString(key, v.toString()).commit();
    }

    String getString(String key) {
        return p.getString(key, null);
    }

    void putString(String key, String v) {
        if (v == null) p.edit().remove(key).commit();
        else p.edit().putString(key, v).commit();
    }

    JSONObject config() {
        JSONObject c = get("config");
        return c != null ? c : new JSONObject();
    }

    JSONObject settings() {
        JSONObject s = config().optJSONObject("settings");
        return s != null ? s : new JSONObject();
    }

    // ---- helpers ----

    static String randomId(int bytes) {
        byte[] b = new byte[bytes];
        RNG.nextBytes(b);
        return Base64.encodeToString(b, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
    }

    static String sha256(String s) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(s.getBytes("UTF-8"));
            StringBuilder sb = new StringBuilder();
            for (byte x : d) sb.append(String.format(Locale.ROOT, "%02x", x));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    static String iso(long ms) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.ROOT);
        f.setTimeZone(TimeZone.getTimeZone("UTC"));
        return f.format(new Date(ms));
    }

    static long parseIso(String s) {
        try {
            SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.ROOT);
            f.setTimeZone(TimeZone.getTimeZone("UTC"));
            return f.parse(s).getTime();
        } catch (Exception e) {
            return 0;
        }
    }

    /** Real fix only — every field comes from the platform; missing values stay null. */
    static JSONObject fix(Location l, boolean lastKnown) {
        JSONObject o = new JSONObject();
        try {
            o.put("latitude", l.getLatitude());
            o.put("longitude", l.getLongitude());
            o.put("accuracy", l.hasAccuracy() ? (double) l.getAccuracy() : JSONObject.NULL);
            o.put("altitude", l.hasAltitude() ? l.getAltitude() : JSONObject.NULL);
            o.put("speed", l.hasSpeed() ? (double) Math.min(149f, l.getSpeed()) : JSONObject.NULL);
            o.put("heading", l.hasBearing() ? (double) (l.getBearing() % 360f) : JSONObject.NULL);
            o.put("timestamp", iso(l.getTime()));
            o.put("provider", l.getProvider() == null ? "unknown" : l.getProvider());
            if (lastKnown) o.put("lastKnown", true);
        } catch (JSONException ignored) {
        }
        return o;
    }
}
