package com.skillizee.lpgdock.gl;

import android.annotation.SuppressLint;
import android.content.Context;
import android.opengl.GLSurfaceView;
import android.view.MotionEvent;
import android.view.ScaleGestureDetector;

/** GLSurfaceView with orbit (drag) and zoom (pinch). Renders only while attached and resumed. */
@SuppressLint("ViewConstructor")
public final class SceneView extends GLSurfaceView {
    public interface Orbit {
        void orbit(float dYaw, float dPitch);

        void zoom(float factor);

        void tap(float x, float y);
    }

    final ScaleGestureDetector scale;
    final Orbit orbit;
    float lx, ly, downX, downY;
    boolean moved;

    public SceneView(Context c, Renderer r, Orbit orbit) {
        super(c);
        this.orbit = orbit;
        setEGLContextClientVersion(2);
        setEGLConfigChooser(8, 8, 8, 8, 16, 0);
        setPreserveEGLContextOnPause(true);
        setRenderer(r);
        setRenderMode(RENDERMODE_CONTINUOUSLY);
        scale = new ScaleGestureDetector(c, new ScaleGestureDetector.SimpleOnScaleGestureListener() {
            @Override
            public boolean onScale(ScaleGestureDetector d) {
                orbit.zoom(1f / d.getScaleFactor());
                moved = true;
                return true;
            }
        });
        setContentDescription("3D simulation view. Drag to orbit, pinch to zoom.");
    }

    @Override
    public boolean onTouchEvent(MotionEvent e) {
        scale.onTouchEvent(e);
        switch (e.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                lx = downX = e.getX();
                ly = downY = e.getY();
                moved = false;
                getParent().requestDisallowInterceptTouchEvent(true);
                break;
            case MotionEvent.ACTION_MOVE:
                if (e.getPointerCount() == 1 && !scale.isInProgress()) {
                    float dx = e.getX() - lx, dy = e.getY() - ly;
                    if (Math.abs(e.getX() - downX) + Math.abs(e.getY() - downY) > 12) moved = true;
                    if (moved) orbit.orbit(-dx * 0.008f, dy * 0.006f);
                }
                lx = e.getX();
                ly = e.getY();
                break;
            case MotionEvent.ACTION_UP:
                if (!moved) orbit.tap(e.getX(), e.getY());
                getParent().requestDisallowInterceptTouchEvent(false);
                break;
            default:
        }
        return true;
    }
}
