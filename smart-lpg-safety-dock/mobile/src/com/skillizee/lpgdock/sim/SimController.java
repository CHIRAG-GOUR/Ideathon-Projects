package com.skillizee.lpgdock.sim;

import com.skillizee.lpgdock.engine.Engine;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/** Owns one engine run: clock, speed, pause, faults. Screens and the 3D renderer only read {@link #state}. */
public final class SimController {
    public interface Listener {
        void onChange(SimController c);
    }

    public final Engine.Config config;
    public Engine.State state;
    public String scenario, mode;
    public boolean running;
    public double speed = 1;
    public String sessionId = newId();
    public long startedAtWall = System.currentTimeMillis();
    private double carry;
    private final List<Listener> listeners = new ArrayList<>();

    public SimController(Engine.Config config, String scenario, String mode) {
        this.config = config;
        this.scenario = scenario;
        this.mode = mode;
        this.state = Engine.create(scenario, mode, config);
    }

    public void add(Listener l) {
        if (!listeners.contains(l)) listeners.add(l);
    }

    public void remove(Listener l) {
        listeners.remove(l);
    }

    public void notifyChange() {
        for (Listener l : new ArrayList<>(listeners)) l.onChange(this);
    }

    /** Called by {@link Clock} on the main thread. */
    public boolean tick(double wallDt) {
        if (!running) return false;
        double before = state.t;
        carry = Engine.advance(state, Math.min(wallDt, 0.25) * speed, carry, config);
        Engine.Event out = Engine.event(state, "contained");
        if (out == null) out = Engine.event(state, "recovery");
        if (out != null && state.t - out.t > 6) running = false;
        return state.t != before;
    }

    public boolean isFinished() {
        return !"NONE".equals(state.outcome) && !running;
    }

    public void start() {
        if (isFinished()) restart(scenario, mode, false);
        running = true;
        notifyChange();
    }

    public void pause() {
        running = false;
        notifyChange();
    }

    public void restart(String scenario, String mode, boolean autostart) {
        this.scenario = scenario;
        this.mode = mode;
        state = Engine.create(scenario, mode, config);
        carry = 0;
        sessionId = newId();
        startedAtWall = System.currentTimeMillis();
        running = autostart;
        notifyChange();
    }

    public void restart() {
        restart(scenario, mode, false);
    }

    public void inject(String fault) {
        Engine.inject(state, fault, config);
        if (!running && "NONE".equals(state.outcome)) running = true;
        notifyChange();
    }

    public void clearFaults() {
        Engine.clearFaults(state);
        notifyChange();
    }

    static String newId() {
        String a = "abcdefghijklmnopqrstuvwxyz0123456789";
        Random r = new Random();
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < 16; i++) b.append(a.charAt(r.nextInt(a.length())));
        return b.toString();
    }
}
