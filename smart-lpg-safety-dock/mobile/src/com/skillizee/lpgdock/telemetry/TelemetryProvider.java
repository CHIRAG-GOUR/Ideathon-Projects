package com.skillizee.lpgdock.telemetry;

import com.skillizee.lpgdock.engine.Engine;
import com.skillizee.lpgdock.sim.SimController;

/**
 * Where readings come from. The screens never know whether they are simulated or real.
 * Today: {@link Simulation}. Later: {@link FutureHardware} fed by the physical dock (Wi-Fi/BLE).
 */
public interface TelemetryProvider {
    final class Reading {
        public boolean connected;
        public String source, cylinderId, safety, supply, usage;
        public Double gas, temp, tilt, flow, cylinderKg; // null = not available (never invented)
        public long at;
    }

    String label();

    Reading read();

    boolean connected();

    String detail();

    final class Simulation implements TelemetryProvider {
        final SimController sim;

        public Simulation(SimController sim) {
            this.sim = sim;
        }

        public String label() { return "Simulation (built-in engine)"; }
        public boolean connected() { return true; }
        public String detail() { return "Simulated telemetry from the Smart Dock engine"; }

        public Reading read() {
            Engine.State s = sim.state;
            Reading r = new Reading();
            r.connected = true;
            r.source = "simulation";
            r.cylinderId = sim.config.cylinderId;
            r.gas = s.gas;
            r.temp = s.temp;
            r.tilt = s.tilt;
            r.flow = s.flow;
            r.cylinderKg = s.cylinderKg;
            r.safety = s.safety;
            r.supply = s.supply;
            r.usage = s.usage;
            r.at = System.currentTimeMillis();
            return r;
        }
    }

    /** Placeholder for the physical Smart Dock: reports "not connected" and returns no values until paired. */
    final class FutureHardware implements TelemetryProvider {
        public String label() { return "Smart Dock hardware (future)"; }
        public boolean connected() { return false; }
        public String detail() { return "No dock hardware paired. Readings appear here once a device is connected."; }

        public Reading read() {
            Reading r = new Reading();
            r.source = "hardware";
            r.at = System.currentTimeMillis();
            return r;
        }
    }
}
