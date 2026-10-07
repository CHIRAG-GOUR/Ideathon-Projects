package @PKG@;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Check alarms, notification actions, and re-scheduling after a reboot. */
public class AlarmReceiver extends BroadcastReceiver {
    static final String ACTION_SILENCE = Flavor.PKG + ".SILENCE";

    @Override
    public void onReceive(Context c, Intent i) {
        String a = i.getAction();
        if (a == null) return;
        if (Intent.ACTION_BOOT_COMPLETED.equals(a)) {
            Checks.schedule(c, Checks.plan(c)); // alarms don't survive a reboot
            if (new Store(c).get("sos") != null) SyncJob.schedule(c);
            return;
        }
        if (ACTION_SILENCE.equals(a)) {
            try {
                c.startService(new Intent(c, SosService.class).setAction(SosService.ACTION_SILENCE));
            } catch (RuntimeException ignored) {
            }
            return;
        }
        if (Checks.OK.equals(a)) Checks.confirm(c, null);
        else Checks.onAlarm(c, a);
    }
}
