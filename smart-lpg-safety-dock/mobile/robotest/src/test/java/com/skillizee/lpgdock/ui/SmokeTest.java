package com.skillizee.lpgdock.ui;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.content.res.Configuration;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import com.skillizee.lpgdock.engine.Engine;
import com.skillizee.lpgdock.services.Prefs;
import com.skillizee.lpgdock.services.Sessions;
import com.skillizee.lpgdock.sim.App;
import com.skillizee.lpgdock.sim.SimController;
import java.util.ArrayList;
import java.util.List;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.android.controller.ActivityController;
import org.robolectric.annotation.Config;
import org.robolectric.shadows.ShadowLooper;

/**
 * Builds the real activity and every screen on the JVM, drives both scenarios through the real engine,
 * and checks what the screens say. GL rendering itself is not exercised (no GPU here).
 */
@RunWith(RobolectricTestRunner.class)
@Config(qualifiers = "w360dp-h780dp-port")
public class SmokeTest {
    /** The app's frame clock re-posts itself every frame; keep the looper paused and drive the simulations by hand. */
    @Before
    public void pauseLooper() {
        ShadowLooper.pauseMainLooper();
        App.main = null;
        App.config = null;
    }

    static void texts(View v, List<String> out) {
        if (v instanceof TextView) out.add(((TextView) v).getText().toString());
        if (v instanceof ViewGroup) for (int i = 0; i < ((ViewGroup) v).getChildCount(); i++) texts(((ViewGroup) v).getChildAt(i), out);
    }

    static String all(MainActivity a) {
        List<String> t = new ArrayList<>();
        texts(a.getWindow().getDecorView(), t);
        return String.join("\n", t);
    }

    /** Runs a simulation forward like the frame clock would, notifying listeners ~12×/s. */
    static void run(SimController s, double seconds) {
        for (int i = 0; i < seconds * 12; i++) {
            s.tick(1 / 12.0);
            s.notifyChange();
        }
    }

    @Test
    public void everyScreenBuildsAndUpdates() {
        ActivityController<MainActivity> c = Robolectric.buildActivity(MainActivity.class).setup();
        MainActivity a = c.get();
        assertTrue(all(a).contains("SYSTEM NORMAL"));
        assertTrue(all(a).contains("START SIMULATION"));
        for (int i = 0; i < 8; i++) {
            a.go(i);
            assertNotNull(MainActivity.NAMES[i], a.screens[i]);
            a.screens[i].update();
        }
        c.pause().resume();
        c.pause().stop().destroy();
    }

    @Test
    public void withDockRunIsContainedAndSaved() {
        ActivityController<MainActivity> c = Robolectric.buildActivity(MainActivity.class).setup();
        MainActivity a = c.get();
        Sessions.clear(a);
        a.go(MainActivity.SIM);
        App.main.restart("with", "scripted", true);
        run(App.main, 45);
        Engine.State s = App.main.state;
        assertEquals("CONTAINED", s.outcome);
        assertEquals("ISOLATED", s.supply);
        String txt = all(a);
        assertTrue(txt, txt.contains("WITH SMART LPG DOCK"));
        assertTrue(txt, txt.contains("CONTAINED"));
        assertTrue("finished run saved on device", Sessions.list(a).length() >= 1);
        a.go(MainActivity.EVENTS);
        assertTrue(all(a).contains("CONTAINED"));
        c.pause().stop().destroy();
    }

    @Test
    public void withoutDockShowsSimulatedIncidentLabel() {
        ActivityController<MainActivity> c = Robolectric.buildActivity(MainActivity.class).setup();
        MainActivity a = c.get();
        a.go(MainActivity.SIM);
        App.main.restart("without", "scripted", true);
        run(App.main, 26);
        assertTrue(App.main.state.incidentAt >= 0);
        String txt = all(a);
        assertTrue(txt, txt.contains("SIMULATED INCIDENT — FOR DEMONSTRATION ONLY"));
        c.pause().stop().destroy();
    }

    @Test
    public void compareRunsBothOnOneTimeline() {
        ActivityController<MainActivity> c = Robolectric.buildActivity(MainActivity.class).setup();
        MainActivity a = c.get();
        App.left.restart("without", "scripted", true);
        App.right.restart("with", "scripted", true);
        a.go(MainActivity.COMPARE);
        for (int i = 0; i < 40 * 12; i++) {
            App.left.tick(1 / 12.0);
            App.right.tick(1 / 12.0);
            App.left.notifyChange();
            App.right.notifyChange();
        }
        String txt = all(a);
        assertTrue(txt, txt.contains("INCIDENT ESCALATION"));
        assertTrue(txt, txt.contains("INCIDENT CONTAINED"));
        c.pause().stop().destroy();
    }

    @Test
    public void faultsAndPresentationAndSettings() {
        ActivityController<MainActivity> c = Robolectric.buildActivity(MainActivity.class).setup();
        MainActivity a = c.get();
        App.main.restart("with", "free", true);
        for (String f : new String[] {"leak", "heat", "tilt", "usage"}) App.main.inject(f);
        run(App.main, 20);
        assertTrue(Engine.hasEvent(App.main.state, "isolated"));
        a.go(MainActivity.PRESENT);
        PresentationScreen p = (PresentationScreen) a.screens[MainActivity.PRESENT];
        for (int i = 0; i < PresentationScreen.CH.length; i++) {
            p.goTo(i);
            p.update();
            assertTrue(all(a).contains(PresentationScreen.CH[i][0].toUpperCase()));
        }
        assertTrue(all(a).contains("From simulator to a real dock."));
        p.goTo(8);
        assertTrue(all(a).contains("WITH DOCK · EARLY WARNING"));
        a.go(MainActivity.SETTINGS);
        assertTrue(all(a).contains("Cloud sync is not configured in this build."));
        assertTrue(all(a).contains("CONCEPT / PROTOTYPE"));
        c.pause().stop().destroy();
    }

    @Test
    public void rotationAndNarrowScreenAndRail() {
        ActivityController<MainActivity> c = Robolectric.buildActivity(MainActivity.class).setup();
        MainActivity a = c.get();
        a.go(MainActivity.SIM);
        Configuration land = new Configuration(a.getResources().getConfiguration());
        land.orientation = Configuration.ORIENTATION_LANDSCAPE;
        land.screenWidthDp = 800;
        land.screenHeightDp = 360;
        c.configurationChange(land);
        assertEquals(MainActivity.SIM, a.current);
        assertTrue("side rail on wide screens", all(a).contains("Presentation"));
        for (int i = 0; i < 8; i++) a.go(i);
        c.pause().stop().destroy();
    }

    @Test
    @Config(qualifiers = "w320dp-h568dp-port")
    public void smallestPhone() {
        ActivityController<MainActivity> c = Robolectric.buildActivity(MainActivity.class).setup();
        MainActivity a = c.get();
        for (int i = 0; i < 8; i++) a.go(i);
        Prefs.muted(a, true);
        a.refreshMute();
        assertEquals("Sound off. Tap to turn sound on", a.mute.getContentDescription().toString());
        c.pause().stop().destroy();
    }
}
