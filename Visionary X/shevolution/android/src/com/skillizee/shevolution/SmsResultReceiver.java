package com.skillizee.shevolution;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.telephony.SmsManager;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Carrier results for texts this phone sent. Multi-part messages count as sent only when every part was accepted. */
public class SmsResultReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String tag = i.getStringExtra("tag"), id = i.getStringExtra("id");
        int part = i.getIntExtra("part", 0), total = i.getIntExtra("total", 1);
        if (tag == null || id == null) return;
        boolean delivered = Sms.ACTION_DELIVERED.equals(i.getAction());
        boolean ok = getResultCode() == Activity.RESULT_OK;
        String key = "smsparts:" + tag + ":" + id + (delivered ? ":d" : ":s");
        Store s = new Store(c);
        String status;
        String error = null;
        synchronized (Sos.LOCK) {
            JSONObject rec = s.get(key);
            if (rec == null) rec = new JSONObject();
            try {
                if (!ok) rec.put("failed", true);
                rec.put("p" + part, true);
                s.put(key, rec);
            } catch (JSONException ignored) {
            }
            int seen = 0;
            for (int p = 0; p < total; p++) if (rec.has("p" + p)) seen++;
            if (!ok) status = delivered ? null : "failed";
            else if (seen < total) return; // wait for the remaining parts
            else status = rec.optBoolean("failed") ? (delivered ? null : "failed") : (delivered ? "delivered" : "submitted");
            if (status != null && !delivered) s.put(key, null);
        }
        if (status == null) return;
        if (!ok) error = reason(getResultCode());

        if ("sos".equals(tag)) {
            if ("failed".equals(status) && retry(c, s, id)) {
                Sos.setSms(c, id, "queued", "device", error);
                return;
            }
            Sos.setSms(c, id, status, "device", error);
            if (Sos.isActive(s.get("sos"))) {
                try {
                    c.startService(new Intent(c, SosService.class).setAction(SosService.ACTION_SYNC));
                } catch (RuntimeException ignored) {
                    SyncJob.schedule(c);
                }
            }
        } else {
            Events.emit("sms_result", "tag", tag, "id", id, "status", status);
        }
    }

    /** One automatic retry 20 s later (e.g. no signal for a moment). */
    private static boolean retry(Context c, Store s, String id) {
        synchronized (Sos.LOCK) {
            JSONObject sos = s.get("sos");
            if (!Sos.isActive(sos)) return false;
            JSONArray ks = sos.optJSONArray("contacts");
            for (int i = 0; ks != null && i < ks.length(); i++) {
                JSONObject k = ks.optJSONObject(i);
                if (!id.equals(k.optString("id"))) continue;
                int n = k.optInt("attempts");
                if (n >= 1) return false;
                try {
                    k.put("attempts", n + 1);
                } catch (JSONException ignored) {
                }
                s.put("sos", sos);
            }
        }
        try {
            c.startService(new Intent(c, SosService.class).setAction(SosService.ACTION_RETRY_SMS).putExtra("id", id));
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }

    private static String reason(int code) {
        switch (code) {
            case SmsManager.RESULT_ERROR_NO_SERVICE:
                return "no mobile signal";
            case SmsManager.RESULT_ERROR_RADIO_OFF:
                return "airplane mode";
            case SmsManager.RESULT_ERROR_NULL_PDU:
                return "message error";
            default:
                return "carrier error " + code;
        }
    }
}
