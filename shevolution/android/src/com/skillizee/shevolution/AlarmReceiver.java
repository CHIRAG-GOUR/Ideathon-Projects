package com.skillizee.shevolution;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONObject;

/** Trip/timer alarms, notification actions (end trip, trigger sos, silence), and reboot rescheduling. */
public class AlarmReceiver extends BroadcastReceiver {
    public static final String ACTION_STOP_TRIP = "com.skillizee.shevolution.STOP_TRIP";
    public static final String ACTION_START_SOS = "com.skillizee.shevolution.START_SOS";
    public static final String ACTION_END_SOS = "com.skillizee.shevolution.END_SOS";
    public static final String ACTION_SILENCE = "com.skillizee.shevolution.SILENCE";

    @Override
    public void onReceive(Context c, Intent i) {
        String a = i.getAction();
        Store store = new Store(c);
        JSONObject t = store.get("trip");

        if (Intent.ACTION_BOOT_COMPLETED.equals(a)) {
            if (t != null) Trips.schedule(c, t);
            if (Sos.isActive(store.get("sos")) || store.get("sos") != null) SyncJob.schedule(c);
            return;
        }

        if (ACTION_STOP_TRIP.equals(a)) {
            Trips.end(c, "cancelled");
            return;
        }

        if (ACTION_START_SOS.equals(a)) {
            Intent sosIntent = new Intent(c, SosService.class).setAction(SosService.ACTION_SOS);
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(sosIntent);
            else c.startService(sosIntent);
            return;
        }

        if (ACTION_END_SOS.equals(a)) {
            Intent endIntent = new Intent(c, SosService.class).setAction(SosService.ACTION_END).putExtra("outcome", "safe");
            c.startService(endIntent);
            return;
        }

        if (ACTION_SILENCE.equals(a)) {
            Intent silIntent = new Intent(c, SosService.class).setAction(SosService.ACTION_SILENCE);
            c.startService(silIntent);
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
