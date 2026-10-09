package com.skillizee.shevolution;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** Connectivity state and the authenticated calls the safety layer makes to the Shevolution API. */
final class Net {
    static String state(Context c) {
        ConnectivityManager cm = c.getSystemService(ConnectivityManager.class);
        Network n = cm.getActiveNetwork();
        NetworkCapabilities cap = n == null ? null : cm.getNetworkCapabilities(n);
        if (cap == null || !cap.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) return "offline";
        if (!cap.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) || cap.getLinkDownstreamBandwidthKbps() < 150) return "weak";
        return "online";
    }

    static final class Result {
        final int code;
        final JSONObject body;

        Result(int code, JSONObject body) {
            this.code = code;
            this.body = body;
        }

        boolean ok() {
            return code >= 200 && code < 300;
        }
    }

    /** POST JSON with the device key. Returns code -1 when there is no connection. Blocking: call off the main thread. */
    static Result post(Store store, String path, JSONObject payload) {
        JSONObject dev = store.get("device");
        if (dev == null) return new Result(-2, null);
        HttpURLConnection h = null;
        try {
            h = (HttpURLConnection) new URL(dev.optString("apiBase") + "/api" + path).openConnection();
            h.setConnectTimeout(10_000);
            h.setReadTimeout(20_000);
            h.setRequestMethod("POST");
            h.setDoOutput(true);
            h.setRequestProperty("Content-Type", "application/json");
            h.setRequestProperty("X-Device-Id", dev.optString("deviceId"));
            h.setRequestProperty("X-Device-Key", dev.optString("deviceKey"));
            OutputStream os = h.getOutputStream();
            os.write(payload.toString().getBytes("UTF-8"));
            os.close();
            int code = h.getResponseCode();
            InputStream is = code < 400 ? h.getInputStream() : h.getErrorStream();
            JSONObject body = null;
            if (is != null) {
                ByteArrayOutputStream bo = new ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int r;
                while ((r = is.read(buf)) > 0) bo.write(buf, 0, r);
                try {
                    body = new JSONObject(bo.toString("UTF-8"));
                } catch (Exception ignored) {
                }
            }
            return new Result(code, body);
        } catch (Exception e) {
            return new Result(-1, null);
        } finally {
            if (h != null) h.disconnect();
        }
    }
}
