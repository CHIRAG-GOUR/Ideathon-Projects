package com.skillizee.lpgdock.sim;

import android.view.Choreographer;

/** One clock for every running simulation, driven by the display's frame callbacks. Paused with the activity. */
public final class Clock implements Choreographer.FrameCallback {
    private final SimController[] sims;
    private long last;
    private boolean on;
    private long lastNotify;

    public Clock(SimController... sims) {
        this.sims = sims;
    }

    public void resume() {
        if (on) return;
        on = true;
        last = 0;
        Choreographer.getInstance().postFrameCallback(this);
    }

    public void pause() {
        on = false;
    }

    @Override
    public void doFrame(long now) {
        if (!on) return;
        double dt = last == 0 ? 0 : (now - last) / 1e9;
        last = now;
        boolean changed = false;
        int[] before = new int[sims.length];
        for (int i = 0; i < sims.length; i++) {
            before[i] = sims[i].state.events.size();
            changed |= sims[i].tick(dt);
        }
        // UI refresh ~12×/s, or immediately when a new event arrives. The GL view reads state every frame itself.
        boolean newEvent = false;
        for (int i = 0; i < sims.length; i++) newEvent |= sims[i].state.events.size() != before[i];
        if (changed && (newEvent || now - lastNotify > 83_000_000L)) {
            lastNotify = now;
            for (SimController s : sims) s.notifyChange();
        }
        Choreographer.getInstance().postFrameCallback(this);
    }
}
