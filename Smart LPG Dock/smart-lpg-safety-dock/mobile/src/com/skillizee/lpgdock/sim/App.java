package com.skillizee.lpgdock.sim;

import android.content.Context;
import com.skillizee.lpgdock.engine.Engine;
import com.skillizee.lpgdock.services.Prefs;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/** Process-wide holders: config (from the shared dock-config.json asset), the main and compare simulations, the clock. */
public final class App {
    public static Engine.Config config;
    public static SimController main, left, right;
    public static Clock clock;

    public static void init(Context c) {
        if (config != null) return;
        try {
            config = Engine.Config.parse(asset(c, "dock-config.json"));
        } catch (Exception e) {
            throw new IllegalStateException("dock-config.json missing or invalid", e);
        }
        main = new SimController(config, "with", "scripted");
        left = new SimController(config, "without", "scripted");
        right = new SimController(config, "with", "scripted");
        double sp = Prefs.speed(c);
        main.speed = left.speed = right.speed = sp;
        clock = new Clock(main, left, right);
    }

    public static String asset(Context c, String name) throws Exception {
        try (InputStream in = c.getAssets().open(name)) {
            ByteArrayOutputStream o = new ByteArrayOutputStream();
            byte[] b = new byte[8192];
            int n;
            while ((n = in.read(b)) > 0) o.write(b, 0, n);
            return o.toString("UTF-8");
        }
    }
}
