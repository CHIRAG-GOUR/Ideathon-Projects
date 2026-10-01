package @PKG@;

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
 * The emergency engine, as a foreground service with a visible notification whenever it runs:
 *  • SOS — siren, vibration, GPS, SIM SMS, WhatsApp, sync, escalation.
 *  • Standby — keeps a fresh GPS fix ready (She Shield "Shield Mode").
 *  • Checks — keeps periodic safety checks running and the last known location current.
 * Every task is independent: a failure in SMS, GPS or sync never blocks the others.
 */
public class SosService extends Service {
    static final String ACTION_SOS = "sos", ACTION_END = "end", ACTION_SILENCE = "silence", ACTION_SYNC = "sync", ACTION_RETRY_SMS = "retry_sms",
            ACTION_STANDBY_ON = "standby_on", ACTION_STANDBY_OFF = "standby_off", ACTION_CHECKS_ON = "checks_on", ACTION_CHECKS_OFF = "checks_off";
    static volatile boolean sirenPlaying;

    private Store store;
    private Handler main, bg;
    private HandlerThread thread;
    private LocationManager lm;
    private Location best, moveAnchor;
    private long moveAt, intervalMs, lastQueuedAt;
    private boolean sosMode, standbyMode, checkMode, locating;
    private MediaPlayer player;
    private int savedAlarmVolume = -1;
    private PowerManager.WakeLock wake;
    private ConnectivityManager.NetworkCallback netCb;

    @Override
    public void onCreate() {
        super.onCreate();
        store = new Store(this);
        main = new Handler(Looper.getMainLooper());
        thread = new HandlerThread("safety-sync");
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
        String a = intent == null ? null : intent.getAction();
        JSONObject sos = store.get("sos");
        boolean restart = a == null;
        if (ACTION_SOS.equals(a) || (restart && Sos.isActive(sos))) sosMode = true;
        if (ACTION_STANDBY_ON.equals(a) || (restart && "1".equals(store.getString("standby")))) standbyMode = true;
        if (ACTION_STANDBY_OFF.equals(a)) standbyMode = false;
        if (ACTION_CHECKS_ON.equals(a) || (restart && Checks.active(this))) checkMode = true;
        if (ACTION_CHECKS_OFF.equals(a)) checkMode = false;
        goForeground();

        if (ACTION_SOS.equals(a) || (restart && Sos.isActive(sos))) startSos(restart);
        else if (ACTION_END.equals(a)) endSos(intent.getStringExtra("outcome"));
        else if (ACTION_SILENCE.equals(a)) stopSiren();
        else if (ACTION_SYNC.equals(a)) bg.post(syncTask);
        else if (ACTION_RETRY_SMS.equals(a)) retrySms(intent.getStringExtra("id"));
        if (standbyMode || checkMode) startLocation();
        stopIfIdle();
        return START_STICKY;
    }

    // ------------------------------------------------------------------ foreground notification

    private void goForeground() {
        JSONObject sos = store.get("sos");
        boolean discreet = sosMode && sos != null && "discreet".equals(sos.optString("trigger"));
        String title, text;
        if (sosMode && !discreet) {
            title = "SOS active";
            text = Flavor.APP_NAME + " is sharing your location with your contacts";
        } else if (sosMode) {
            title = Flavor.APP_NAME;
            text = "Location sharing active";
        } else if (standbyMode) {
            title = store.config().optString("standbyTitle", "Protection on");
            text = "Location kept ready — SOS is one hold away";
        } else {
            title = "Safety checks on";
            text = Checks.summary(this);
        }
        Notification.Builder b = Notifs.builder(this, Notifs.TRACKING).setContentTitle(title).setContentText(text).setOngoing(true)
                .setContentIntent(Notifs.openApp(this, 10, null)).setCategory(Notification.CATEGORY_SERVICE);
        if (sosMode && sirenPlaying) b.addAction(new Notification.Action.Builder(null, "Mute siren", Notifs.action(this, 101, AlarmReceiver.ACTION_SILENCE)).build());
        boolean loc = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        try {
            if (Build.VERSION.SDK_INT >= 34) startForeground(Notifs.ID_TRACKING, b.build(), loc ? ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION : ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE);
            else startForeground(Notifs.ID_TRACKING, b.build());
        } catch (RuntimeException e) {
            // Could not become a foreground service: the SOS still runs while the app is open.
        }
    }

    // ------------------------------------------------------------------ SOS

    private void startSos(boolean restarted) {
        JSONObject sos = store.get("sos");
        if (sos == null) return;
        boolean discreet = "discreet".equals(sos.optString("trigger"));
        JSONObject settings = store.settings();
        if (wake == null) {
            wake = getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, Flavor.APP_ID + ":sos");
            wake.acquire(2 * 3600_000L);
        }
        if (!restarted) {
            if (!discreet && settings.optBoolean("sound", true)) startSiren();
            if (settings.optBoolean("vibration", true)) vibrate(discreet ? new long[]{0, 120} : Notifs.SOS_VIBRATION, discreet ? -1 : 0);
            Events.emit("sos_activated", "sosId", sos.optString("sosId"), "startedAt", sos.optString("startedAt"), "contacts", contactList(sos), "trigger", sos.optString("trigger"));
        }
        // A fix kept warm by standby/checks is used immediately (labelled last known if older than 2 min).
        String warm = store.getString("lastFix");
        if (warm != null && sos.isNull("lastLocation")) {
            try {
                JSONObject f = new JSONObject(warm);
                if (System.currentTimeMillis() - Store.parseIso(f.optString("timestamp")) > 120_000) f.put("lastKnown", true);
                setLocation(f, !f.optBoolean("lastKnown"));
            } catch (JSONException ignored) {
            }
        }
        startLocation();
        if (!sos.optBoolean("smsDispatched")) main.postDelayed(dispatchSms, 3000); // ≤3 s for a precise fix, then the best available
        int esc = settings.optInt("escalateAfterMin", 5);
        if (esc > 0 && !sos.optBoolean("escalated")) {
            long due = Store.parseIso(sos.optString("startedAt")) + esc * 60_000L - System.currentTimeMillis();
            main.postDelayed(escalate, Math.max(1000, due));
        }
        watchNetwork();
        bg.removeCallbacks(syncLoop);
        bg.post(syncTask);
        bg.postDelayed(syncLoop, 15_000);
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

    private String templateKey(JSONObject sos) {
        String t = sos.optString("trigger", "sos");
        return "discreet".equals(t) ? "discreet" : "check".equals(t) ? "check" : "sos";
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
            if (area != null) {
                synchronized (Sos.LOCK) {
                    JSONObject cur = store.get("sos");
                    try {
                        if (cur != null) cur.put("area", area);
                    } catch (JSONException ignored) {
                    }
                    store.put("sos", cur);
                }
            }
            JSONObject extras = Sms.extras(area, "label", Checks.label(SosService.this), "due", Checks.dueText(SosService.this));
            String tpl = Sms.template(cfg, templateKey(sos));
            boolean direct = Sms.canSendDirect(SosService.this);
            boolean discreet = "discreet".equals(sos.optString("trigger"));
            List<String> composer = new ArrayList<>(), composerIds = new ArrayList<>();
            JSONArray ks = sos.optJSONArray("contacts");
            for (int i = 0; ks != null && i < ks.length(); i++) {
                JSONObject k = ks.optJSONObject(i);
                if (!k.optBoolean("sms")) continue;
                String text = Sms.fill(tpl, cfg, loc, Sms.liveUrl(cfg, k.optString("token", null)), extras);
                if (direct) {
                    try {
                        Sms.send(SosService.this, k.optString("phone"), text, "sos", k.optString("id"));
                    } catch (Exception e) {
                        Sos.setSms(SosService.this, k.optString("id"), "failed", "device", "could not send");
                    }
                } else {
                    composer.add(k.optString("phone"));
                    composerIds.add(k.optString("id"));
                }
            }
            if (!composer.isEmpty() && !discreet) {
                boolean opened = Sms.compose(SosService.this, composer.toArray(new String[0]), Sms.fill(tpl, cfg, loc, null, extras));
                for (String id : composerIds) Sos.setSms(SosService.this, id, opened ? "not_permitted" : "failed", "composer", opened ? null : "Messages app unavailable");
            } else if (!composer.isEmpty()) {
                for (String id : composerIds) Sos.setSms(SosService.this, id, "failed", "device", "SMS permission off");
            }
            // WhatsApp to the primary contact, from the user's own WhatsApp (they tap Send). Not in a discreet alert.
            if (!discreet && composer.isEmpty()) {
                JSONObject pick = null;
                for (int i = 0; ks != null && i < ks.length(); i++) {
                    JSONObject k = ks.optJSONObject(i);
                    if (!k.optBoolean("whatsapp")) continue;
                    if (pick == null || "primary".equals(k.optString("role"))) pick = k;
                    if ("primary".equals(k.optString("role"))) break;
                }
                if (pick != null) {
                    final JSONObject p = pick;
                    final String text = Sms.fill(tpl, cfg, loc, Sms.liveUrl(cfg, p.optString("token", null)), extras);
                    main.post(new Runnable() {
                        @Override
                        public void run() {
                            boolean ok = Sms.whatsapp(SosService.this, p.optString("phone"), text);
                            Events.emit("sos_whatsapp", "id", p.optString("id"), "name", p.optString("name"), "state", ok ? "queued" : "failed");
                        }
                    });
                }
            }
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
                    Sos.setSms(SosService.this, id, "pending", "device", null);
                    try {
                        Sms.send(SosService.this, k.optString("phone"), Sms.fill(Sms.template(cfg, templateKey(sos)), cfg, sos.optJSONObject("lastLocation"), Sms.liveUrl(cfg, k.optString("token", null)), Sms.extras(sos.optString("area", ""), null, null, null, null)), "sos", id);
                    } catch (Exception e) {
                        Sos.setSms(SosService.this, id, "failed", "device", "could not send");
                    }
                }
            }
        }, 20_000);
    }

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
                try {
                    Sms.send(SosService.this, k.optString("phone"), Sms.fill(Sms.template(cfg, "escalation"), cfg, sos.optJSONObject("lastLocation"), Sms.liveUrl(cfg, k.optString("token", null)), Sms.extras(sos.optString("area", ""), null, null, null, null)), "escalation", k.optString("id"));
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
        main.removeCallbacks(dispatchSms);
        main.removeCallbacks(escalate);
        bg.removeCallbacks(syncLoop);
        if (!standbyMode && !checkMode) stopLocation();
        if (Sms.canSendDirect(this)) {
            JSONObject cfg = store.config();
            JSONArray ks = sos.optJSONArray("contacts");
            for (int i = 0; ks != null && i < ks.length(); i++) {
                JSONObject k = ks.optJSONObject(i);
                String st = k.optString("smsStatus");
                if (!"device".equals(k.optString("via")) || !("submitted".equals(st) || "delivered".equals(st))) continue;
                try {
                    Sms.send(this, k.optString("phone"), Sms.fill(Sms.template(cfg, "update"), cfg, null, null, Sms.extras(null, "status", "safe".equals(out) ? "is SAFE now" : "cancelled the SOS", null, null)), "update", k.optString("id"));
                } catch (Exception ignored) {
                }
            }
        }
        Events.emit("sos_ended", "outcome", out);
        goForeground();
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
            getSystemService(ConnectivityManager.class).registerDefaultNetworkCallback(netCb);
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
                    stopSiren();
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
        Vibrator v = getSystemService(Vibrator.class);
        if (v != null) v.cancel();
    }

    @SuppressWarnings("deprecation")
    private void vibrate(long[] pattern, int repeat) {
        Vibrator v = getSystemService(Vibrator.class);
        if (v == null || !v.hasVibrator()) return;
        if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(pattern, repeat));
        else v.vibrate(pattern, repeat);
        if (repeat >= 0) main.postDelayed(new Runnable() {
            @Override
            public void run() {
                Vibrator x = getSystemService(Vibrator.class);
                if (x != null) x.cancel();
            }
        }, 30_000);
    }

    // ------------------------------------------------------------------ location

    private final LocationListener listener = new LocationListener() {
        @Override
        public void onLocationChanged(Location l) {
            if (better(l)) accept(l);
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

    private boolean hasLocationPermission() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void startLocation() {
        if (!hasLocationPermission()) {
            locationFailed();
            return;
        }
        if (locating) {
            request(baseInterval());
            return;
        }
        locating = true;
        request(sosMode ? 2000 : baseInterval());
        if (sosMode) {
            main.postDelayed(new Runnable() {
                @Override
                public void run() {
                    request(baseInterval());
                }
            }, 60_000);
            main.postDelayed(new Runnable() {
                @Override
                public void run() {
                    JSONObject s = store.get("sos");
                    if (Sos.isActive(s) && s.isNull("lastLocation")) locationFailed();
                }
            }, 30_000);
        }
    }

    /** SOS: the user's tracking setting (5–30 s). Standby: 30 s. Checks only: 2 min. */
    private long baseInterval() {
        if (sosMode) return Math.max(5, store.settings().optInt("trackingIntervalSec", 10)) * 1000L;
        return standbyMode ? 30_000L : 120_000L;
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
            for (String p : providers) if (lm.getAllProviders().contains(p)) lm.requestLocationUpdates(p, ms, 0f, listener, Looper.getMainLooper());
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

    private void accept(Location l) {
        long now = System.currentTimeMillis();
        best = l;
        JSONObject f = Store.fix(l, false);
        store.putString("lastFix", f.toString()); // last known location for checks and the next SOS
        if (moveAnchor == null || l.distanceTo(moveAnchor) > 25) {
            moveAnchor = l;
            moveAt = now;
        }
        if (sosMode && intervalMs > 2000) request(now - moveAt > 120_000 ? Math.min(60_000, baseInterval() * 3) : baseInterval());
        if (sosMode) setLocation(f, l.hasAccuracy() && l.getAccuracy() <= 25);
    }

    private void setLocation(JSONObject f, boolean precise) {
        long now = System.currentTimeMillis();
        boolean dispatchNow;
        synchronized (Sos.LOCK) {
            JSONObject sos = store.get("sos");
            if (!Sos.isActive(sos)) return;
            dispatchNow = precise && !sos.optBoolean("smsDispatched");
            try {
                sos.put("lastLocation", f).put("locationFailed", false);
            } catch (JSONException ignored) {
            }
            store.put("sos", sos);
            if (!f.optBoolean("lastKnown") && now - lastQueuedAt > Math.max(2000, intervalMs * 8 / 10)) {
                JSONArray q = store.getArray("sosQueue");
                q.put(f);
                store.putArray("sosQueue", q);
                lastQueuedAt = now;
            }
        }
        Events.emit("sos_location", "location", f);
        if (dispatchNow) {
            main.removeCallbacks(dispatchSms);
            main.post(dispatchSms); // a precise fix arrived: text the circle right away
        }
    }

    // ------------------------------------------------------------------ lifecycle

    private void stopIfIdle() {
        if (Sos.isActive(store.get("sos"))) sosMode = true;
        if (sosMode || standbyMode || checkMode) {
            goForeground();
            return;
        }
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
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf(); // the location notification disappears the moment sharing ends
    }

    @Override
    public void onTimeout(int startId) {
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
