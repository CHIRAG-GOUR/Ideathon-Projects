package com.skillizee.lpgdock.ui;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.RippleDrawable;
import android.content.res.ColorStateList;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Design tokens + small view builders (LPG blue, cream, graphite; orange/red only for real warning/danger states). */
public final class Ui {
    public static final int LPG = 0xFF2563B0, LPG_DARK = 0xFF1D4F91, LPG_DEEP = 0xFF142F55, LPG_50 = 0xFFEEF4FB, LPG_100 = 0xFFD7E6F6;
    public static final int CREAM = 0xFFFBF7F0, CREAM_100 = 0xFFF5EEE2, LINE = 0xFFE6DFD2, WHITE = 0xFFFFFFFF;
    public static final int INK = 0xFF1F2733, INK_SOFT = 0xFF3B4656, INK_MUTED = 0xFF5E6977, INK_FAINT = 0xFF98A1AD;
    public static final int OK = 0xFF167A45, OK_BG = 0xFFE9F7EF, WARN = 0xFFC25E05, WARN_BG = 0xFFFFF4E8, DANGER = 0xFFB42318, DANGER_BG = 0xFFFDEDEC;
    public static final int ORANGE = 0xFFE8730C, RED = 0xFFD92D20, GREEN = 0xFF1E9A58, BURNT = 0xFFC2410C;

    public static Context ctx;

    public static int dp(float v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, ctx.getResources().getDisplayMetrics());
    }

    public static TextView text(String s, float sp, int color, boolean bold) {
        TextView t = new TextView(ctx);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        t.setTypeface(Typeface.create(bold ? "sans-serif-medium" : "sans-serif", bold ? Typeface.BOLD : Typeface.NORMAL));
        return t;
    }

    public static TextView mono(String s, float sp, int color) {
        TextView t = text(s, sp, color, true);
        t.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
        return t;
    }

    public static TextView kicker(String s) {
        TextView t = mono(s.toUpperCase(), 11, INK_MUTED);
        t.setLetterSpacing(0.12f);
        return t;
    }

    public static GradientDrawable round(int fill, float radiusDp, int stroke) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(fill);
        d.setCornerRadius(dp(radiusDp));
        if (stroke != 0) d.setStroke(dp(1), stroke);
        return d;
    }

    public static LinearLayout col() {
        LinearLayout l = new LinearLayout(ctx);
        l.setOrientation(LinearLayout.VERTICAL);
        return l;
    }

    public static LinearLayout row() {
        LinearLayout l = new LinearLayout(ctx);
        l.setOrientation(LinearLayout.HORIZONTAL);
        l.setGravity(Gravity.CENTER_VERTICAL);
        return l;
    }

    public static LinearLayout card() {
        LinearLayout l = col();
        l.setBackground(round(WHITE, 16, LINE));
        l.setPadding(dp(14), dp(14), dp(14), dp(14));
        l.setElevation(dp(1));
        return l;
    }

    public static LinearLayout.LayoutParams lp(int w, int h) {
        return new LinearLayout.LayoutParams(w, h);
    }

    public static LinearLayout.LayoutParams fill() {
        LinearLayout.LayoutParams p = lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        return p;
    }

    public static LinearLayout.LayoutParams weight(float w) {
        return new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, w);
    }

    public static void gap(View v, int topDp) {
        ViewGroup.LayoutParams p = v.getLayoutParams();
        LinearLayout.LayoutParams l = p instanceof LinearLayout.LayoutParams ? (LinearLayout.LayoutParams) p : fill();
        l.topMargin = dp(topDp);
        v.setLayoutParams(l);
    }

    public static View add(LinearLayout parent, View v, int topDp) {
        if (v.getLayoutParams() == null) v.setLayoutParams(fill());
        parent.addView(v);
        gap(v, topDp);
        return v;
    }

    /** Buttons: primary / secondary / warn / dark / danger / ok. Minimum 48 dp touch target. */
    public static TextView button(String label, String tone, View.OnClickListener on) {
        int bg, fg, stroke = 0;
        switch (tone) {
            case "secondary": bg = WHITE; fg = INK; stroke = LINE; break;
            case "warn": bg = ORANGE; fg = WHITE; break;
            case "dark": bg = INK; fg = WHITE; break;
            case "danger": bg = DANGER; fg = WHITE; break;
            case "ok": bg = OK; fg = WHITE; break;
            case "ghost": bg = 0x00000000; fg = LPG_DARK; break;
            default: bg = LPG_DARK; fg = WHITE;
        }
        TextView b = text(label, 15, fg, true);
        b.setGravity(Gravity.CENTER);
        b.setMinHeight(dp(48));
        b.setPadding(dp(16), dp(10), dp(16), dp(10));
        b.setBackground(new RippleDrawable(ColorStateList.valueOf(0x33000000), round(bg, 12, stroke), null));
        b.setOnClickListener(on);
        b.setClickable(true);
        b.setFocusable(true);
        return b;
    }

    /** Status chip — symbol + text, never colour alone. tone: ok | warn | danger | info | isolated | neutral */
    public static TextView chip(String label, String tone) {
        TextView t = mono(symbol(tone) + " " + label, 11, fg(tone));
        t.setBackground(round(bg(tone), 99, 0));
        t.setPadding(dp(9), dp(4), dp(9), dp(4));
        t.setSingleLine(true);
        t.setEllipsize(TextUtils.TruncateAt.END);
        return t;
    }

    public static void setChip(TextView t, String label, String tone) {
        t.setText(symbol(tone) + " " + label);
        t.setTextColor(fg(tone));
        t.setBackground(round(bg(tone), 99, 0));
    }

    static String symbol(String tone) {
        switch (tone) {
            case "ok": return "●";
            case "warn": return "▲";
            case "danger": return "■";
            case "isolated": return "◼";
            case "info": return "◆";
            default: return "○";
        }
    }

    public static int fg(String tone) {
        switch (tone) {
            case "ok": return OK;
            case "warn": return WARN;
            case "danger": return DANGER;
            case "info": case "isolated": return LPG_DARK;
            default: return INK_MUTED;
        }
    }

    public static int bg(String tone) {
        switch (tone) {
            case "ok": return OK_BG;
            case "warn": return WARN_BG;
            case "danger": return DANGER_BG;
            case "info": return LPG_50;
            case "isolated": return LPG_100;
            default: return 0xFFEEF1F4;
        }
    }

    public static String safetyTone(String s) {
        switch (s) {
            case "NORMAL": case "SAFE": return "ok";
            case "ANOMALY": case "WARNING": return "warn";
            case "CRITICAL": return "danger";
            case "ISOLATED": return "isolated";
            default: return "neutral";
        }
    }

    public static String safetyText(String s) {
        switch (s) {
            case "ISOLATED": return "SUPPLY ISOLATED";
            case "UNMONITORED": return "NOT MONITORED";
            default: return s;
        }
    }

    public static String phaseTone(String p) {
        switch (p) {
            case "CONTAINED": case "COOKING": return "ok";
            case "ANOMALY": case "WARNING": case "RESPONSE": case "LEAK": return "warn";
            case "CRITICAL": case "DANGER": case "INCIDENT": return "danger";
            case "RECOVERY": return "neutral";
            default: return "info";
        }
    }

    public static String levelTone(int l) {
        return l == 0 ? "ok" : l == 1 ? "info" : l == 2 ? "warn" : "danger";
    }

    public static final String[] LEVEL = {"NORMAL", "ANOMALY", "WARNING", "CRITICAL"};

    public static int alpha(int c, float a) {
        return Color.argb((int) (a * 255), Color.red(c), Color.green(c), Color.blue(c));
    }

    /** Marks a title as a heading for TalkBack on Android 9+ (no-op earlier; called reflectively so minSdk 24 builds stay clean). */
    public static void heading(View v) {
        if (android.os.Build.VERSION.SDK_INT < 28) return;
        try {
            View.class.getMethod("setAccessibilityHeading", boolean.class).invoke(v, true);
        } catch (Exception ignored) {
        }
    }
}
