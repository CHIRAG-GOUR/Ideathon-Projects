package com.skillizee.lpgdock.services;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import com.skillizee.lpgdock.engine.Engine;
import com.skillizee.lpgdock.sim.SimController;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

/** Synthesised cues (no audio files). Sound is never the only signal — every cue has on-screen text too. */
public final class Sound {
    static final int RATE = 22050;
    static final Map<String, short[]> CACHE = new HashMap<>();
    final Context ctx;
    final Map<SimController, int[]> seen = new HashMap<>();

    public Sound(Context ctx) {
        this.ctx = ctx.getApplicationContext();
    }

    static short[] tones(double[][] notes, String wave, double gain) {
        int total = 0;
        for (double[] n : notes) total = Math.max(total, (int) ((n[2] + n[1]) * RATE));
        short[] pcm = new short[total + 100];
        for (double[] n : notes) {
            int start = (int) (n[2] * RATE), len = (int) (n[1] * RATE);
            double ph = 0;
            for (int i = 0; i < len; i++) {
                double f = n.length > 3 ? n[0] + (n[3] - n[0]) * i / len : n[0];
                ph += 2 * Math.PI * f / RATE;
                double v = "square".equals(wave) ? Math.signum(Math.sin(ph)) * 0.6 : Math.sin(ph);
                double env = Math.min(1, i / (0.012 * RATE)) * Math.min(1, (len - i) / (0.05 * RATE));
                pcm[start + i] += (short) (v * env * gain * 32767);
            }
        }
        return pcm;
    }

    static synchronized short[] cue(String k) {
        short[] c = CACHE.get(k);
        if (c != null) return c;
        switch (k) {
            case "warning": c = tones(new double[][] {{988, .16, 0}, {988, .16, .24}}, "square", .22); break;
            case "critical": c = tones(new double[][] {{1318, .12, 0}, {1046, .12, .14}}, "square", .25); break;
            case "isolated": c = tones(new double[][] {{523, .22, 0, 392}}, "tri", .35); break;
            case "contained": c = tones(new double[][] {{523, .16, 0}, {659, .16, .14}, {784, .3, .28}}, "sine", .35); break;
            case "notice": c = tones(new double[][] {{660, .12, 0}}, "sine", .25); break;
            case "click": c = tones(new double[][] {{880, .05, 0}}, "sine", .15); break;
            default: { // incident: filtered noise + low boom (cinematic, simulation only)
                int n = (int) (2.2 * RATE);
                c = new short[n];
                Random r = new Random(7);
                double lp = 0;
                for (int i = 0; i < n; i++) {
                    double env = Math.pow(1 - (double) i / n, 3);
                    double a = 0.02 + 0.3 * (1 - (double) i / n);
                    lp += a * ((r.nextDouble() * 2 - 1) - lp);
                    double boom = Math.sin(2 * Math.PI * (55 - 25.0 * i / n) * i / RATE) * Math.max(0, 1 - i / (1.4 * RATE));
                    c[i] = (short) (Math.max(-1, Math.min(1, lp * 1.6 * env + boom * 0.6)) * 32000);
                }
            }
        }
        CACHE.put(k, c);
        return c;
    }

    public void play(final String k) {
        if (Prefs.muted(ctx)) return;
        final short[] pcm = cue(k);
        new Thread(() -> {
            try {
                AudioTrack t = new AudioTrack.Builder()
                        .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
                        .setAudioFormat(new AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(RATE).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
                        .setBufferSizeInBytes(pcm.length * 2).setTransferMode(AudioTrack.MODE_STATIC).build();
                t.write(pcm, 0, pcm.length);
                t.play();
                Thread.sleep(pcm.length * 1000L / RATE + 100);
                t.release();
            } catch (Exception ignored) {
                // Audio unavailable: the simulation stays fully understandable visually.
            }
        }).start();
    }

    @SuppressWarnings("deprecation")
    void vibrate(long ms) {
        if (!Prefs.vibration(ctx)) return;
        Vibrator v = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
        if (v == null || !v.hasVibrator()) return;
        if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
        else v.vibrate(ms);
    }

    /** Plays cues for new engine events, and repeats the alarm while the dock's alarm is on. */
    public void watch(SimController c) {
        int[] st = seen.get(c);
        if (st == null) seen.put(c, st = new int[] {0, 0, c.sessionId.hashCode()});
        if (st[2] != c.sessionId.hashCode()) {
            st[0] = 0;
            st[1] = 0;
            st[2] = c.sessionId.hashCode();
        }
        Engine.State s = c.state;
        for (int i = st[0]; i < s.events.size(); i++) {
            String k = s.events.get(i).kind;
            switch (k) {
                case "warning": play("warning"); vibrate(250); break;
                case "critical": case "danger": play("critical"); vibrate(350); break;
                case "isolated": play("isolated"); break;
                case "contained": play("contained"); break;
                case "incident": play("incident"); vibrate(700); break;
                case "anomaly": case "leak_introduced": play("notice"); break;
                default:
            }
        }
        st[0] = s.events.size();
        int beat = (int) (s.t / ("critical".equals(s.alarm) ? 0.8 : 1.4));
        if (c.running && !"none".equals(s.alarm) && beat != st[1]) {
            st[1] = beat;
            play("critical".equals(s.alarm) ? "critical" : "warning");
        }
    }
}
