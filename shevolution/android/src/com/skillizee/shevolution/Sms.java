package com.skillizee.shevolution;

import android.Manifest;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.telephony.SmsManager;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Carrier SMS from the user's own SIM. Direct sending needs SEND_SMS (sideloaded build, or a Play build
 * with an approved permissions declaration); otherwise the Messages app opens pre-filled and the user taps Send.
 * "Sent" is recorded only from the carrier's result callback, "delivered" only from a delivery report.
 */
final class Sms {
    static final String ACTION_SENT = "com.skillizee.shevolution.SMS_SENT";
    static final String ACTION_DELIVERED = "com.skillizee.shevolution.SMS_DELIVERED";

    static boolean canSendDirect(Context c) {
        return Flavor.DIRECT_SMS && c.checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED;
    }

    @SuppressWarnings("deprecation")
    private static SmsManager manager(Context c) {
        if (Build.VERSION.SDK_INT >= 31) return c.getSystemService(SmsManager.class);
        return SmsManager.getDefault();
    }

    /** Sends one message; results arrive at SmsResultReceiver with the given tag/id. */
    static void send(Context c, String phone, String body, String tag, String id) {
        SmsManager m = manager(c);
        ArrayList<String> parts = m.divideMessage(body);
        ArrayList<PendingIntent> sent = new ArrayList<>();
        ArrayList<PendingIntent> delivered = new ArrayList<>();
        for (int i = 0; i < parts.size(); i++) {
            sent.add(pi(c, ACTION_SENT, tag, id, i, parts.size()));
            delivered.add(pi(c, ACTION_DELIVERED, tag, id, i, parts.size()));
        }
        m.sendMultipartTextMessage(phone, null, parts, sent, delivered);
    }

    private static PendingIntent pi(Context c, String action, String tag, String id, int part, int total) {
        Intent i = new Intent(action).setPackage(c.getPackageName()).setClass(c, SmsResultReceiver.class)
                .putExtra("tag", tag).putExtra("id", id).putExtra("part", part).putExtra("total", total)
                .setData(Uri.parse("shev://sms/" + action.hashCode() + "/" + tag + "/" + id + "/" + part));
        return PendingIntent.getBroadcast(c, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Fallback: the system Messages app, pre-filled. Nothing is sent until the user taps Send. */
    static boolean compose(Context c, String[] phones, String body) {
        StringBuilder to = new StringBuilder();
        for (String p : phones) {
            if (to.length() > 0) to.append(';');
            to.append(p);
        }
        Intent i = new Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:" + Uri.encode(to.toString())));
        i.putExtra("sms_body", body);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            c.startActivity(i);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // ---- message text: same templates and placeholders as shared/src/message.ts ----

    static String coord(double v) {
        return String.format(Locale.ROOT, "%.5f", v);
    }

    static String fill(String template, JSONObject cfg, JSONObject loc, String liveUrl, JSONObject extras) {
        String name = cfg.optString("userName", "A Shevolution user");
        String locline;
        String coords = "";
        if (loc != null) {
            double la = loc.optDouble("latitude"), lo = loc.optDouble("longitude");
            locline = (loc.optBoolean("lastKnown") ? "Last known location" : "Location") + ": https://maps.google.com/?q=" + coord(la) + "," + coord(lo);
            coords = "Lat " + coord(la) + " Lng " + coord(lo) + " (" + (loc.isNull("accuracy") ? "unknown" : "±" + Math.round(loc.optDouble("accuracy")) + " m") + ")";
        } else {
            locline = "Location: not available yet";
        }
        String time = time(System.currentTimeMillis(), cfg.optString("timeZone", "Asia/Kolkata"));
        Matcher m = Pattern.compile("\\{(\\w+)\\}").matcher(template);
        StringBuffer out = new StringBuffer();
        while (m.find()) {
            String k = m.group(1), v;
            if ("name".equals(k)) v = name;
            else if ("locline".equals(k)) v = locline;
            else if ("coords".equals(k)) v = coords;
            else if ("time".equals(k)) v = time;
            else if ("emergency".equals(k)) v = cfg.optString("emergencyNumber", "112");
            else if ("live".equals(k)) v = liveUrl != null ? "Live location: " + liveUrl + "\n" : "";
            else if (extras != null && extras.has(k)) v = extras.optString(k);
            else v = "";
            m.appendReplacement(out, Matcher.quoteReplacement(v));
        }
        m.appendTail(out);
        return out.toString().replaceAll("\n{2,}", "\n").trim();
    }

    static String time(long ms, String tz) {
        SimpleDateFormat f = new SimpleDateFormat("d MMM, h:mm a z", Locale.ENGLISH);
        f.setTimeZone(TimeZone.getTimeZone(tz));
        return f.format(new Date(ms));
    }

    static String template(JSONObject cfg, String key, String fallback) {
        JSONObject t = cfg.optJSONObject("templates");
        return t != null && t.has(key) ? t.optString(key) : fallback;
    }

    static final String DEFAULT_SOS = "SOS ALERT\n{name} may be in danger and needs help.\n{locline}\n{coords}\nTime: {time}\n{live}Please call {name} and call {emergency} if needed.\n- Shevolution";
}
