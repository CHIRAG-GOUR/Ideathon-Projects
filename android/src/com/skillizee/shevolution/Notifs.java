package com.skillizee.shevolution;

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
 * Notification channels. "Shevolution SOS" has its own sound (res/raw/sos_notification.wav), a strong
 * vibration pattern and heads-up / full-screen behaviour — separate from ordinary app notifications.
 */
final class Notifs {
    static final String SOS = "sos_alert_v1";
    static final String SAFETY = "safety_v1";
    static final String TRACKING = "tracking_v1";
    static final int ID_TRACKING = 1;
    static final int ID_TRIP = 2;
    static final int ID_ALERT = 3;
    static final long[] SOS_VIBRATION = {0, 900, 300, 900, 300, 900, 600, 900, 300, 900};

    static void ensure(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        NotificationChannel sos = new NotificationChannel(SOS, "Shevolution SOS", NotificationManager.IMPORTANCE_HIGH);
        sos.setDescription("SOS alerts from people in your Safety Circle");
        sos.setSound(Uri.parse("android.resource://" + c.getPackageName() + "/" + R.raw.sos_notification),
                new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        sos.enableVibration(true);
        sos.setVibrationPattern(SOS_VIBRATION);
        sos.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        NotificationChannel safety = new NotificationChannel(SAFETY, "Safety reminders", NotificationManager.IMPORTANCE_HIGH);
        safety.setDescription("Safe Trip and Safety Timer check-ins");
        NotificationChannel tracking = new NotificationChannel(TRACKING, "Location sharing status", NotificationManager.IMPORTANCE_LOW);
        tracking.setDescription("Shown while your location is being shared");
        nm.createNotificationChannel(sos);
        nm.createNotificationChannel(safety);
        nm.createNotificationChannel(tracking);
    }

    static Notification.Builder builder(Context c, String channel) {
        ensure(c);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, channel) : new Notification.Builder(c);
        return b.setSmallIcon(R.drawable.ic_stat).setColor(0xFFF02452);
    }

    static PendingIntent openApp(Context c, int req, Intent extras) {
        Intent i = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (extras != null) i.putExtras(extras);
        return PendingIntent.getActivity(c, req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
