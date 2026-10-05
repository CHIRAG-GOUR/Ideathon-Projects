package com.skillizee.lpgdock.ui;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Typeface;
import android.view.MotionEvent;
import android.view.View;
import com.skillizee.lpgdock.engine.Engine;
import java.util.List;
import java.util.Locale;

/** Custom-drawn telemetry card (value, status, sparkline) and the gas chart with thresholds + touch readout. */
public final class Widgets {
    /** Telemetry card. kind: gas | temp | tilt | flow | text */
    public static final class TCard extends View {
        String title, value = "", unit = "", status = "", tone = "ok", foot = "", kind;
        double[] spark;
        double warn = Double.NaN, max = 1;
        final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        final Path path = new Path();
        final boolean compact;

        public TCard(Context c, String title, String kind, boolean compact) {
            super(c);
            this.title = title;
            this.kind = kind;
            this.compact = compact;
            setMinimumHeight(Ui.dp(compact ? 104 : 118));
            setFocusable(true);
        }

        public void set(String value, String unit, String status, String tone, String foot, double[] spark, double warn, double max) {
            this.value = value;
            this.unit = unit;
            this.status = status;
            this.tone = tone;
            this.foot = foot;
            this.spark = spark;
            this.warn = warn;
            this.max = max;
            setContentDescription(title + " " + value + " " + unit + ", " + status);
            invalidate();
        }

        @Override
        protected void onMeasure(int ws, int hs) {
            setMeasuredDimension(MeasureSpec.getSize(ws), Ui.dp(compact ? 104 : 118));
        }

        @Override
        protected void onDraw(Canvas c) {
            float w = getWidth(), h = getHeight(), pad = Ui.dp(12);
            p.setStyle(Paint.Style.FILL);
            p.setColor(Ui.WHITE);
            c.drawRoundRect(0, 0, w, h, Ui.dp(14), Ui.dp(14), p);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Ui.dp(1));
            p.setColor("danger".equals(tone) ? 0xFFFAD3D0 : "warn".equals(tone) ? 0xFFFFE3C4 : Ui.LINE);
            c.drawRoundRect(0, 0, w, h, Ui.dp(14), Ui.dp(14), p);
            p.setStyle(Paint.Style.FILL);
            p.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
            p.setTextSize(Ui.dp(12.5f));
            p.setColor(Ui.INK_SOFT);
            c.drawText(title, pad, pad + Ui.dp(11), p);
            // value
            p.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
            p.setTextSize(Ui.dp(compact ? 22 : 26));
            p.setColor(Ui.INK);
            float vy = pad + Ui.dp(compact ? 44 : 50);
            c.drawText(value, pad, vy, p);
            float vw = p.measureText(value);
            p.setTextSize(Ui.dp(11));
            p.setColor(Ui.INK_MUTED);
            c.drawText(unit, pad + vw + Ui.dp(4), vy, p);
            // status chip
            p.setTextSize(Ui.dp(10.5f));
            String st = Ui.symbol(tone) + " " + status;
            float cw = p.measureText(st) + Ui.dp(14), cy = h - pad - Ui.dp(compact ? 20 : 36);
            p.setColor(Ui.bg(tone));
            c.drawRoundRect(pad, cy, pad + cw, cy + Ui.dp(20), Ui.dp(10), Ui.dp(10), p);
            p.setColor(Ui.fg(tone));
            c.drawText(st, pad + Ui.dp(7), cy + Ui.dp(14), p);
            if (!compact) {
                p.setTypeface(Typeface.MONOSPACE);
                p.setTextSize(Ui.dp(10));
                p.setColor(Ui.INK_FAINT);
                c.drawText(foot, pad, h - pad, p);
            }
            // sparkline (single series: 2dp line, 10% wash, end dot with surface ring)
            if (spark != null && spark.length > 1) {
                float sw = Math.min(Ui.dp(110), w * 0.4f), sh = Ui.dp(30), sx = w - pad - sw, sy = pad + Ui.dp(26);
                double lo = Double.MAX_VALUE, hi = max;
                for (double v : spark) {
                    lo = Math.min(lo, v);
                    hi = Math.max(hi, v);
                }
                if (!Double.isNaN(warn)) lo = Math.min(lo, warn);
                lo *= 0.98;
                double range = hi - lo == 0 ? 1 : hi - lo;
                if (!Double.isNaN(warn) && warn < hi) {
                    p.setColor(Ui.LINE);
                    p.setStrokeWidth(Ui.dp(1));
                    float wy = (float) (sy + sh - (warn - lo) / range * sh);
                    c.drawLine(sx, wy, sx + sw, wy, p);
                }
                path.reset();
                float ex = 0, ey = 0;
                for (int i = 0; i < spark.length; i++) {
                    ex = sx + sw * i / (spark.length - 1);
                    ey = (float) (sy + sh - (spark[i] - lo) / range * sh);
                    if (i == 0) path.moveTo(ex, ey);
                    else path.lineTo(ex, ey);
                }
                p.setStyle(Paint.Style.STROKE);
                p.setStrokeWidth(Ui.dp(2));
                p.setStrokeJoin(Paint.Join.ROUND);
                p.setColor(Ui.LPG);
                c.drawPath(path, p);
                p.setStyle(Paint.Style.FILL);
                p.setColor(Ui.WHITE);
                c.drawCircle(ex, ey, Ui.dp(5), p);
                p.setColor(Ui.LPG);
                c.drawCircle(ex, ey, Ui.dp(3.5f), p);
            }
        }
    }

    public static double[] series(List<Engine.Sample> h, String k, int n) {
        int from = Math.max(0, h.size() - n);
        double[] a = new double[h.size() - from];
        for (int i = from; i < h.size(); i++) {
            Engine.Sample s = h.get(i);
            a[i - from] = "gas".equals(k) ? s.gas : "temp".equals(k) ? s.temp : "tilt".equals(k) ? s.tilt : s.flow;
        }
        return a;
    }

    /** Gas over time; one or two series (two → legend drawn by the caller). Touch shows a crosshair readout. */
    public static final class GasChart extends View {
        Engine.State a, b;
        double warn;
        float touchX = -1;
        final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        final Path path = new Path();

        public GasChart(Context c, double warn) {
            super(c);
            this.warn = warn;
            setMinimumHeight(Ui.dp(190));
        }

        public void set(Engine.State a, Engine.State b) {
            this.a = a;
            this.b = b;
            setContentDescription("Simulated gas concentration chart. Now " + String.format(Locale.US, "%.2f", a.gas) + " ppm" + (b != null ? " without dock, " + String.format(Locale.US, "%.2f", b.gas) + " ppm with dock" : ""));
            invalidate();
        }

        @Override
        protected void onMeasure(int ws, int hs) {
            setMeasuredDimension(MeasureSpec.getSize(ws), Ui.dp(190));
        }

        @Override
        public boolean onTouchEvent(MotionEvent e) {
            touchX = e.getActionMasked() == MotionEvent.ACTION_UP || e.getActionMasked() == MotionEvent.ACTION_CANCEL ? -1 : e.getX();
            getParent().requestDisallowInterceptTouchEvent(touchX >= 0);
            invalidate();
            return true;
        }

        @Override
        protected void onDraw(Canvas c) {
            if (a == null) return;
            float w = getWidth(), h = getHeight(), L = Ui.dp(34), R = Ui.dp(48), T = Ui.dp(8), B = Ui.dp(22);
            double tMax = Math.max(30, Math.max(a.t, b == null ? 0 : b.t));
            double gMax = 0.3;
            for (Engine.Sample s : a.history) gMax = Math.max(gMax, s.gas);
            if (b != null) for (Engine.Sample s : b.history) gMax = Math.max(gMax, s.gas);
            gMax *= 1.1;
            p.setTypeface(Typeface.MONOSPACE);
            p.setTextSize(Ui.dp(10));
            double step = gMax > 0.6 ? 0.2 : 0.1;
            for (double g = 0; g <= gMax; g += step) {
                float y = (float) (T + (1 - g / gMax) * (h - T - B));
                p.setColor(0xFFEEF1F4);
                p.setStrokeWidth(Ui.dp(1));
                c.drawLine(L, y, w - R, y, p);
                p.setColor(Ui.INK_MUTED);
                c.drawText(String.format(Locale.US, "%.1f", g), Ui.dp(2), y + Ui.dp(4), p);
            }
            float wy = (float) (T + (1 - warn / gMax) * (h - T - B));
            p.setColor(Ui.INK_FAINT);
            c.drawLine(L, wy, w - R, wy, p);
            c.drawText("warn", w - R + Ui.dp(4), wy + Ui.dp(4), p);
            for (int t = 0; t <= tMax; t += 10) {
                float x = (float) (L + t / tMax * (w - L - R));
                p.setColor(Ui.INK_MUTED);
                c.drawText(Engine.clock(t), x - Ui.dp(14), h - Ui.dp(6), p);
            }
            line(c, a, b != null ? Ui.BURNT : Ui.LPG, tMax, gMax, L, R, T, B, w, h);
            if (b != null) line(c, b, Ui.LPG, tMax, gMax, L, R, T, B, w, h);
            if (touchX >= L) {
                double t = (touchX - L) / (w - L - R) * tMax;
                p.setColor(0x661F2733);
                c.drawLine(touchX, T, touchX, h - B, p);
                String txt = Engine.clock(t) + "  " + String.format(Locale.US, "%.2f", at(a, t)) + (b != null ? " / " + String.format(Locale.US, "%.2f", at(b, t)) : "") + " ppm";
                p.setTextSize(Ui.dp(11));
                float tw = p.measureText(txt) + Ui.dp(12);
                float bx = Math.min(touchX + Ui.dp(6), w - tw);
                p.setColor(Ui.INK);
                c.drawRoundRect(bx, T, bx + tw, T + Ui.dp(22), Ui.dp(6), Ui.dp(6), p);
                p.setColor(Ui.WHITE);
                c.drawText(txt, bx + Ui.dp(6), T + Ui.dp(15), p);
            }
        }

        static double at(Engine.State s, double t) {
            Engine.Sample best = s.history.get(0);
            for (Engine.Sample x : s.history) if (Math.abs(x.t - t) < Math.abs(best.t - t)) best = x;
            return best.gas;
        }

        void line(Canvas c, Engine.State s, int col, double tMax, double gMax, float L, float R, float T, float B, float w, float h) {
            path.reset();
            float x = 0, y = 0;
            for (int i = 0; i < s.history.size(); i++) {
                Engine.Sample e = s.history.get(i);
                x = (float) (L + e.t / tMax * (w - L - R));
                y = (float) (T + (1 - e.gas / gMax) * (h - T - B));
                if (i == 0) path.moveTo(x, y);
                else path.lineTo(x, y);
            }
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Ui.dp(2));
            p.setColor(col);
            c.drawPath(path, p);
            p.setStyle(Paint.Style.FILL);
            p.setColor(Ui.WHITE);
            c.drawCircle(x, y, Ui.dp(5), p);
            p.setColor(col);
            c.drawCircle(x, y, Ui.dp(3.5f), p);
            p.setColor(Ui.INK);
            p.setTextSize(Ui.dp(10));
            c.drawText(String.format(Locale.US, "%.2f", s.gas), Math.min(x + Ui.dp(6), w - Ui.dp(40)), y - Ui.dp(4), p);
        }
    }
}
