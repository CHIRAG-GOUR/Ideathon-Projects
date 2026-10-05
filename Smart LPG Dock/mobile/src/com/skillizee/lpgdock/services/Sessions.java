package com.skillizee.lpgdock.services;

import android.content.Context;
import com.skillizee.lpgdock.engine.Engine;
import com.skillizee.lpgdock.sim.SimController;
import org.json.JSONArray;
import org.json.JSONObject;

/** Finished runs, kept on the device (and sent to Firestore when signed in). The simulation never depends on this. */
public final class Sessions {
    public static JSONArray list(Context c) {
        try {
            String s = Prefs.get(c, "sessions");
            return s == null ? new JSONArray() : new JSONArray(s);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    public static JSONObject summarise(SimController sim) throws Exception {
        Engine.State s = sim.state;
        double peak = 0, mt = 0, mtl = 0;
        for (Engine.Sample h : s.history) {
            peak = Math.max(peak, h.gas);
            mt = Math.max(mt, h.temp);
            mtl = Math.max(mtl, h.tilt);
        }
        JSONObject o = new JSONObject();
        o.put("id", sim.sessionId);
        o.put("scenario", s.scenario);
        o.put("mode", s.mode);
        o.put("startedAt", Cloud.iso(sim.startedAtWall));
        o.put("durationSec", Math.round(s.t * 10) / 10.0);
        o.put("outcome", "CONTAINED".equals(s.outcome) ? "CONTAINED" : "ESCALATION");
        o.put("peakGas", peak);
        o.put("maxTemp", mt);
        o.put("maxTilt", mtl);
        o.put("cylinderId", sim.config.cylinderId);
        JSONArray ev = new JSONArray();
        for (Engine.Event e : s.events) ev.put(new JSONObject().put("t", e.t).put("kind", e.kind).put("level", e.level).put("text", e.text));
        o.put("events", ev);
        o.put("cloud", "local");
        return o;
    }

    public static synchronized void add(Context c, JSONObject o) {
        try {
            JSONArray old = list(c), out = new JSONArray().put(o);
            for (int i = 0; i < old.length() && i < 49; i++) if (!old.getJSONObject(i).getString("id").equals(o.getString("id"))) out.put(old.get(i));
            Prefs.put(c, "sessions", out.toString());
        } catch (Exception ignored) {
        }
    }

    public static void clear(Context c) {
        Prefs.put(c, "sessions", "[]");
    }
}
