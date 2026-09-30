package com.skillizee.shevolution;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** API calls made while offline wait here and are sent by SyncJob when a network is available. */
final class Outbox {
    static void add(Context c, String path, JSONObject body) {
        Store s = new Store(c);
        synchronized (Sos.LOCK) {
            JSONArray a = s.getArray("outbox");
            try {
                a.put(new JSONObject().put("path", path).put("body", body));
            } catch (JSONException ignored) {
            }
            s.putArray("outbox", a);
        }
        SyncJob.schedule(c);
    }

    /** Returns true when everything was delivered. Blocking. */
    static boolean flush(Context c) {
        Store s = new Store(c);
        JSONArray a;
        synchronized (Sos.LOCK) {
            a = s.getArray("outbox");
        }
        if (a.length() == 0 || s.get("device") == null) return true;
        int done = 0;
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            Net.Result r = Net.post(s, o.optString("path"), o.optJSONObject("body"));
            if (r.code == -1 || r.code >= 500) break; // try again later
            done++; // delivered, or permanently rejected (4xx)
        }
        synchronized (Sos.LOCK) {
            JSONArray now = s.getArray("outbox");
            JSONArray rest = new JSONArray();
            for (int i = done; i < now.length(); i++) rest.put(now.opt(i));
            s.putArray("outbox", rest);
            return rest.length() == 0;
        }
    }
}
