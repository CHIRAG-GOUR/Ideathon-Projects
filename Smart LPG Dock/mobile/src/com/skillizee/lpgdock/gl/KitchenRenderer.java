package com.skillizee.lpgdock.gl;

import android.opengl.GLES20;
import android.opengl.GLSurfaceView;
import com.skillizee.lpgdock.engine.Engine;
import com.skillizee.lpgdock.sim.SimController;
import javax.microedition.khronos.egl.EGLConfig;
import javax.microedition.khronos.opengles.GL10;

/**
 * The kitchen scene for one simulation, or two side by side (Compare) in one GL context.
 * Optimised for phones: simple lit primitives, capped particles, no textures. Reads engine state every frame.
 */
public final class KitchenRenderer implements GLSurfaceView.Renderer {
    final Gl g = new Gl();
    volatile SimController[] sims;
    public volatile boolean lowQuality, reduced;
    int w = 1, h = 1;
    long last;
    float time;
    // orbit camera (shared by both viewports)
    public volatile float yaw = 0.76f, pitch = 0.28f, dist = 5.9f;
    public volatile long touchedAt;
    final float[][] target = {{-0.5f, 0.9f, -0.2f}, {-0.5f, 0.9f, -0.2f}};
    final float[][] chefPos = new float[2][3];
    final float[] chefHead = new float[2], walk = new float[2];
    boolean[] init = new boolean[2];
    static final float[] FOG = {0.16f, 0.18f, 0.22f};
    static final int N_GAS = 90, N_SMOKE = 40;
    final float[][] gasSeeds = seeds(N_GAS, 99), smokeSeeds = seeds(N_SMOKE, 5);

    public KitchenRenderer(SimController... sims) {
        this.sims = sims;
    }

    public void setSims(SimController... s) {
        sims = s;
        init = new boolean[2];
    }

    static float[][] seeds(int n, int seed) {
        java.util.Random r = new java.util.Random(seed);
        float[][] a = new float[n][5];
        for (float[] x : a) for (int i = 0; i < 5; i++) x[i] = r.nextFloat();
        return a;
    }

    @Override
    public void onSurfaceCreated(GL10 unused, EGLConfig config) {
        g.init();
        GLES20.glClearColor(FOG[0], FOG[1], FOG[2], 1);
    }

    @Override
    public void onSurfaceChanged(GL10 unused, int width, int height) {
        w = Math.max(1, width);
        h = Math.max(1, height);
    }

    @Override
    public void onDrawFrame(GL10 unused) {
        long now = System.nanoTime();
        float dt = last == 0 ? 0 : Math.min(0.1f, (now - last) / 1e9f);
        last = now;
        time += dt;
        GLES20.glViewport(0, 0, w, h);
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT | GLES20.GL_DEPTH_BUFFER_BIT);
        SimController[] ss = sims;
        boolean split = ss.length > 1;
        boolean side = w > h;
        for (int i = 0; i < ss.length; i++) {
            int vx = 0, vy = 0, vw = w, vh = h;
            if (split) {
                if (side) {
                    vw = w / 2;
                    vx = i * vw;
                } else {
                    vh = h / 2;
                    vy = (1 - i) * vh;
                }
            }
            GLES20.glViewport(vx, vy, vw, vh);
            GLES20.glEnable(GLES20.GL_SCISSOR_TEST);
            GLES20.glScissor(vx, vy, vw, vh);
            GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT | GLES20.GL_DEPTH_BUFFER_BIT);
            GLES20.glDisable(GLES20.GL_SCISSOR_TEST);
            scene(ss[i], i, (float) vw / vh, dt, split);
        }
    }

    void scene(SimController sc, int vi, float aspect, float dt, boolean split) {
        Engine.State s = sc.state;
        Engine.Config c = sc.config;
        boolean withDock = s.withDock();
        float[] cyl = {(float) c.cylinder[0], 0, (float) c.cylinder[2]};
        // smooth chef position / heading
        if (!init[vi]) {
            chefPos[vi][0] = (float) s.chefX;
            chefPos[vi][2] = (float) s.chefZ;
            chefHead[vi] = (float) s.chefHeading;
            init[vi] = true;
        }
        float k = Math.min(1, dt * 10);
        chefPos[vi][0] += ((float) s.chefX - chefPos[vi][0]) * k;
        chefPos[vi][2] += ((float) s.chefZ - chefPos[vi][2]) * k;
        float dh = (float) (((s.chefHeading - chefHead[vi] + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);
        chefHead[vi] += dh * Math.min(1, dt * 6);
        boolean moving = "walking".equals(s.chefAction) || "fleeing".equals(s.chefAction);
        if (moving) walk[vi] += dt * (float) sc.speed * ("fleeing".equals(s.chefAction) ? 11 : 7.5f);

        // auto-frame: follow the chef out, keep the incident in view (paused 12 s after the user drags)
        float[] tg = target[vi];
        float wx = -0.5f, wy = 0.9f, wz = -0.2f;
        boolean away = moving || "exited".equals(s.chefAction) || "relieved".equals(s.chefAction);
        if (s.incidentAt >= 0) {
            wx = -0.2f;
            wz = -0.2f;
        } else if (away) {
            float m = withDock ? 0.55f : 0.35f;
            wx += (chefPos[vi][0] - wx) * m;
            wy += (1.0f - wy) * m;
            wz += (chefPos[vi][2] - wz) * m;
        }
        if (System.currentTimeMillis() - touchedAt > 12000) {
            float kk = Math.min(1, dt * 1.6f);
            tg[0] += (wx - tg[0]) * kk;
            tg[1] += (wy - tg[1]) * kk;
            tg[2] += (wz - tg[2]) * kk;
        }
        float d = split ? dist * 1.08f : dist;
        float ex = tg[0] + d * (float) (Math.cos(pitch) * Math.sin(yaw)), ey = tg[1] + d * (float) Math.sin(pitch), ez = tg[2] + d * (float) (Math.cos(pitch) * Math.cos(yaw));
        float inc = s.incidentAt >= 0 ? (float) (s.t - s.incidentAt) : -1;
        if (!reduced && inc >= 0 && inc < 1.6f) {
            float amp = 0.08f * (1 - inc / 1.6f);
            ex += Math.sin(time * 63) * amp;
            ey += Math.sin(time * 71) * amp;
            ez += Math.cos(time * 57) * amp;
        }
        g.begin(aspect, aspect < 1 ? 58 : 45, ex, ey, ez, tg[0], tg[1], tg[2], FOG);

        // lights: warm ceiling light, beacon when the dock alarm is on, flash in the simulated incident
        float flick = inc > 0.4f && inc < 4 ? 0.4f + 0.6f * Math.abs((float) (Math.sin(time * 23) * Math.sin(time * 7))) : inc >= 4 ? 0.55f : 1f;
        if (inc >= 0 && inc < 1.2f) g.pointLight(cyl[0], 1.2f, cyl[2] + 0.4f, 6 * (1 - inc / 1.2f), 4 * (1 - inc / 1.2f), 2 * (1 - inc / 1.2f));
        else if (withDock && !"none".equals(s.alarm)) {
            float p = (float) (0.5 + 0.5 * Math.sin(time * ("critical".equals(s.alarm) ? 16 : 8)));
            boolean crit = "critical".equals(s.alarm);
            g.pointLight(2.2f, 2.05f, -1.2f, (crit ? 2.4f : 2.4f) * p, (crit ? 0.4f : 1.4f) * p, 0.2f * p);
        } else g.pointLight(0, 2.6f, 0.6f, 0.55f * flick, 0.45f * flick, 0.3f * flick);

        room(chefPos[vi][0] < -2.9f);
        counter();
        stove(s, inc);
        hood();
        shelves();
        dining();
        signs(withDock);
        // cylinder + dock
        g.push();
        g.t(cyl[0], 0, cyl[2]);
        float valve = "ISOLATED".equals(s.supply) ? 1 : "CLOSING".equals(s.supply) ? (float) Math.min(1, (s.t - s.shutoffAt) / c.valveTravelSec) : 0;
        float heat = (float) Math.max(0, Math.min(1, (s.temp - 34) / 30));
        Models.cylinderDock(g, withDock, Models.led(s), valve, heat, (float) s.tilt, inc >= 0, 0, -1, time, null);
        g.pop();
        hose(s, cyl);
        if (withDock) beacon(s);
        Models.chef(g, s, chefPos[vi][0], chefPos[vi][2], chefHead[vi], walk[vi]);

        // transparent passes
        GLES20.glEnable(GLES20.GL_BLEND);
        GLES20.glBlendFunc(GLES20.GL_SRC_ALPHA, GLES20.GL_ONE_MINUS_SRC_ALPHA);
        GLES20.glDepthMask(false);
        gas(s, cyl, inc);
        if (s.burner || s.temp > 26) steam(s);
        if (inc >= 0) incident(inc, cyl);
        GLES20.glDepthMask(true);
        GLES20.glDisable(GLES20.GL_BLEND);
    }

    void room(boolean chefOutside) {
        // Dollhouse cutaway: a wall is skipped when the camera is on its outer side (the web scene's walls are
        // single-sided for the same reason), so the default 3/4 view looks into the kitchen instead of at a wall.
        float cx = g.cam[0], cz = g.cam[2];
        g.at(g.box, 0, -0.01f, 1.4f, 6.2f, 0.02f, 6.0f, 0xA39C92);
        for (int i = 0; i < 6; i++) g.at(g.box, -2.6f + i * 1.04f, 0.001f, 1.4f, 0.01f, 0.004f, 6.0f, 0x857f77);
        for (int i = 0; i < 6; i++) g.at(g.box, 0, 0.001f, -1.4f + i * 1.04f, 6.2f, 0.004f, 0.01f, 0x857f77);
        if (cz > -1.5f) {
            g.at(g.box, 0, 0.8f, -1.5f, 6.2f, 1.6f, 0.02f, 0xE8E0D2);
            g.at(g.box, 0, 2.3f, -1.5f, 6.2f, 1.4f, 0.02f, 0xEFE6D6);
        }
        if (cx < 3.1f) g.at(g.box, 3.1f, 1.5f, 0.8f, 0.02f, 3f, 4.8f, 0xE9DFCD);
        if (cx > -3.1f && !chefOutside) { // also cut away once the chef has walked out, so the "whew" stays visible
            g.at(g.box, -3.1f, 1.5f, -0.33f, 0.02f, 3f, 2.34f, 0xE9DFCD);
            g.at(g.box, -3.1f, 1.5f, 2.87f, 0.02f, 3f, 0.98f, 0xE9DFCD);
            g.at(g.box, -3.1f, 2.6f, 1.8f, 0.02f, 0.8f, 1.16f, 0xE9DFCD);
        }
        g.at(g.box, -3.1f, 1.1f, 1.22f, 0.1f, 2.2f, 0.06f, 0x6b4a2e);
        g.at(g.box, -3.1f, 1.1f, 2.38f, 0.1f, 2.2f, 0.06f, 0x6b4a2e);
        g.at(g.box, -3.1f, 2.22f, 1.8f, 0.1f, 0.06f, 1.22f, 0x6b4a2e);
        // fire extinguisher
        g.at(g.sphere, 3.0f, 0.55f, -0.2f, 0.08f, 0.27f, 0.08f, 0xc8241b);
    }

    void counter() {
        g.at(g.box, -0.875f, 0.42f, -1.13f, 3.65f, 0.84f, 0.62f, 0xA9B1BB);
        for (float x : new float[] {-2.4f, -1.5f, -0.6f, 0.35f}) g.at(g.box, x, 0.5f, -0.815f, 0.3f, 0.025f, 0.02f, 0x59626e);
        g.at(g.box, -0.875f, 0.865f, -1.11f, 3.72f, 0.05f, 0.7f, 0x2f3238);
        // prep table + vegetables
        g.at(g.box, 1.75f, 0.86f, 1.25f, 1.2f, 0.04f, 0.7f, 0xB9C0C8);
        for (float[] p : new float[][] {{-0.55f, -0.3f}, {0.55f, -0.3f}, {-0.55f, 0.3f}, {0.55f, 0.3f}}) g.at(g.cyl, 1.75f + p[0], 0.42f, 1.25f + p[1], 0.022f, 0.84f, 0.022f, 0x9aa4b1);
        g.at(g.box, 1.6f, 0.9f, 1.25f, 0.45f, 0.03f, 0.3f, 0xc99a62);
        int[] veg = {0xd63b2f, 0xe7a02f, 0x4c8b3a, 0x8c3b6d};
        for (int i = 0; i < 4; i++) g.at(g.sphere, 1.95f + i * 0.06f, 0.93f, 1.15f + (i % 2) * 0.12f, 0.045f, 0.045f, 0.045f, veg[i]);
    }

    void stove(Engine.State s, float inc) {
        float sz = -1.1f;
        g.at(g.box, 0, 0.94f, sz, 0.9f, 0.1f, 0.5f, 0x1F2733);
        float a = inc >= 0 ? Math.min(1, inc / 0.8f) : 0;
        for (int i = 0; i < 2; i++) {
            float bx = i == 0 ? -0.22f : 0.22f;
            g.push();
            g.t(bx, 0.995f, sz);
            g.s(0.085f, 0.085f, 0.085f);
            g.draw(g.torus, 0x111111);
            g.pop();
            if (s.burner) {
                float big = "ABNORMAL".equals(s.usage) ? 1.6f : 1f;
                g.unlit(true);
                for (int f = 0; f < 8; f++) {
                    double ang = f / 8.0 * Math.PI * 2;
                    float fl = (float) (0.85 + 0.15 * Math.sin(time * 30 + f)) * big;
                    g.push();
                    g.t(bx + (float) Math.cos(ang) * 0.07f, 1.0f + 0.03f * fl, sz + (float) Math.sin(ang) * 0.07f);
                    g.s(0.014f, 0.06f * fl, 0.014f);
                    g.draw(g.cone, 0x5aa9ff);
                    g.pop();
                }
                g.unlit(false);
            }
            // cookware: kadhai (left) and stock pot (right); thrown off in the simulated incident
            float dir = i == 0 ? -1 : 1;
            g.push();
            g.t(bx + dir * a * 0.5f, 0.98f + (float) Math.sin(a * Math.PI) * 0.35f - a * 0.1f, sz);
            g.rz(dir * a * 1.6f);
            if (i == 0) {
                g.at(g.sphere, 0, 0.06f, 0, 0.17f, 0.08f, 0.17f, 0x2a2a2a);
                g.at(g.cyl, 0, 0.11f, 0, 0.15f, 0.01f, 0.15f, 0xc9772b);
            } else {
                g.at(g.cyl, 0, 0.11f, 0, 0.13f, 0.22f, 0.13f, 0xC3CAD3);
                g.at(g.cyl, 0, 0.225f, 0, 0.135f, 0.015f, 0.135f, 0x9AA4B1);
            }
            g.pop();
        }
    }

    void hood() {
        g.at(g.box, 0, 2.05f, -1.18f, 1.3f, 0.35f, 0.65f, 0xB4BCC5);
        g.at(g.box, 0, 2.65f, -1.32f, 0.4f, 0.9f, 0.35f, 0xB4BCC5);
        g.unlit(true);
        g.at(g.box, 0, 1.875f, -1.15f, 1.1f, 0.01f, 0.5f, 0xfff1d6);
        g.unlit(false);
        g.push();
        g.t(-2.35f, 2.3f, -1.47f);
        g.rx((float) Math.PI / 2);
        g.at(g.cyl, 0, 0, 0, 0.28f, 0.04f, 0.28f, 0x59626e);
        g.ry(time * 6);
        for (int i = 0; i < 2; i++) {
            g.push();
            g.ry(i * (float) Math.PI / 2);
            g.at(g.box, 0, -0.03f, 0, 0.46f, 0.01f, 0.08f, 0xC3CAD3);
            g.pop();
        }
        g.pop();
    }

    void shelves() {
        int[] jar = {0xc2410c, 0xe7a02f, 0x7a4a2a, 0xd4b483, 0x8b2c1a, 0x5f7f3a};
        for (int r = 0; r < 2; r++) {
            float y = r == 0 ? 1.45f : 1.85f;
            g.at(g.box, -1.7f, y, -1.36f, 2.0f, 0.03f, 0.26f, 0x9aa4b1);
            for (int i = 0; i < 6; i++) g.at(g.cyl, -2.4f + i * 0.14f + r * 0.05f + 0.3f, y + 0.08f, -1.36f, 0.042f, 0.14f, 0.042f, jar[(i + r) % 6]);
        }
        g.at(g.box, 1.2f, 1.55f, -1.45f, 1.1f, 0.02f, 0.02f, 0xC3CAD3);
        for (int i = 0; i < 5; i++) g.at(g.sphere, 0.8f + i * 0.18f, 1.22f, -1.42f, 0.04f, 0.04f, 0.04f, 0xC3CAD3);
    }

    void dining() {
        g.at(g.box, -5.4f, -0.01f, 2.2f, 4.6f, 0.02f, 6.4f, 0x9a6b44);
        if (g.cam[0] > -7.5f) g.at(g.box, -7.5f, 1.5f, 2.2f, 0.02f, 3f, 6.4f, 0xb85c38);
        for (float z : new float[] {0.6f, 3.0f}) {
            g.at(g.cyl, -6.2f, 0.74f, z, 0.45f, 0.04f, 0.45f, 0x7a4a2a);
            g.at(g.cyl, -6.2f, 0.37f, z, 0.06f, 0.74f, 0.06f, 0x3a2a1a);
            g.unlit(true);
            g.at(g.sphere, -6.2f, 2.2f, z, 0.13f, 0.08f, 0.13f, 0xffb347);
            g.unlit(false);
        }
    }

    void signs(boolean withDock) {
        g.at(g.box, 1.55f, 1.25f, -1.485f, 0.8f, 0.4f, 0.01f, 0x183F73);
        g.at(g.box, 1.55f, 1.25f, -1.478f, 0.7f, 0.04f, 0.005f, 0xF99A3D);
        g.unlit(true);
        g.at(g.box, -3.04f, 2.45f, 1.8f, 0.01f, 0.22f, 0.55f, 0x2e9e5b);
        g.unlit(false);
        g.at(g.box, -1.25f, 2.45f, -1.48f, 1.0f, 0.36f, 0.01f, withDock ? 0x1D4F91 : 0x3B4656);
        g.at(g.box, 3.08f, 1.6f, 0.9f, 0.01f, 0.4f, 0.8f, 0xFFF4E8);
    }

    void hose(Engine.State s, float[] cyl) {
        float[][] p = {{cyl[0], 1.0f, cyl[2] - 0.15f}, {1.2f, 1.05f, -1.42f}, {0.7f, 0.95f, -1.42f}, {0.45f, 0.95f, -1.25f}};
        for (int i = 0; i < p.length - 1; i++) segment(p[i], p[i + 1], 0.011f, 0xc2410c);
        if (s.flow > 0.01) {
            float off = (time * (float) s.flow * 0.9f) % 1f;
            g.unlit(true);
            for (int i = 0; i < 6; i++) {
                float u = (i / 6f + off) % 1f * 3;
                int seg = Math.min(2, (int) u);
                float f = u - seg;
                g.at(g.sphere, p[seg][0] + (p[seg + 1][0] - p[seg][0]) * f, p[seg][1] + (p[seg + 1][1] - p[seg][1]) * f, p[seg][2] + (p[seg + 1][2] - p[seg][2]) * f, 0.013f, 0.013f, 0.013f, 0xfff2c9);
            }
            g.unlit(false);
        }
    }

    void segment(float[] a, float[] b, float r, int col) {
        float dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
        float len = (float) Math.sqrt(dx * dx + dy * dy + dz * dz);
        g.push();
        g.t((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
        g.ry((float) Math.atan2(dx, dz));
        g.rx((float) Math.atan2(Math.sqrt(dx * dx + dz * dz), dy));
        g.s(r, len, r);
        g.draw(g.cyl, col);
        g.pop();
    }

    void beacon(Engine.State s) {
        boolean on = !"none".equals(s.alarm);
        float p = on ? (float) (0.5 + 0.5 * Math.sin(time * ("critical".equals(s.alarm) ? 16 : 8))) : 1;
        int col = on ? ("critical".equals(s.alarm) ? 0xef4444 : 0xf59e0b) : "ISOLATED".equals(s.supply) ? 0x3b82f6 : 0x22c55e;
        g.at(g.box, 2.2f, 1.99f, -1.42f, 0.16f, 0.06f, 0.1f, 0x1F2733);
        g.unlit(true);
        g.at(g.sphere, 2.2f, 2.03f, -1.42f, 0.07f, 0.07f, 0.07f, Models.scale(col, on ? 0.4f + 0.6f * p : 0.8f));
        g.unlit(false);
    }

    void gas(Engine.State s, float[] cyl, float inc) {
        if (inc >= 0) return;
        float amt = (float) Math.max(0, Math.min(1, (s.gas - 0.05) / 0.75));
        int n = (int) ((lowQuality ? 30 : N_GAS) * Math.min(1, amt * 1.4f));
        float spread = 0.25f + amt * 2.2f;
        for (int i = 0; i < n; i++) {
            float[] p = gasSeeds[i];
            float tt = time * 0.05f * (0.3f + p[3] * 0.7f) + p[4];
            float r = (p[1] * spread + (tt % 1) * 0.3f) * (0.6f + amt);
            float a = p[0] * 6.283f + tt;
            float sc = 0.08f + p[1] * 0.18f * (0.5f + amt);
            g.push();
            g.t(cyl[0] + (float) Math.cos(a) * r, 0.05f + p[2] * (0.35f + amt * 0.9f) * (1 - p[1] * 0.5f), cyl[2] + (float) Math.sin(a) * r * 0.8f + 0.2f);
            g.s(sc, sc, sc);
            g.draw(g.sphere, 0xd8e27a, 0.07f + 0.2f * amt, 0);
            g.pop();
        }
    }

    void steam(Engine.State s) {
        for (int i = 0; i < 6; i++) {
            float ph = (time * 0.35f + i / 6f) % 1;
            float sc = 0.05f + ph * 0.12f;
            g.push();
            g.t(0.22f + (i % 3 - 1) * 0.04f * (1 + ph * 2), 1.35f + ph * 0.9f, -1.1f);
            g.s(sc, sc, sc);
            g.draw(g.sphere, 0xffffff, 0.2f * (1 - ph), 0);
            g.pop();
        }
    }

    void incident(float a, float[] cyl) {
        // smoke
        int n = lowQuality ? 16 : N_SMOKE;
        for (int i = 0; i < n; i++) {
            float[] p = smokeSeeds[i];
            float t = Math.max(0, a - p[2] * 0.6f);
            if (t <= 0) continue;
            float sc = Math.min(0.9f, 0.12f + t * 0.12f * (0.4f + p[3] * 0.8f));
            g.push();
            g.t(cyl[0] + (p[0] - 0.5f) * 1.6f * (0.3f + t * 0.25f), 0.4f + t * 0.32f * (0.4f + p[3] * 0.8f), cyl[2] + 0.3f + (p[1] - 0.5f) * 1.2f * (0.3f + t * 0.2f));
            g.s(sc, sc, sc);
            g.draw(g.sphere, 0x4a4a4a, 0.5f, 0);
            g.pop();
        }
        // scorch
        g.push();
        g.t(cyl[0] - 0.2f, 0.004f, cyl[2] + 0.3f);
        g.s(2.2f, 1, 2.2f);
        g.draw(g.quad, 0x111111, Math.min(0.75f, a * 2), 0);
        g.pop();
        // fireball (additive glow), fades after ~3 s
        if (a < 3.5f) {
            GLES20.glBlendFunc(GLES20.GL_SRC_ALPHA, GLES20.GL_ONE);
            int[] cols = {0xfff3b0, 0xffb347, 0xff7a1a, 0xc2410c};
            g.unlit(true);
            for (int i = 0; i < 4; i++) {
                float grow = Math.min(1, a / (0.35f + i * 0.12f));
                float fade = Math.max(0, 1 - Math.max(0, a - 0.8f - i * 0.2f) / 2.2f);
                float sc = (0.25f + i * 0.22f) * grow * (reduced ? 0.7f : 1f);
                g.push();
                g.t(cyl[0], 0.7f, cyl[2] + 0.1f);
                g.s(sc, sc, sc);
                g.draw(g.sphere, cols[i], 0.85f * fade, 0);
                g.pop();
            }
            g.unlit(false);
            GLES20.glBlendFunc(GLES20.GL_SRC_ALPHA, GLES20.GL_ONE_MINUS_SRC_ALPHA);
        }
    }
}
