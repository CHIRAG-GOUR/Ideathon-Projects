package com.skillizee.shevolution;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Telephony;
import android.telephony.SmsMessage;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * For someone IN a Safety Circle who has Shevolution: an ordinary SMS cannot play a custom sound, so when a
 * Shevolution SOS text arrives the app raises its own SOS alarm (dedicated channel, sound, vibration,
 * full-screen where allowed). Only the text of that one message is read, on the phone; nothing is uploaded.
 */
public class SmsAlertReceiver extends BroadcastReceiver {
    private static final Pattern LINK = Pattern.compile("shevolution\\.web\\.app/e/([A-Za-z0-9_-]{16,64})");
    private static final Pattern NAME = Pattern.compile("\\n(.+?) (is in DANGER|has had NO response)");
    private static final Pattern MAPS = Pattern.compile("maps\\.google\\.com/\\?q=(-?[0-9.]+),(-?[0-9.]+)");

    @Override
    public void onReceive(Context c, Intent i) {
        if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(i.getAction())) return;
        SmsMessage[] parts = Telephony.Sms.Intents.getMessagesFromIntent(i);
        if (parts == null) return;
        StringBuilder sb = new StringBuilder();
        for (SmsMessage m : parts) if (m != null && m.getMessageBody() != null) sb.append(m.getMessageBody());
        String body = sb.toString();
        if (!body.contains("- Shevolution SOS") || !(body.contains("SOS! I NEED HELP") || body.contains("SOS STILL ACTIVE"))) return;

        Matcher name = NAME.matcher(body), link = LINK.matcher(body), maps = MAPS.matcher(body);
        String who = name.find() ? name.group(1) : "Someone in your circle";
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (link.find()) open.putExtra("alertToken", link.group(1));
        if (maps.find()) open.putExtra("alertMaps", "https://maps.google.com/?q=" + maps.group(1) + "," + maps.group(2));
        PendingIntent pi = PendingIntent.getActivity(c, 30, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationManager nm = c.getSystemService(NotificationManager.class);
        Notification.Builder b = Notifs.builder(c, Notifs.SOS)
                .setContentTitle("🚨 SOS ALERT")
                .setContentText(who + " needs help NOW — tap to see their location")
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setContentIntent(pi)
                .setCategory(Notification.CATEGORY_ALARM)
                .setPriority(Notification.PRIORITY_MAX)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setAutoCancel(true);
        if (Build.VERSION.SDK_INT < 26) b.setVibrate(Notifs.SOS_VIBRATION);
        if (Build.VERSION.SDK_INT < 34 || nm.canUseFullScreenIntent()) b.setFullScreenIntent(pi, true);
        Notification n = b.build();
        n.flags |= Notification.FLAG_INSISTENT; // keeps ringing until opened or dismissed
        nm.notify(Notifs.ID_ALERT, n);
    }
}
