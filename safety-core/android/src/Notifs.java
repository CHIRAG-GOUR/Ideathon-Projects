package @PKG@;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

/**
 * Notification channels, named per app. The SOS channel has the app's own sound (res/raw/sos_notification.wav),
 * a strong vibration pattern and heads-up/full-screen behaviour; it is separate from ordinary notifications.
 */
final class Notifs {
    static final String SOS = "sos_alert_v1";
    static final String CHECK = "safety_check_v1";
    static final String TRACKING = "tracking_v1";
    static final int ID_TRACKING = 1;
    static final int ID_CHECK = 2;
    static final int ID_ALERT = 3;
    static final long[] SOS_VIBRATION = {0, 900, 300, 900, 300, 900, 600, 900, 300, 900};

    static void ensure(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        AudioAttributes alarm = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
        Uri sound = Uri.parse("android.resource://" + c.getPackageName() + "/" + R.raw.sos_notification);

        NotificationChannel sos = new NotificationChannel(SOS, Flavor.APP_NAME + " SOS", NotificationManager.IMPORTANCE_HIGH);
        sos.setDescription("SOS alerts from people who added you as a trusted contact");
        sos.setSound(sound, alarm);
        sos.enableVibration(true);
        sos.setVibrationPattern(SOS_VIBRATION);
        sos.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

        NotificationChannel check = new NotificationChannel(CHECK, "Safety checks", NotificationManager.IMPORTANCE_HIGH);
        check.setDescription("\"Are you safe?\" prompts");
        check.setSound(sound, alarm);
        check.enableVibration(true);

        NotificationChannel tracking = new NotificationChannel(TRACKING, "Location sharing status", NotificationManager.IMPORTANCE_LOW);
        tracking.setDescription("Shown whenever your location is being shared or kept ready");
        nm.createNotificationChannel(sos);
        nm.createNotificationChannel(check);
        nm.createNotificationChannel(tracking);
    }

    static Notification.Builder builder(Context c, String channel) {
        ensure(c);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, channel) : new Notification.Builder(c);
        return b.setSmallIcon(R.drawable.ic_stat).setColor(Flavor.ACCENT);
    }

    static PendingIntent openApp(Context c, int req, Intent extras) {
        Intent i = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (extras != null) i.putExtras(extras);
        return PendingIntent.getActivity(c, req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static PendingIntent action(Context c, int req, String action) {
        return PendingIntent.getBroadcast(c, req, new Intent(action).setClass(c, AlarmReceiver.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
