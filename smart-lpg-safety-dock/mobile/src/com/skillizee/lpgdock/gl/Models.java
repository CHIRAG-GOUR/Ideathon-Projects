package com.skillizee.lpgdock.gl;

import com.skillizee.lpgdock.engine.Engine;

/** Cylinder + Smart Dock and the chef, drawn with {@link Gl}. Shared by the kitchen and product views. */
public final class Models {
    public static final String[] PARTS = {"cylinder", "regulator", "dock", "gas", "temp", "tilt", "status", "shutoff", "controller"};
    static final int[] LED = {0x22c55e, 0x60a5fa, 0xf59e0b, 0xef4444, 0x3b82f6, 0x22c55e};

    /** 0 normal, 1 anomaly, 2 warning, 3 critical, 4 isolated, 5 safe. */
    public static int led(Engine.State s) {
        if ("SAFE".equals(s.safety)) return 5;
        if ("ISOLATED".equals(s.supply)) return 4;
        if ("CRITICAL".equals(s.safety)) return 3;
        if ("WARNING".equals(s.safety)) return 2;
        if ("ANOMALY".equals(s.safety)) return 1;
        return 0;
    }

    /**
     * Draws cylinder (+ dock) at the current matrix origin. Fills {@code anchors[part*3..]} with local part positions
     * (for picking). time = seconds for blinking; explode 0..1; selected = part index or -1.
     */
    public static void cylinderDock(Gl g, boolean withDock, int led, float valve, float heat, float tiltDeg, boolean scorched, float explode, int selected, float time, float[] anchors) {
        float e = explode;
        float blink = (led == 2 || led == 3) ? (float) (0.55 + 0.45 * Math.sin(time * (led == 3 ? 14 : 7))) : 1f;
        int ledCol = LED[led];
        if (withDock) {
            g.push();
            g.t(0, -e * 0.25f, 0);
            g.at(g.box, 0, 0.035f, 0, 0.56f, 0.07f, 0.56f, hl(selected, 2, 0x9aa4b1));
            g.at(g.cyl, 0, 0.078f, 0, 0.24f, 0.012f, 0.24f, hl(selected, 2, 0xEADFCB));
            g.at(g.box, 0, 0.04f, 0.282f, 0.3f, 0.03f, 0.004f, 0x142F55);
            g.pop();
            anchor(anchors, 2, 0, 0.04f - e * 0.25f, 0);
            // status ring
            g.push();
            g.t(0, 0.088f - e * 0.1f, 0);
            g.s(0.215f, 0.215f, 0.215f);
            g.unlit(true);
            g.draw(g.torus, scale(ledCol, blink), 1f, 0);
            g.unlit(false);
            g.pop();
            anchor(anchors, 6, 0.215f, 0.09f - e * 0.1f, 0);
            // sensor tower
            float sx = 0.24f + e * 0.35f, sz = 0.24f + e * 0.1f;
            g.at(g.box, sx, 0.2f, sz, 0.07f, 0.26f, 0.07f, hl(selected, 8, 0x1F2733));
            anchor(anchors, 8, sx, 0.2f, sz);
            g.at(g.cyl, sx, 0.34f + e * 0.12f, sz, 0.03f, 0.03f, 0.03f, hl(selected, 3, 0xC3CAD3));
            anchor(anchors, 3, sx, 0.34f + e * 0.12f, sz);
            g.at(g.cyl, sx, 0.358f + e * 0.12f, sz, 0.022f, 0.006f, 0.022f, 0x333333);
            g.push();
            g.t(sx - 0.042f - e * 0.12f, 0.19f, sz);
            g.rz((float) Math.PI / 2);
            g.s(0.008f, 0.06f, 0.008f);
            g.draw(g.cyl, hl(selected, 4, 0xE8730C));
            g.pop();
            anchor(anchors, 4, sx - 0.05f - e * 0.12f, 0.19f, sz);
            g.at(g.box, sx, 0.15f, sz + 0.036f + e * 0.12f, 0.045f, 0.045f, 0.006f, hl(selected, 5, 0x167A45));
            anchor(anchors, 5, sx, 0.15f, sz + 0.04f + e * 0.12f);
            g.push();
            g.t(sx, 0.27f, sz + 0.036f);
            g.s(0.012f, 0.012f, 0.012f);
            g.unlit(true);
            g.draw(g.sphere, scale(ledCol, blink), 1f, 0);
            g.unlit(false);
            g.pop();
        } else {
            g.at(g.cyl, 0, 0.006f, 0, 0.26f, 0.012f, 0.26f, 0x2b2b2b);
        }
        // tilting cylinder
        g.push();
        g.t(0, withDock ? 0.08f : 0.012f, 0);
        g.rz((float) -Math.toRadians(tiltDeg));
        g.push();
        g.t(0, e * 0.35f, 0);
        int body = scorched ? 0x3a3f47 : 0x2563B0;
        int glow = rgb(0.9f * heat, 0.25f * heat, 0.05f * heat);
        g.at(g.cyl, 0, 0.06f, 0, 0.165f, 0.08f, 0.165f, hl(selected, 0, 0x1D4F91));
        g.push();
        g.t(0, 0.4f, 0);
        g.s(0.16f, 0.5f, 0.16f);
        g.draw(g.cyl, hl(selected, 0, body), 1f, glow);
        g.pop();
        g.push();
        g.t(0, 0.65f, 0);
        g.s(0.16f, 0.1f, 0.16f);
        g.draw(g.sphere, hl(selected, 0, body), 1f, glow);
        g.pop();
        g.push();
        g.t(0, 0.15f, 0);
        g.s(0.16f, 0.1f, 0.16f);
        g.draw(g.sphere, body, 1f, glow);
        g.pop();
        g.at(g.cyl, 0, 0.42f, 0, 0.163f, 0.05f, 0.163f, 0xEADFCB);
        g.at(g.cyl, 0, 0.77f, 0, 0.105f, 0.09f, 0.105f, 0x1D4F91);
        g.at(g.cyl, 0, 0.8f, 0, 0.0275f, 0.05f, 0.0275f, 0xc9a227);
        g.pop();
        anchor(anchors, 0, 0, 0.45f + e * 0.35f, 0);
        // regulator
        g.push();
        g.t(0, e * 0.55f, 0);
        g.at(g.cyl, 0, 0.85f, 0, 0.0475f, 0.05f, 0.0475f, hl(selected, 1, 0xE8730C));
        g.at(g.cyl, 0, 0.88f, 0, 0.035f, 0.015f, 0.035f, 0x1F2733);
        g.pop();
        anchor(anchors, 1, 0, 0.86f + e * 0.55f, 0);
        if (withDock) {
            g.push();
            g.t(-0.07f - e * 0.3f, 0.86f + e * 0.5f, 0);
            g.at(g.box, 0, 0, 0, 0.05f, 0.05f, 0.06f, hl(selected, 7, 0x142F55));
            g.push();
            g.t(0, 0.035f, 0);
            g.ry((float) (valve * Math.PI / 2));
            g.at(g.box, -0.03f, 0, 0, 0.07f, 0.012f, 0.014f, 0xE8730C);
            g.pop();
            g.pop();
            anchor(anchors, 7, -0.07f - e * 0.3f, 0.86f + e * 0.5f, 0);
        }
        g.pop();
    }

    static void anchor(float[] a, int i, float x, float y, float z) {
        if (a == null) return;
        a[i * 3] = x;
        a[i * 3 + 1] = y;
        a[i * 3 + 2] = z;
    }

    static int hl(int selected, int part, int col) {
        return selected == part ? 0xF99A3D : col;
    }

    static int scale(int c, float k) {
        return rgb(((c >> 16) & 255) / 255f * k, ((c >> 8) & 255) / 255f * k, (c & 255) / 255f * k);
    }

    public static int rgb(float r, float g, float b) {
        return (clamp(r) << 16) | (clamp(g) << 8) | clamp(b);
    }

    static int clamp(float v) {
        return Math.max(0, Math.min(255, (int) (v * 255)));
    }

    // ------------------------------------------------------------------ chef
    static final int SKIN = 0xB9784A, COAT = 0xE9E4DA, APRON = 0x183F73, PANTS = 0x2b2f36;

    static void limb(Gl g, float len, float r, int col) {
        g.push();
        g.t(0, -len / 2, 0);
        g.s(r, len / 2 + r * 0.3f, r);
        g.draw(g.sphere, col);
        g.pop();
    }

    /** Pose derived from the engine's chef state (the same rules as the web Chef component). */
    public static void chef(Gl g, Engine.State s, float x, float z, float heading, float walkPhase) {
        String act = s.chefAction;
        float t = (float) s.t, since = (float) (s.t - s.chefSince);
        boolean moving = "walking".equals(act) || "fleeing".equals(act), fast = "fleeing".equals(act);
        float sw = moving ? (float) Math.sin(walkPhase) * (fast ? 0.75f : 0.45f) : 0;
        float lHip = sw, rHip = -sw, lKn = moving ? Math.max(0, (float) -Math.sin(walkPhase)) * 0.8f : 0, rKn = moving ? Math.max(0, (float) Math.sin(walkPhase)) * 0.8f : 0;
        float lShX = -sw * 0.9f, rShX = sw * 0.9f, lShZ = 0.08f, rShZ = -0.08f, lEl = moving ? -0.5f : -0.15f, rEl = moving ? -0.5f : -0.15f;
        float torso = fast ? 0.22f : moving ? 0.06f : 0, headY = 0, headX = 0;
        float bob = moving ? Math.abs((float) Math.sin(walkPhase)) * 0.03f : (float) Math.sin(t * 2) * 0.004f;
        boolean ladle = false;
        switch (act) {
            case "cooking": {
                float st = t * 3.2f;
                rShX = -0.95f + (float) Math.sin(st) * 0.12f;
                rShZ = -0.25f + (float) Math.cos(st) * 0.1f;
                rEl = -0.9f + (float) Math.cos(st) * 0.12f;
                lShX = -0.7f;
                lShZ = 0.3f;
                lEl = -0.8f;
                torso = 0.08f;
                headX = 0.25f;
                ladle = true;
                break;
            }
            case "alerted": {
                float a = Math.min(1, since / 0.35f);
                headY = -0.9f * a;
                rShX = -1.4f * a;
                rShZ = -0.5f * a;
                lShX = -0.4f * a;
                rEl = -0.3f;
                torso = -0.05f;
                break;
            }
            case "noticing": {
                float a = Math.min(1, since / 0.3f);
                rShX = -2.1f * a;
                rShZ = -0.2f;
                rEl = -2.0f * a;
                headY = -0.6f * (float) Math.sin(since * 5);
                torso = -0.12f * a;
                break;
            }
            case "exited":
                headY = (float) Math.sin(t * 0.8) * 0.2f;
                break;
            case "relieved": {
                float cyc = (since % 3.2f) / 3.2f;
                float wipe = cyc < 0.45f ? (float) Math.sin((cyc / 0.45f) * Math.PI) : 0;
                float up = Math.min(1, since * 3);
                rShX = -2.3f * up + wipe * 0.1f;
                rShZ = -0.35f + wipe * 0.6f;
                rEl = -2.2f * up;
                if (cyc > 0.55f) {
                    rShX = -0.25f;
                    rEl = -0.2f;
                    rShZ = -0.1f;
                }
                headX = cyc > 0.55f ? 0.25f : -0.12f;
                torso = cyc > 0.55f ? 0.12f : -0.05f;
                bob = cyc > 0.55f ? -0.02f : 0.01f;
                break;
            }
            default:
        }
        g.push();
        g.t(x, bob, z);
        g.ry(heading);
        float[][] legs = {{-0.095f, lHip, lKn}, {0.095f, rHip, rKn}};
        for (float[] L : legs) {
            g.push();
            g.t(L[0], 0.92f, 0);
            g.rx(L[1]);
            limb(g, 0.44f, 0.068f, PANTS);
            g.t(0, -0.44f, 0);
            g.rx(L[2]);
            limb(g, 0.42f, 0.058f, PANTS);
            g.at(g.box, 0, -0.43f, 0.05f, 0.1f, 0.07f, 0.24f, 0x111111);
            g.pop();
        }
        g.push();
        g.t(0, 0.94f, 0);
        g.rx(torso);
        // chef's coat: a rounded column (cylinder + shoulders + hem) reads as a body, not an egg
        g.at(g.cyl, 0, 0.24f, 0, 0.175f, 0.36f, 0.15f, COAT);
        g.at(g.sphere, 0, 0.42f, 0, 0.175f, 0.12f, 0.15f, COAT);
        g.at(g.sphere, 0, 0.06f, 0, 0.175f, 0.06f, 0.15f, COAT);
        g.at(g.box, 0, 0.12f, 0.15f, 0.3f, 0.42f, 0.04f, APRON);
        g.at(g.sphere, 0, 0.58f, 0.04f, 0.08f, 0.03f, 0.08f, 0xE8730C);
        g.push();
        g.t(0, 0.66f, 0);
        g.rx(headX);
        g.ry(headY);
        g.at(g.sphere, 0, 0.07f, 0, 0.105f, 0.105f, 0.105f, SKIN);
        g.at(g.sphere, 0, 0.12f, -0.02f, 0.1f, 0.06f, 0.1f, 0x1a1a1a);
        g.at(g.sphere, -0.036f, 0.085f, 0.095f, 0.011f, 0.011f, 0.011f, 0x111111);
        g.at(g.sphere, 0.036f, 0.085f, 0.095f, 0.011f, 0.011f, 0.011f, 0x111111);
        g.at(g.box, 0, 0.035f, 0.1f, 0.06f, 0.012f, 0.01f, 0x1a1a1a);
        g.at(g.cyl, 0, 0.2f, 0, 0.095f, 0.12f, 0.095f, 0xF1EEE8);
        g.at(g.sphere, 0, 0.3f, 0, 0.125f, 0.1f, 0.125f, 0xF1EEE8);
        g.pop();
        float[][] arms = {{-0.235f, lShX, lShZ, lEl, 0}, {0.235f, rShX, rShZ, rEl, 1}};
        for (float[] A : arms) {
            g.push();
            g.t(A[0], 0.5f, 0);
            g.rx(A[1]);
            g.rz(A[2]);
            limb(g, 0.29f, 0.058f, COAT);
            g.t(0, -0.29f, 0);
            g.rx(A[3]);
            limb(g, 0.25f, 0.048f, COAT);
            g.at(g.sphere, 0, -0.27f, 0, 0.045f, 0.045f, 0.045f, SKIN);
            if (A[4] == 1 && ladle) {
                g.push();
                g.t(0, -0.29f, 0.02f);
                g.rx(1.2f);
                g.push();
                g.t(0, 0, 0.15f);
                g.rx((float) Math.PI / 2);
                g.s(0.008f, 0.32f, 0.008f);
                g.draw(g.cyl, 0xC3CAD3);
                g.pop();
                g.at(g.sphere, 0, 0, 0.32f, 0.04f, 0.03f, 0.04f, 0xC3CAD3);
                g.pop();
            }
            g.pop();
        }
        g.pop();
        g.pop();
    }
}
