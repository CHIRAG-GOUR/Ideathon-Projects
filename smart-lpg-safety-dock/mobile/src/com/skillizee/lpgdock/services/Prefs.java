package com.skillizee.lpgdock.services;

import android.content.Context;
import android.content.SharedPreferences;

public final class Prefs {
    static SharedPreferences p(Context c) {
        return c.getSharedPreferences("lpgdock", Context.MODE_PRIVATE);
    }

    public static boolean muted(Context c) { return p(c).getBoolean("muted", false); }
    public static void muted(Context c, boolean v) { p(c).edit().putBoolean("muted", v).apply(); }
    public static boolean vibration(Context c) { return p(c).getBoolean("vibration", true); }
    public static void vibration(Context c, boolean v) { p(c).edit().putBoolean("vibration", v).apply(); }
    public static boolean reducedMotion(Context c) { return p(c).getBoolean("reducedMotion", false); }
    public static void reducedMotion(Context c, boolean v) { p(c).edit().putBoolean("reducedMotion", v).apply(); }
    /** auto | high | low */
    public static String quality(Context c) { return p(c).getString("quality", "auto"); }
    public static void quality(Context c, String v) { p(c).edit().putString("quality", v).apply(); }
    public static double speed(Context c) { return p(c).getFloat("speed", 1f); }
    public static void speed(Context c, double v) { p(c).edit().putFloat("speed", (float) v).apply(); }
    public static boolean autoSave(Context c) { return p(c).getBoolean("autoSave", true); }
    public static void autoSave(Context c, boolean v) { p(c).edit().putBoolean("autoSave", v).apply(); }
    public static String get(Context c, String k) { return p(c).getString(k, null); }
    public static void put(Context c, String k, String v) { p(c).edit().putString(k, v).apply(); }
}
