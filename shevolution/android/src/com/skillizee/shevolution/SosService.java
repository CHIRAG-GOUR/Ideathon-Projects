package com.skillizee.shevolution;

import android.Manifest;
import android.app.Notification;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * The emergency engine. Runs as a foreground service (persistent "sharing your location" notification) so an SOS
 * or Safe Trip keeps working with the screen locked or the app closed. Every task is independent: a failure in
 * SMS, GPS or sync never blocks the others.
 */
public class SosService extends Service {
    static final String ACTION_SOS = "sos", ACTION_END = "end", ACTION_SILENCE = "silence", ACTION_SYNC = "sync",
            ACTION_RETRY_SMS = "retry_sms", ACTION_TRIP = "trip", ACTION_STOP_TRIP = "stop_trip";
    static volatile boolean sirenPlaying;

    private Store store;
    private Handler main, bg;
    private HandlerThread thread;
    private LocationManager lm;
    private Location best, moveAnchor;
    private long moveAt, intervalMs, lastQueuedAt, lastTripPost;
    private boolean sosMode, tripMode, locating;
    private MediaPlayer player;
    private int savedAlarmVolume = -1;
    private PowerManager.WakeLock wake;
    private ConnectivityManager.NetworkCallback netCb;

    @Override
    public void onCreate() {
        super.onCreate();
        store = new Store(this);
        main = new Handler(Looper.getMainLooper());
        thread = new HandlerThread("shev-sync");
        thread.start();
        bg = new Handler(thread.getLooper());
        lm = getSystemService(LocationManager.class);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        JSONObject sos = store.get("sos");
        JSONObject trip = store.get("trip");
        goForeground(Sos.isActive(sos) || ACTION_SOS.equals(action));
        if (ACTION_SOS.equals(action) || (action == null && Sos.isActive(sos))) startSos(action == null);
        else if (ACTION_END.equals(action)) endSos(intent.getStringExtra("outcome"));
        else if (ACTION_SILENCE.equals(action)) stopSiren();
        else if (ACTION_SYNC.equals(action)) bg.post(syncTask);
        else if (ACTION_RETRY_SMS.equals(action)) retrySms(intent.getStringExtra("id"));
        else if (ACTION_TRIP.equals(action) || (action == null && trip != null && "trip".equals(trip.optString("kind")))) startTrip();
        else if (ACTION_STOP_TRIP.equals(action)) stopTrip();
        stopIfIdle();
        return START_STICKY;
    }

    // ------------------------------------------------------------------ foreground notification

    private void goForeground(boolean sos) {
        Notification n = Notifs.builder(this, Notifs.TRACKING)
                .setContentTitle(sos ? "SOS active" : "Safe Trip in progress")
                .setContentText("Shevolution is sharing your location")
                .setOngoing(true)
                .setContentIntent(Notifs.openApp(this, 10, null))
                .setCategory(Notification.CATEGORY_SERVICE)
                .build();
        boolean loc = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                startForeground(Notifs.ID_TRACKING, n, loc ? ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION : ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE);
            } else {
                startForeground(Notifs.ID_TRACKING, n);
            }
        } catch (RuntimeException e) {
            // Could not become a foreground service: the SOS still runs while the app is open.
        }
    }

    // ------------------------------------------------------------------ SOS

    private void startSos(boolean restarted) {
        sosMode = true;
        JSONObject sos = store.get("sos");
        if (sos == null) return;
        JSONObject settings = store.settings();
        if (wake == null) {
            wake = getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "shevolution:sos");
            wake.acquire(2 * 3600_000L);
        }
        if (!restarted) {
            // Local actions first, all in parallel with GPS: sound, vibration, SMS timer, sync.
            if (settings.optBoolean("sound", true)) startSiren();
            if (settings.optBoolean("vibration", true)) vibrate(Notifs.SOS_VIBRATION, 0);
            Events.emit("sos_activated", "sosId", sos.optString("sosId"), "startedAt", sos.optString("startedAt"), "contacts", contactList(sos));
        }
        startLocation();
        if (!sos.optBoolean("smsDispatched")) main.postDelayed(dispatchSms, 8000); // at most 8 s wait for a precise fix, then the best available
        int esc = settings.optInt("escalateAfterMin", 5);
        if (esc > 0 && !sos.optBoolean("escalated")) {
            long due = Store.parseIso(sos.optString("startedAt")) + esc * 60_000L - System.currentTimeMillis();
            main.postDelayed(escalate, Math.max(1000, due));
        }
        watchNetwork();
        bg.removeCallbacks(syncLoop);
        bg.post(syncLoop);
    }

    private static JSONArray contactList(JSONObject sos) {
        JSONArray out = new JSONArray();
        JSONArray ks = sos.optJSONArray("contacts");
        for (int i = 0; ks != null && i < ks.length(); i++) {
            JSONObject k = ks.optJSONObject(i);
            try {
                out.put(new JSONObject().put("id", k.optString("id")).put("name", k.optString("name")));
            } catch (JSONException ignored) {
            }
        }
        return out;
    }

    private final Runnable dispatchSms = new Runnable() {
        @Override
        public void run() {
            bg.post(doDispatch); // geocoding blocks; keep the main thread free
        }
    };

    private final Runnable doDispatch = new Runnable() {
        @Override
        public void run() {
            JSONObject sos;
            synchronized (Sos.LOCK) {
                sos = store.get("sos");
                if (!Sos.isActive(sos) || sos.optBoolean("smsDispatched")) return;
                try {
                    sos.put("smsDispatched", true);
                } catch (JSONException ignored) {
                }
                store.put("sos", sos);
            }
            JSONObject cfg = store.config();
            JSONObject loc = sos.optJSONObject("lastLocation");
            String area = loc == null ? null : Sms.area(SosService.this, loc.optDouble("latitude"), loc.optDouble("longitude"));
            JSONObject extras = new JSONObject();
            try {
                extras.put("area", area == null ? "" : area);
                synchronized (Sos.LOCK) {
                    JSONObject cur = store.get("sos");
                    if (cur != null) {
                        cur.put("area", area == null ? JSONObject.NULL : area);
                        store.put("sos", cur);
                    }
                }
            } catch (JSONException ignored) {
            }
            String origin = cfg.optString("origin", "https://shevolution.web.app");
            String tpl = Sms.template(cfg, "sos", Sms.DEFAULT_SOS);
            boolean direct = Sms.canSendDirect(SosService.this);
            List<String> composer = new ArrayList<>();
            List<String> composerIds = new ArrayList<>();
            JSONArray ks = sos.optJSONArray("contacts");
            for (int i = 0; ks != null && i < ks.length(); i++) {
                JSONObject k = ks.optJSONObject(i);
                if (!k.optBoolean("sms")) continue;
                String live = k.has("token") ? origin + "/e/" + k.optString("token") : null;
                if (direct) {
                    try {
                        Sms.send(SosService.this, k.optString("phone"), Sms.fill(tpl, cfg, loc, live, extras), "sos", k.optString("id"));
                    } catch (Exception e) {
                        Sos.setSms(SosService.this, k.optString("id"), "failed", "device", "could not send");
                    }
                } else {
                    composer.add(k.optString("phone"));
                    composerIds.add(k.optString("id"));
                }
            }
            if (!composer.isEmpty()) {
                // One message for everyone, so no personal live link in it.
                boolean opened = Sms.compose(SosService.this, composer.toArray(new String[0]), Sms.fill(tpl, cfg, loc, null, extras));
                for (String id : composerIds) Sos.setSms(SosService.this, id, opened ? "not_permitted" : "failed", "composer", opened ? null : "Messages app unavailable");
            }
            // WhatsApp to the primary contact, pre-filled from the user's own WhatsApp (they tap Send).
            if (composer.isEmpty()) {
                for (int i = 0; ks != null && i < ks.length(); i++) {
                    JSONObject k = ks.optJSONObject(i);
                    if (k.isNull("phone")) continue;
                    String live = k.has("token") ? origin + "/e/" + k.optString("token") : null;
                    boolean ok = Sms.whatsapp(SosService.this, k.optString("phone"), Sms.fill(tpl, cfg, loc, live, extras));
                    Events.emit("sos_whatsapp", "id", k.optString("id"), "name", k.optString("name"), "state", ok ? "queued" : "off");
                    break;
                }
            }
            main.postDelayed(autoCall, 1500);
            bg.post(syncTask);
        }
    };

    private void retrySms(final String id) {
        main.postDelayed(new Runnable() {
            @Override
            public void run() {
                JSONObject sos = store.get("sos");
                if (!Sos.isActive(sos) || !Sms.canSendDirect(SosService.this)) return;
                JSONObject cfg = store.config();
                JSONArray ks = sos.optJSONArray("contacts");
                for (int i = 0; ks != null && i < ks.length(); i++) {
                    JSONObject k = ks.optJSONObject(i);
                    if (!id.equals(k.optString("id"))) continue;
                    String live = k.has("token") ? cfg.optString("origin") + "/e/" + k.optString("token") : null;
                    Sos.setSms(SosService.this, id, "pending", "device", null);
                    try {
                        Sms.send(SosService.this, k.optString("phone"), Sms.fill(Sms.template(cfg, "sos", Sms.DEFAULT_SOS), cfg, sos.optJSONObject("lastLocation"), live, Sms.areaExtras(sos)), "sos", id);
                    } catch (Exception e) {
                        Sos.setSms(SosService.this, id, "failed", "device", "could not send");
                    }
                }
            }
        }, 20_000);
    }

    private final Runnable autoCall = new Runnable() {
        @Override
        public void run() {
            JSONObject s = store.settings();
            String num = s.isNull("autoCallNumber") ? null : s.optString("autoCallNumber", null);
            if (num == null || num.isEmpty() || checkSelfPermission(Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) return;
            try {
                startActivity(new Intent(Intent.ACTION_CALL, Uri.parse("tel:" + num)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            } catch (Exception ignored) {
                // Android may block calls started from the background; the SOS screen still offers "Call".
            }
        }
    };

    /** One escalation text if nobody has responded after the configured minutes. Never repeated. */
    private final Runnable escalate = new Runnable() {
        @Override
        public void run() {
            JSONObject sos = store.get("sos");
            if (!Sos.isActive(sos) || sos.optBoolean("escalated")) return;
            JSONArray resp = sos.optJSONArray("responders");
            if (resp != null && resp.length() > 0) return;
            try {
                sos.put("escalated", true);
            } catch (JSONException ignored) {
            }
            store.put("sos", sos);
            if (!Sms.canSendDirect(SosService.this)) return;
            JSONObject cfg = store.config();
            JSONArray ks = sos.optJSONArray("contacts");
            for (int i = 0; ks != null && i < ks.length(); i++) {
                JSONObject k = ks.optJSONObject(i);
                if (!k.optBoolean("sms")) continue;
                String live = k.has("token") ? cfg.optString("origin") + "/e/" + k.optString("token") : null;
                try {
                    Sms.send(SosService.this, k.optString("phone"), Sms.fill(Sms.template(cfg, "escalation", Sms.DEFAULT_SOS), cfg, sos.optJSONObject("lastLocation"), live, Sms.areaExtras(sos)), "escalation", k.optString("id"));
                } catch (Exception ignored) {
                }
            }
        }
    };

    private void endSos(String outcome) {
        final String out = "cancelled".equals(outcome) ? "cancelled" : "safe";
        JSONObject sos;
        synchronized (Sos.LOCK) {
            sos = store.get("sos");
            if (!Sos.isActive(sos)) return;
            try {
                sos.put("status", out).put("endedAt", Store.iso(System.currentTimeMillis()));
            } catch (JSONException ignored) {
            }
            store.put("sos", sos);
        }
        sosMode = false;
        stopSiren();
        stopVibration();
        main.removeCallbacks(dispatchSms);
        main.removeCallbacks(escalate);
        main.removeCallbacks(autoCall);
        bg.removeCallbacks(syncLoop);
        if (!tripMode) stopLocation();
        // Everyone this phone texted hears the outcome the same way.
        if (Sms.canSendDirect(this)) {
            JSONObject cfg = store.config();
            JSONArray ks = sos.optJSONArray("contacts");
            for (int i = 0; ks != null && i < ks.length(); i++) {
                JSONObject k = ks.optJSONObject(i);
                String st = k.optString("smsStatus");
                if (!"device".equals(k.optString("via")) || !("submitted".equals(st) || "delivered".equals(st))) continue;
                try {
                    JSONObject ex = new JSONObject().put("status", "safe".equals(out) ? "has marked themselves SAFE" : "cancelled the SOS");
                    Sms.send(this, k.optString("phone"), Sms.fill(Sms.template(cfg, "update", "{name} (Shevolution SOS) {status}.\nTime: {time}"), cfg, null, null, ex), "update", k.optString("id"));
                } catch (Exception ignored) {
                }
            }
        }
        Events.emit("sos_ended", "outcome", out);
        bg.post(new Runnable() {
            @Override
            public void run() {
                if (Sos.sync(SosService.this)) new Store(SosService.this).put("sos", null);
                else SyncJob.schedule(SosService.this);
                main.post(new Runnable() {
                    @Override
                    public void run() {
                        stopIfIdle();
                    }
                });
            }
        });
    }

    private final Runnable syncTask = new Runnable() {
        @Override
        public void run() {
            Sos.sync(SosService.this);
        }
    };

    private final Runnable syncLoop = new Runnable() {
        @Override
        public void run() {
            if (!sosMode) return;
            Sos.sync(SosService.this);
            bg.postDelayed(this, 15_000);
        }
    };

    private void watchNetwork() {
        if (netCb != null) return;
        final ConnectivityManager cm = getSystemService(ConnectivityManager.class);
        netCb = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(Network network) {
                Events.emit("network", "state", "online");
                bg.post(syncTask); // queued SOS data goes out the moment the network is back
            }

            @Override
            public void onLost(Network network) {
                Events.emit("network", "state", Net.state(SosService.this));
            }
        };
        try {
            cm.registerDefaultNetworkCallback(netCb);
        } catch (RuntimeException e) {
            netCb = null;
        }
    }

    // ------------------------------------------------------------------ siren & vibration

    private void startSiren() {
        try {
            AudioManager am = getSystemService(AudioManager.class);
            savedAlarmVolume = am.getStreamVolume(AudioManager.STREAM_ALARM);
            am.setStreamVolume(AudioManager.STREAM_ALARM, am.getStreamMaxVolume(AudioManager.STREAM_ALARM), 0);
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            AssetFileDescriptor fd = getAssets().openFd("audio/sos-alert.wav");
            player.setDataSource(fd.getFileDescriptor(), fd.getStartOffset(), fd.getLength());
            fd.close();
            player.setLooping(true);
            player.prepare();
            player.start();
            sirenPlaying = true;
            main.postDelayed(new Runnable() {
                @Override
                public void run() {
                    stopSiren(); // one minute of siren; silence it sooner from the SOS screen
                }
            }, 60_000);
        } catch (Exception e) {
            sirenPlaying = false;
        }
    }

    private void stopSiren() {
        sirenPlaying = false;
        if (player != null) {
            try {
                player.stop();
            } catch (Exception ignored) {
            }
            player.release();
            player = null;
        }
        if (savedAlarmVolume >= 0) {
            getSystemService(AudioManager.class).setStreamVolume(AudioManager.STREAM_ALARM, savedAlarmVolume, 0);
            savedAlarmVolume = -1;
        }
        stopVibration();
    }

    @SuppressWarnings("deprecation")
    private void vibrate(long[] pattern, int repeat) {
        Vibrator v = getSystemService(Vibrator.class);
        if (v == null || !v.hasVibrator()) return;
        if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(pattern, repeat));
        else v.vibrate(pattern, repeat);
        main.postDelayed(new Runnable() {
            @Override
            public void run() {
                stopVibration();
            }
        }, 30_000);
    }

    private void stopVibration() {
        Vibrator v = getSystemService(Vibrator.class);
        if (v != null) v.cancel();
    }

    // ------------------------------------------------------------------ location

    private final LocationListener listener = new LocationListener() {
        @Override
        public void onLocationChanged(Location l) {
            if (better(l)) accept(l, false);
        }

        @Override
        public void onProviderDisabled(String provider) {
        }

        @Override
        public void onProviderEnabled(String provider) {
        }

        @Override
        public void onStatusChanged(String provider, int status, Bundle extras) {
        }
    };

    private void startLocation() {
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
                && checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            locationFailed();
            return;
        }
        if (locating) return;
        locating = true;
        Location lk = null;
        for (String p : lm.getAllProviders()) {
            try {
                Location x = lm.getLastKnownLocation(p);
                if (x != null && (lk == null || x.getTime() > lk.getTime())) lk = x;
            } catch (SecurityException ignored) {
            }
        }
        if (lk != null) accept(lk, System.currentTimeMillis() - lk.getTime() > 120_000); // older than 2 min = "last known"
        request(3000); // lock quickly first…
        main.postDelayed(new Runnable() {
            @Override
            public void run() {
                request(baseInterval()); // …then the balanced interval
            }
        }, 60_000);
        main.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (best == null) locationFailed();
            }
        }, 45_000);
    }

    private long baseInterval() {
        int s = store.settings().optInt("trackingIntervalSec", 10);
        return (sosMode ? Math.max(5, s) : 30) * 1000L;
    }

    private void request(long ms) {
        if (!locating || ms == intervalMs) return;
        intervalMs = ms;
        try {
            lm.removeUpdates(listener);
            List<String> providers = new ArrayList<>();
            if (Build.VERSION.SDK_INT >= 31 && lm.hasProvider(LocationManager.FUSED_PROVIDER)) providers.add(LocationManager.FUSED_PROVIDER);
            providers.add(LocationManager.GPS_PROVIDER);
            providers.add(LocationManager.NETWORK_PROVIDER);
            for (String p : providers) {
                if (lm.getAllProviders().contains(p)) lm.requestLocationUpdates(p, ms, 0f, listener, Looper.getMainLooper());
            }
        } catch (SecurityException | IllegalArgumentException e) {
            locationFailed();
        }
    }

    private void stopLocation() {
        locating = false;
        intervalMs = 0;
        try {
            lm.removeUpdates(listener);
        } catch (Exception ignored) {
        }
    }

    private boolean better(Location l) {
        if (best == null) return true;
        long dt = l.getTime() - best.getTime();
        if (dt > 30_000) return true;
        if (dt < -5_000) return false;
        float a = l.hasAccuracy() ? l.getAccuracy() : 9999f, b = best.hasAccuracy() ? best.getAccuracy() : 9999f;
        return a <= b || (dt > 10_000 && a < b * 2);
    }

    private void locationFailed() {
        if (!sosMode) return;
        synchronized (Sos.LOCK) {
            JSONObject sos = store.get("sos");
            if (sos == null) return;
            try {
                sos.put("locationFailed", true);
            } catch (JSONException ignored) {
            }
            store.put("sos", sos);
        }
        Events.emit("sos_location_failed");
    }

    private void accept(Location l, boolean lastKnown) {
        long now = System.currentTimeMillis();
        best = l;
        JSONObject f = Store.fix(l, lastKnown);
        // Adaptive rate: slow down after two minutes without moving 25 m; speed up again when moving.
        if (moveAnchor == null || l.distanceTo(moveAnchor) > 25) {
            moveAnchor = l;
            moveAt = now;
        }
        if (intervalMs > 3000) request(now - moveAt > 120_000 ? Math.min(60_000, baseInterval() * 3) : baseInterval());

        if (sosMode) {
            boolean firstFresh;
            synchronized (Sos.LOCK) {
                JSONObject sos = store.get("sos");
                if (!Sos.isActive(sos)) return;
                firstFresh = !lastKnown && l.hasAccuracy() && l.getAccuracy() <= 25 && !sos.optBoolean("smsDispatched");
                try {
                    sos.put("lastLocation", f).put("locationFailed", false);
                } catch (JSONException ignored) {
                }
                store.put("sos", sos);
                if (!lastKnown && now - lastQueuedAt > Math.max(2000, intervalMs * 8 / 10)) {
                    JSONArray q = store.getArray("sosQueue");
                    q.put(f);
                    store.putArray("sosQueue", q);
                    lastQueuedAt = now;
                }
            }
            Events.emit("sos_location", "location", f);
            if (firstFresh) {
                main.removeCallbacks(dispatchSms);
                main.post(dispatchSms); // a precise fix arrived: text the circle right away
            }
        }
        if (tripMode && !lastKnown) onTripFix(l, f, now);
    }

    // ------------------------------------------------------------------ Safe Trip

    private void startTrip() {
        tripMode = true;
        startLocation();
    }

    private void stopTrip() {
        tripMode = false;
        if (!sosMode) stopLocation();
    }

    private void onTripFix(Location l, final JSONObject f, long now) {
        final JSONObject trip = store.get("trip");
        if (trip == null) return;
        try {
            trip.put("lastLocation", f); // used for the overdue text, even offline
        } catch (JSONException ignored) {
        }
        store.put("trip", trip);
        JSONObject d = trip.optJSONObject("destination");
        if (d != null && !trip.optBoolean("arrivedNotified")) {
            float[] r = new float[1];
            Location.distanceBetween(l.getLatitude(), l.getLongitude(), d.optDouble("latitude"), d.optDouble("longitude"), r);
            if (r[0] < 150) {
                try {
                    trip.put("arrivedNotified", true);
                } catch (JSONException ignored) {
                }
                store.put("trip", trip);
                Trips.notifyArrived(this, trip);
                Events.emit("trip_arrived", "tripId", trip.optString("tripId"));
            }
        }
        if (now - lastTripPost > 60_000) {
            lastTripPost = now;
            bg.post(new Runnable() {
                @Override
                public void run() {
                    try {
                        Net.post(store, "/trips/location", new JSONObject().put("tripId", trip.optString("tripId")).put("location", f));
                    } catch (JSONException ignored) {
                    }
                }
            });
        }
    }

    // ------------------------------------------------------------------ lifecycle

    private void stopIfIdle() {
        if (sosMode || tripMode || Sos.isActive(store.get("sos"))) return;
        stopLocation();
        if (netCb != null) {
            try {
                getSystemService(ConnectivityManager.class).unregisterNetworkCallback(netCb);
            } catch (Exception ignored) {
            }
            netCb = null;
        }
        if (wake != null && wake.isHeld()) wake.release();
        wake = null;
        if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf(); // the location notification disappears the moment sharing ends
    }

    @Override
    public void onTimeout(int startId) {
        // shortService limit (no location permission): SMS and sync have long finished; the SyncJob delivers the rest.
        SyncJob.schedule(this);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        stopSiren();
        stopLocation();
        thread.quitSafely();
        if (wake != null && wake.isHeld()) wake.release();
        super.onDestroy();
    }
}
