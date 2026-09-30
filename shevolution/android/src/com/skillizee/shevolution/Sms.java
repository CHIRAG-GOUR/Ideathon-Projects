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

    /** Opens the user's own WhatsApp chat with this number, message pre-filled. */
    static boolean whatsapp(Context c, String phone, String text) {
        if (text == null) text = "";
        if (phone != null && !phone.trim().isEmpty()) {
            String digits = phone.replaceAll("[^0-9]", "");
            if (digits.length() == 10) digits = "91" + digits;
            else if (digits.length() == 11 && digits.startsWith("0")) digits = "91" + digits.substring(1);
            
            // 1. Direct whatsapp scheme intent
            Uri waDirect = Uri.parse("whatsapp://send?phone=" + digits + "&text=" + Uri.encode(text));
            for (String pkg : new String[]{"com.whatsapp", "com.whatsapp.w4b"}) {
                try {
                    c.startActivity(new Intent(Intent.ACTION_VIEW, waDirect).setPackage(pkg).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                    return true;
                } catch (Exception ignored) {
                }
            }
            try {
                c.startActivity(new Intent(Intent.ACTION_VIEW, waDirect).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                return true;
            } catch (Exception ignored) {
            }

            // 2. Fallback to https://api.whatsapp.com
            Uri u = Uri.parse("https://api.whatsapp.com/send?phone=" + digits + "&text=" + Uri.encode(text));
            for (String pkg : new String[]{"com.whatsapp", "com.whatsapp.w4b"}) {
                try {
                    c.startActivity(new Intent(Intent.ACTION_VIEW, u).setPackage(pkg).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                    return true;
                } catch (Exception ignored) {
                }
            }
            try {
                c.startActivity(new Intent(Intent.ACTION_VIEW, u).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                return true;
            } catch (Exception ignored) {
            }
        }
        // Generic WhatsApp share
        Intent sendIntent = new Intent(Intent.ACTION_SEND);
        sendIntent.setType("text/plain");
        sendIntent.putExtra(Intent.EXTRA_TEXT, text);
        for (String pkg : new String[]{"com.whatsapp", "com.whatsapp.w4b"}) {
            try {
                c.startActivity(sendIntent.setPackage(pkg).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                return true;
            } catch (Exception ignored) {
            }
        }
        try {
            c.startActivity(Intent.createChooser(sendIntent, "Share SOS via").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            return true;
        } catch (Exception ignored) {
        }
        return false;
    }

    /** The user's own email app, addressed to the contacts, pre-filled. */
    static boolean email(Context c, String[] to, String subject, String body) {
        Intent i = new Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:"));
        if (to != null && to.length > 0) i.putExtra(Intent.EXTRA_EMAIL, to);
        i.putExtra(Intent.EXTRA_SUBJECT, subject);
        i.putExtra(Intent.EXTRA_TEXT, body);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            c.startActivity(i);
            return true;
        } catch (Exception e) {
            try {
                Intent alt = new Intent(Intent.ACTION_SEND);
                alt.setType("message/rfc822");
                if (to != null && to.length > 0) alt.putExtra(Intent.EXTRA_EMAIL, to);
                alt.putExtra(Intent.EXTRA_SUBJECT, subject);
                alt.putExtra(Intent.EXTRA_TEXT, body);
                c.startActivity(Intent.createChooser(alt, "Send email").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                return true;
            } catch (Exception ignored) {
                return false;
            }
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
            locline = "\uD83D\uDDFA\uFE0F Google Maps Location: https://maps.google.com/?q=" + coord(la) + "," + coord(lo);
            coords = "\uD83D\uDCCD GPS Live Coordinates: " + coord(la) + ", " + coord(lo) + " (" + (loc.isNull("accuracy") ? "unknown" : "±" + Math.round(loc.optDouble("accuracy")) + " m") + ")";
        } else {
            locline = "\uD83D\uDDFA\uFE0F Google Maps Location: not available yet";
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
            else if ("live".equals(k)) v = liveUrl != null ? "\uD83D\uDD34 Live Moving Map Tracker: " + liveUrl + "\n" : "";
            else if ("area".equals(k)) v = extras != null && extras.optString("area").length() > 0 ? "\uD83D\uDCCD Area: " + extras.optString("area") : "";
            else if (extras != null && extras.has(k)) v = extras.optString(k);
            else v = "";
            m.appendReplacement(out, Matcher.quoteReplacement(v));
        }
        m.appendTail(out);
        return out.toString().replaceAll("\n{3,}", "\n\n").trim();
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

    static String liveTrackingUrl(String origin, JSONObject sos, JSONObject loc, String token, JSONObject cfg) {
        if (origin == null || origin.trim().isEmpty()) origin = "https://shevolution-ideathon.web.app";
        String sosId = sos != null ? sos.optString("sosId", "sos") : "sos";
        String name = cfg != null ? cfg.optString("userName", "Shevolution User") : "Shevolution User";

        if (loc != null && !loc.isNull("latitude") && !loc.isNull("longitude")) {
            double la = loc.optDouble("latitude", 0);
            double lo = loc.optDouble("longitude", 0);
            if (la != 0 || lo != 0) {
                StringBuilder sb = new StringBuilder(origin);
                sb.append("/trip?id=").append(Uri.encode(sosId.length() > 10 ? sosId.substring(0, 10) : sosId));
                sb.append("&p=").append(coord(la)).append(",").append(coord(lo));
                sb.append("&n=").append(Uri.encode(name));
                sb.append("&sos=1");
                if (sos != null && !sos.isNull("area") && !sos.optString("area").trim().isEmpty()) {
                    sb.append("&pn=").append(Uri.encode(sos.optString("area")));
                }
                return sb.toString();
            }
        }
        if (token != null && !token.trim().isEmpty()) {
            return origin + "/trip?id=" + Uri.encode(token) + "&n=" + Uri.encode(name) + "&sos=1";
        }
        return origin + "/trip?id=" + Uri.encode(sosId) + "&n=" + Uri.encode(name) + "&sos=1";
    }

    static final String DEFAULT_SOS = "\uD83C\uDD98 SOS! I NEED HELP NOW!\n{name} is in DANGER and needs IMMEDIATE HELP.\n\n{locline}\n{coords}\n{area}\n{live}\uD83D\uDD52 Time: {time}\n\uD83D\uDCDE Call me NOW. If I don't answer, call {emergency} and rush to this location.\n- Shevolution SOS";
}
