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

    /** Approximate address from Android's geocoder (needs internet on most phones); null when unavailable. Max 3 s. */
    static String area(Context c, final double lat, final double lng) {
        if (!android.location.Geocoder.isPresent()) return null;
        final android.location.Geocoder g = new android.location.Geocoder(c, Locale.ENGLISH);
        final String[] out = {null};
        Thread t = new Thread(new Runnable() {
            @Override
            @SuppressWarnings("deprecation")
            public void run() {
                try {
                    java.util.List<android.location.Address> a = g.getFromLocation(lat, lng, 1);
                    if (a != null && !a.isEmpty()) out[0] = a.get(0).getAddressLine(0);
                } catch (Exception ignored) {
                }
            }
        });
        t.start();
        try {
            t.join(3000);
        } catch (InterruptedException ignored) {
        }
        return out[0];
    }

    /** Opens the user's own WhatsApp chat with this number, message pre-filled. WhatsApp requires the user to tap Send. */
    static boolean whatsapp(Context c, String phone, String text) {
        String digits = phone.replaceAll("[^0-9]", "");
        Uri u = Uri.parse("https://api.whatsapp.com/send?phone=" + digits + "&text=" + Uri.encode(text));
        for (String pkg : new String[]{"com.whatsapp", "com.whatsapp.w4b"}) {
            try {
                c.startActivity(new Intent(Intent.ACTION_VIEW, u).setPackage(pkg).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                return true;
            } catch (Exception ignored) {
            }
        }
        return false;
    }

    /** The user's own email app, addressed to the contacts, pre-filled. */
    static boolean email(Context c, String[] to, String subject, String body) {
        Intent i = new Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:")).putExtra(Intent.EXTRA_EMAIL, to)
                .putExtra(Intent.EXTRA_SUBJECT, subject).putExtra(Intent.EXTRA_TEXT, body).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
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
            locline = "\uD83D\uDCCD " + (loc.optBoolean("lastKnown") ? "Last known location" : "Location") + ": https://maps.google.com/?q=" + coord(la) + "," + coord(lo);
            coords = "Lat " + coord(la) + " Lng " + coord(lo) + " (" + (loc.isNull("accuracy") ? "unknown" : "±" + Math.round(loc.optDouble("accuracy")) + " m") + ")";
        } else {
            locline = "\uD83D\uDCCD Location: not available yet";
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
            else if ("area".equals(k)) v = extras != null && extras.optString("area").length() > 0 ? "\uD83C\uDFE0 Area (approx.): " + extras.optString("area") : "";
            else if (extras != null && extras.has(k)) v = extras.optString(k);
            else v = "";
            m.appendReplacement(out, Matcher.quoteReplacement(v));
        }
        m.appendTail(out);
        return out.toString().replaceAll("\n{2,}", "\n").trim();
    }

    static JSONObject areaExtras(JSONObject sos) {
        JSONObject o = new JSONObject();
        try {
            o.put("area", sos == null || sos.isNull("area") ? "" : sos.optString("area", ""));
        } catch (org.json.JSONException ignored) {
        }
        return o;
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

    static final String DEFAULT_SOS = "\uD83C\uDD98 SOS! I NEED HELP!\n{name} is in DANGER and needs help NOW.\n{locline}\n{coords}\n{area}\n\uD83D\uDD52 Time: {time}\n{live}\uD83D\uDCDE Call me NOW. If I don't answer, call {emergency} and come to this location.\n- Shevolution SOS";
}
