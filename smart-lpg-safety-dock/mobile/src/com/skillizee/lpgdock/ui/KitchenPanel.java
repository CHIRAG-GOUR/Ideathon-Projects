package com.skillizee.lpgdock.ui;

import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.TextView;
import com.skillizee.lpgdock.engine.Engine;
import com.skillizee.lpgdock.gl.KitchenRenderer;
import com.skillizee.lpgdock.gl.SceneView;
import com.skillizee.lpgdock.services.Prefs;
import com.skillizee.lpgdock.sim.SimController;

/** GL kitchen + native overlays (incident label, flash, frozen state, chef bubble). One or two simulations. */
public final class KitchenPanel {
    public final FrameLayout view;
    final KitchenRenderer renderer;
    final SceneView gl;
    final View flash;
    final TextView banner, bottom, bubble;
    final SimController[] sims;

    public KitchenPanel(MainActivity a, SimController... sims) {
        this.sims = sims;
        view = new FrameLayout(a);
        view.setBackground(Ui.round(0xFF2a2f38, 16, 0));
        view.setClipToOutline(true);
        renderer = new KitchenRenderer(sims);
        renderer.lowQuality = a.lowQuality();
        renderer.reduced = Prefs.reducedMotion(a);
        gl = new SceneView(a, renderer, new SceneView.Orbit() {
            public void orbit(float dy, float dp) {
                renderer.yaw += dy;
                renderer.pitch = Math.max(0.05f, Math.min(1.35f, renderer.pitch + dp));
                renderer.touchedAt = System.currentTimeMillis();
            }

            public void zoom(float f) {
                renderer.dist = Math.max(2f, Math.min(9f, renderer.dist * f));
                renderer.touchedAt = System.currentTimeMillis();
            }

            public void tap(float x, float y) {}
        });
        view.addView(gl, new FrameLayout.LayoutParams(-1, -1));
        flash = new View(a);
        flash.setBackgroundColor(0xFFFFFFFF);
        flash.setAlpha(0);
        view.addView(flash, new FrameLayout.LayoutParams(-1, -1));
        banner = Ui.mono("SIMULATED INCIDENT — FOR DEMONSTRATION ONLY\nEducational visualisation · not a prediction of real LPG behaviour", 10.5f, Ui.WHITE);
        banner.setGravity(Gravity.CENTER);
        banner.setBackground(Ui.round(0xF2B42318, 10, 0));
        banner.setPadding(Ui.dp(10), Ui.dp(6), Ui.dp(10), Ui.dp(6));
        banner.setVisibility(View.GONE);
        FrameLayout.LayoutParams bp = new FrameLayout.LayoutParams(-2, -2, Gravity.TOP | Gravity.CENTER_HORIZONTAL);
        bp.topMargin = Ui.dp(10);
        view.addView(banner, bp);
        bottom = Ui.mono("", 11, Ui.WHITE);
        bottom.setBackground(Ui.round(0xD91F2733, 8, 0));
        bottom.setPadding(Ui.dp(8), Ui.dp(4), Ui.dp(8), Ui.dp(4));
        bottom.setVisibility(View.GONE);
        FrameLayout.LayoutParams bo = new FrameLayout.LayoutParams(-2, -2, Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
        bo.bottomMargin = Ui.dp(10);
        view.addView(bottom, bo);
        bubble = Ui.text("Chef: “Whew!” 😮‍💨  All clear.", 13, Ui.OK, true);
        bubble.setBackground(Ui.round(Ui.WHITE, 99, 0xFFCDEEDB));
        bubble.setPadding(Ui.dp(12), Ui.dp(6), Ui.dp(12), Ui.dp(6));
        bubble.setVisibility(View.GONE);
        FrameLayout.LayoutParams bb = new FrameLayout.LayoutParams(-2, -2, Gravity.TOP | Gravity.START);
        bb.topMargin = Ui.dp(10);
        bb.leftMargin = Ui.dp(10);
        view.addView(bubble, bb);
        view.setContentDescription("3D kitchen simulation");
    }

    public void update() {
        SimController focus = sims[sims.length - 1];
        boolean incident = false, frozen = false, relieved = false;
        float flashA = 0;
        for (SimController sc : sims) {
            Engine.State s = sc.state;
            if (s.incidentAt >= 0) {
                incident = true;
                double age = s.t - s.incidentAt;
                if (age < 0.9) flashA = Math.max(flashA, (float) ((Prefs.reducedMotion(view.getContext()) ? 0.35 : 1) * (1 - age / 0.9)));
            }
            frozen |= "RECOVERY".equals(s.phase);
            relieved |= "relieved".equals(s.chefAction);
        }
        flash.setAlpha(flashA);
        banner.setVisibility(incident ? View.VISIBLE : View.GONE);
        bubble.setVisibility(relieved ? View.VISIBLE : View.GONE);
        Engine.State fs = focus.state;
        String txt = frozen ? "SIMULATION FROZEN · press Restart" : fs.gas > 0.09 && fs.incidentAt < 0 ? "Yellow cloud = SIMULATED GAS (LPG itself is invisible)" : null;
        bottom.setText(txt);
        bottom.setVisibility(txt == null ? View.GONE : View.VISIBLE);
        view.setContentDescription("3D kitchen — " + Engine.headline(fs) + ". Chef " + fs.chefAction + ". Gas " + Engine.f2(fs.gas) + " ppm.");
    }

    public void onResume() {
        gl.onResume();
    }

    public void onPause() {
        gl.onPause();
    }

}
