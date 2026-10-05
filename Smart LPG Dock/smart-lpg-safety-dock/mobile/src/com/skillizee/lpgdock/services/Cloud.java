package com.skillizee.lpgdock.services;

import android.content.Context;
import com.skillizee.lpgdock.sim.App;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Optional Firebase (Auth + Firestore) over the public REST APIs — no Google SDK needed.
 * Config comes from assets/firebase.json, generated at build time from FIREBASE_API_KEY / FIREBASE_PROJECT_ID
 * (never committed). Without it, cloud features report "not configured" and everything else works.
 */
public final class Cloud {
    public static String iso(long ms) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        f.setTimeZone(TimeZone.getTimeZone("UTC"));
        return f.format(new Date(ms));
    }

    static JSONObject cfg(Context c) {
        if (override != null) return override;
        try {
            JSONObject j = new JSONObject(App.asset(c, "firebase.json"));
            return j.optString("apiKey").isEmpty() ? null : j;
        } catch (Exception e) {
            return null;
        }
    }

    /** Test hook: a config used instead of assets/firebase.json (e.g. pointing at the Firebase emulators). */
    public static JSONObject override;

    /** Auth endpoint: Google, or the Auth emulator when the config names one ("authEmulator": "host:port"). */
    static String auth(JSONObject k, String path) {
        String e = k.optString("authEmulator");
        return (e.isEmpty() ? "https://" : "http://" + e + "/") + path;
    }

    static String firestore(JSONObject k) {
        String e = k.optString("firestoreEmulator");
        return e.isEmpty() ? "https://firestore.googleapis.com" : "http://" + e;
    }

    public static boolean configured(Context c) {
        return cfg(c) != null;
    }

    public static String email(Context c) {
        return Prefs.get(c, "email");
    }

    static JSONObject http(String method, String url, JSONObject body, String token) throws Exception {
        HttpURLConnection h = (HttpURLConnection) new URL(url).openConnection();
        h.setRequestMethod(method);
        h.setConnectTimeout(10000);
        h.setReadTimeout(15000);
        h.setRequestProperty("Content-Type", "application/json");
        if (token != null) h.setRequestProperty("Authorization", "Bearer " + token);
        if (body != null) {
            h.setDoOutput(true);
            try (OutputStream o = h.getOutputStream()) {
                o.write(body.toString().getBytes("UTF-8"));
            }
        }
        int code = h.getResponseCode();
        InputStream in = code < 400 ? h.getInputStream() : h.getErrorStream();
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        if (in != null) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
        }
        String txt = b.toString("UTF-8");
        JSONObject j = txt.isEmpty() ? new JSONObject() : new JSONObject(txt);
        if (code >= 400) {
            JSONObject err = j.optJSONObject("error");
            String msg = err != null ? err.optString("message", "HTTP " + code) : "HTTP " + code;
            if (err != null && "PERMISSION_DENIED".equals(err.optString("status"))) msg = "PERMISSION_DENIED";
            throw new Exception(friendly(msg));
        }
        return j;
    }

    static String friendly(String m) {
        if (m.startsWith("EMAIL_EXISTS")) return "An account already uses this email. Sign in instead.";
        if (m.startsWith("INVALID_LOGIN_CREDENTIALS") || m.startsWith("INVALID_PASSWORD") || m.startsWith("EMAIL_NOT_FOUND")) return "Email or password is incorrect.";
        if (m.startsWith("WEAK_PASSWORD")) return "Use at least 6 characters.";
        if (m.startsWith("INVALID_EMAIL")) return "Enter a valid email address.";
        if (m.startsWith("OPERATION_NOT_ALLOWED")) return "Email/password sign-in is not enabled in the Firebase project.";
        if (m.startsWith("PERMISSION_DENIED")) return "Permission denied by the Firestore security rules.";
        return m;
    }

    /** Runs on a background thread. */
    public static void signIn(Context c, String email, String password, boolean create) throws Exception {
        JSONObject k = cfg(c);
        if (k == null) throw new Exception("Firebase is not configured in this build. The simulation works fully without it.");
        String ep = create ? "accounts:signUp" : "accounts:signInWithPassword";
        JSONObject r = http("POST", auth(k, "identitytoolkit.googleapis.com/v1/") + ep + "?key=" + k.getString("apiKey"), new JSONObject().put("email", email).put("password", password).put("returnSecureToken", true), null);
        Prefs.put(c, "idToken", r.getString("idToken"));
        Prefs.put(c, "refreshToken", r.getString("refreshToken"));
        Prefs.put(c, "uid", r.getString("localId"));
        Prefs.put(c, "email", email);
        Prefs.put(c, "tokenAt", String.valueOf(System.currentTimeMillis()));
    }

    public static void signOut(Context c) {
        for (String key : new String[] {"idToken", "refreshToken", "uid", "email", "tokenAt"}) Prefs.put(c, key, null);
    }

    static String token(Context c) throws Exception {
        JSONObject k = cfg(c);
        String t = Prefs.get(c, "idToken");
        if (k == null || t == null) return null;
        long at = Long.parseLong(Prefs.get(c, "tokenAt") == null ? "0" : Prefs.get(c, "tokenAt"));
        if (System.currentTimeMillis() - at > 50 * 60 * 1000L) {
            HttpURLConnection h = (HttpURLConnection) new URL(auth(k, "securetoken.googleapis.com/v1/token") + "?key=" + k.getString("apiKey")).openConnection();
            h.setRequestMethod("POST");
            h.setDoOutput(true);
            h.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
            try (OutputStream o = h.getOutputStream()) {
                o.write(("grant_type=refresh_token&refresh_token=" + Prefs.get(c, "refreshToken")).getBytes("UTF-8"));
            }
            if (h.getResponseCode() >= 400) return null;
            ByteArrayOutputStream b = new ByteArrayOutputStream();
            try (InputStream in = h.getInputStream()) {
                byte[] buf = new byte[4096];
                int n;
                while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
            }
            JSONObject r = new JSONObject(b.toString("UTF-8"));
            t = r.getString("id_token");
            Prefs.put(c, "idToken", t);
            Prefs.put(c, "refreshToken", r.getString("refresh_token"));
            Prefs.put(c, "tokenAt", String.valueOf(System.currentTimeMillis()));
        }
        return t;
    }

    static JSONObject v(Object x) throws Exception {
        if (x instanceof String) return new JSONObject().put("stringValue", x);
        if (x instanceof Integer || x instanceof Long) return new JSONObject().put("integerValue", String.valueOf(x));
        if (x instanceof Number) return new JSONObject().put("doubleValue", ((Number) x).doubleValue());
        if (x instanceof Boolean) return new JSONObject().put("booleanValue", x);
        return new JSONObject().put("nullValue", JSONObject.NULL);
    }

    /** Saves a session + its events in one Firestore commit (same documents the web app writes). Background thread. */
    public static void saveSession(Context c, JSONObject s) throws Exception {
        JSONObject k = cfg(c);
        String t = token(c);
        if (k == null || t == null) throw new Exception("Not signed in");
        String uid = Prefs.get(c, "uid");
        String base = "projects/" + k.getString("projectId") + "/databases/(default)/documents/";
        JSONArray writes = new JSONArray();
        JSONObject f = new JSONObject();
        for (String key : new String[] {"id", "scenario", "mode", "startedAt", "outcome", "cylinderId"}) f.put(key, v(s.getString(key)));
        for (String key : new String[] {"durationSec", "peakGas", "maxTemp", "maxTilt"}) f.put(key, v(s.getDouble(key)));
        JSONArray ev = s.getJSONArray("events");
        f.put("eventCount", v(ev.length()));
        f.put("ownerUid", v(uid));
        f.put("createdAt", v(iso(System.currentTimeMillis())));
        writes.put(new JSONObject().put("update", new JSONObject().put("name", base + "simulationSessions/" + s.getString("id")).put("fields", f)));
        for (int i = 0; i < ev.length(); i++) {
            JSONObject e = ev.getJSONObject(i);
            JSONObject ef = new JSONObject().put("t", v(e.getDouble("t"))).put("kind", v(e.getString("kind"))).put("level", v(e.getString("level"))).put("text", v(e.getString("text"))).put("sessionId", v(s.getString("id"))).put("ownerUid", v(uid));
            writes.put(new JSONObject().put("update", new JSONObject().put("name", base + "simulationEvents/" + s.getString("id") + "_" + String.format(Locale.US, "%03d", i)).put("fields", ef)));
        }
        http("POST", firestore(k) + "/v1/projects/" + k.getString("projectId") + "/databases/(default)/documents:commit", new JSONObject().put("writes", writes), t);
    }

    /** Records which presentation chapters were viewed (presentationSessions). Background thread. */
    public static void savePresentation(Context c, java.util.List<Integer> chapters, long startedAt) throws Exception {
        JSONObject k = cfg(c);
        String t = token(c);
        if (k == null || t == null) throw new Exception("Not signed in");
        JSONArray vals = new JSONArray();
        for (int ch : chapters) vals.put(v(ch));
        JSONObject f = new JSONObject().put("ownerUid", v(Prefs.get(c, "uid"))).put("startedAt", v(iso(startedAt))).put("endedAt", v(iso(System.currentTimeMillis())))
                .put("chaptersViewed", new JSONObject().put("arrayValue", new JSONObject().put("values", vals)));
        http("POST", firestore(k) + "/v1/projects/" + k.getString("projectId") + "/databases/(default)/documents/presentationSessions", new JSONObject().put("fields", f), t);
    }
}
