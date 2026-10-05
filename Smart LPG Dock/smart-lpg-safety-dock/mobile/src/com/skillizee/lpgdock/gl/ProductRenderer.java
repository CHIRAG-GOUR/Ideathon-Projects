package com.skillizee.lpgdock.gl;

import android.opengl.GLES20;
import android.opengl.GLSurfaceView;
import com.skillizee.lpgdock.sim.SimController;
import javax.microedition.khronos.egl.EGLConfig;
import javax.microedition.khronos.opengles.GL10;

/** Inspectable cylinder + Smart Dock: orbit, explode, tap a component. The status ring follows the live simulation. */
public final class ProductRenderer implements GLSurfaceView.Renderer {
    final Gl g = new Gl();
    final SimController sim;
    public volatile float yaw = 0.7f, pitch = 0.32f, dist = 2.6f, explode = 0.55f;
    public volatile int selected = 3;
    public volatile boolean autoRotate = true;
    int w = 1, h = 1;
    float time;
    long last;
    final float[] anchors = new float[Models.PARTS.length * 3];
    final float[] vpCopy = new float[16];
    final float[] anchorCopy = new float[Models.PARTS.length * 3];

    public ProductRenderer(SimController sim) {
        this.sim = sim;
    }

    @Override
    public void onSurfaceCreated(GL10 u, EGLConfig c) {
        g.init();
        GLES20.glClearColor(0.96f, 0.93f, 0.886f, 1);
    }

    @Override
    public void onSurfaceChanged(GL10 u, int width, int height) {
        w = Math.max(1, width);
        h = Math.max(1, height);
        GLES20.glViewport(0, 0, w, h);
    }

    @Override
    public void onDrawFrame(GL10 u) {
        long now = System.nanoTime();
        float dt = last == 0 ? 0 : Math.min(0.1f, (now - last) / 1e9f);
        last = now;
        time += dt;
        if (autoRotate) yaw += dt * 0.25f;
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT | GLES20.GL_DEPTH_BUFFER_BIT);
        float ty = 0.42f + explode * 0.2f;
        float ex = dist * (float) (Math.cos(pitch) * Math.sin(yaw)), ey = ty + dist * (float) Math.sin(pitch), ez = dist * (float) (Math.cos(pitch) * Math.cos(yaw));
        g.begin((float) w / h, 38, ex, ey, ez, 0, ty, 0, new float[] {0.96f, 0.93f, 0.886f});
        g.pointLight(-2, 2, -2, 0.3f, 0.35f, 0.45f);
        // display plinth sits under the dock base, which moves down as the view explodes
        g.at(g.cyl, 0, -explode * 0.25f - 0.004f, 0, 0.9f, 0.004f, 0.9f, 0xE7DECF);
        Models.cylinderDock(g, true, Models.led(sim.state), "ISOLATED".equals(sim.state.supply) ? 1 : 0, 0, 0, false, explode, selected, time, anchors);
        synchronized (vpCopy) {
            System.arraycopy(g.vp, 0, vpCopy, 0, 16);
            System.arraycopy(anchors, 0, anchorCopy, 0, anchors.length);
        }
    }

    /** UI thread: which part is under the tap (nearest projected anchor within 70 px), or -1. */
    public int pick(float x, float y) {
        int best = -1;
        float bd = 70 * 70;
        float[] o = new float[2];
        synchronized (vpCopy) {
            for (int i = 0; i < Models.PARTS.length; i++) {
                if (!Gl.project(vpCopy, anchorCopy[i * 3], anchorCopy[i * 3 + 1], anchorCopy[i * 3 + 2], w, h, o)) continue;
                float d = (o[0] - x) * (o[0] - x) + (o[1] - y) * (o[1] - y);
                if (d < bd) {
                    bd = d;
                    best = i;
                }
            }
        }
        return best;
    }
}
