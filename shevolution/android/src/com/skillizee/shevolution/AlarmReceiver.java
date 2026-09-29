package com.skillizee.shevolution;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import org.json.JSONObject;

/** Trip/timer alarms, the "I'm safe" notification action, and re-scheduling after a reboot. */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String a = i.getAction();
        JSONObject t = new Store(c).get("trip");
        if (Intent.ACTION_BOOT_COMPLETED.equals(a)) {
            if (t != null) Trips.schedule(c, t); // alarms don't survive a reboot
            if (Sos.isActive(new Store(c).get("sos")) || new Store(c).get("sos") != null) SyncJob.schedule(c);
            return;
        }
        if (t == null) return;
        if (Trips.DUE.equals(a)) {
            Trips.notifyDue(c, t);
            Events.emit("trip_due", "tripId", t.optString("tripId"));
        } else if (Trips.ESCALATE.equals(a)) {
            Trips.escalate(c);
        } else if (Trips.SAFE.equals(a)) {
            String status = i.getBooleanExtra("arrived", false) ? "arrived" : "checked_in";
            Outbox.add(c, "/trips/update", Trips.tripUpdate(t, status));
            Trips.end(c, status);
        }
    }
}
