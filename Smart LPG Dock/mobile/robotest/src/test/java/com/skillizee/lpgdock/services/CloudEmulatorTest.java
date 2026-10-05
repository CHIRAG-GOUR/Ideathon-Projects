package com.skillizee.lpgdock.services;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import android.content.Context;
import com.skillizee.lpgdock.sim.App;
import com.skillizee.lpgdock.sim.SimController;
import java.util.Arrays;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Assume;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;

/**
 * The Android app's own Firebase REST code against the Auth + Firestore emulators and the real firestore.rules.
 * Runs only when -DfirestoreEmulator=host:port and -DauthEmulator=host:port are given (see mobile/robotest/run.sh).
 */
@RunWith(RobolectricTestRunner.class)
public class CloudEmulatorTest {
    static String prop(String k) {
        String v = System.getProperty(k, "");
        return v.startsWith("$") ? "" : v;
    }

    Context c;
    String base;

    @Before
    public void setUp() throws Exception {
        Assume.assumeTrue("emulators not configured", !prop("firestoreEmulator").isEmpty() && !prop("authEmulator").isEmpty());
        c = RuntimeEnvironment.application;
        Cloud.override = new JSONObject().put("apiKey", "demo-key").put("projectId", "demo-lpgdock")
                .put("authEmulator", prop("authEmulator")).put("firestoreEmulator", prop("firestoreEmulator"));
        base = "http://" + prop("firestoreEmulator") + "/v1/projects/demo-lpgdock/databases/(default)/documents/";
        App.config = null;
        App.init(c);
    }

    static String email(String who) {
        return who + "-" + System.nanoTime() + "@example.com";
    }

    @Test
    public void signedInRunIsSavedAndProtectedByRules() throws Exception {
        Cloud.signIn(c, email("android"), "secret123", true);
        String uidA = Prefs.get(c, "uid"), tokenA = Cloud.token(c);
        assertTrue(uidA != null && tokenA != null);

        SimController sim = new SimController(App.config, "with", "scripted");
        sim.start();
        for (int i = 0; i < 60 * 20 && !sim.isFinished(); i++) sim.tick(0.05);
        assertTrue("run finished", sim.isFinished());
        JSONObject o = Sessions.summarise(sim);
        Cloud.saveSession(c, o);

        JSONObject doc = Cloud.http("GET", base + "simulationSessions/" + sim.sessionId, null, tokenA);
        JSONObject f = doc.getJSONObject("fields");
        assertEquals("CONTAINED", f.getJSONObject("outcome").getString("stringValue"));
        assertEquals(uidA, f.getJSONObject("ownerUid").getString("stringValue"));
        assertEquals(o.getJSONArray("events").length(), Integer.parseInt(f.getJSONObject("eventCount").getString("integerValue")));
        JSONObject ev = Cloud.http("GET", base + "simulationEvents/" + sim.sessionId + "_000", null, tokenA);
        assertEquals("cooking_started", ev.getJSONObject("fields").getJSONObject("kind").getString("stringValue"));

        Cloud.savePresentation(c, Arrays.asList(0, 1, 2, 8), System.currentTimeMillis() - 60000);

        // A second account cannot read A's run, nor write a run that claims to be A's.
        Cloud.signOut(c);
        Cloud.signIn(c, email("other"), "secret123", true);
        String tokenB = Cloud.token(c);
        try {
            Cloud.http("GET", base + "simulationSessions/" + sim.sessionId, null, tokenB);
            fail("user B read user A's session");
        } catch (Exception expected) {
            assertTrue(expected.getMessage(), expected.getMessage().contains("PERMISSION") || expected.getMessage().contains("403") || expected.getMessage().toLowerCase().contains("permission"));
        }
        JSONObject forged = new JSONObject().put("writes", new JSONArray().put(new JSONObject().put("update", new JSONObject()
                .put("name", "projects/demo-lpgdock/databases/(default)/documents/simulationSessions/forged-" + System.nanoTime())
                .put("fields", new JSONObject().put("ownerUid", Cloud.v(uidA)).put("scenario", Cloud.v("with")).put("mode", Cloud.v("scripted"))
                        .put("outcome", Cloud.v("CONTAINED")).put("durationSec", Cloud.v(1.0)).put("eventCount", Cloud.v(0))))));
        try {
            Cloud.http("POST", base.replaceAll("/documents/$", "/documents:commit"), forged, tokenB);
            fail("user B wrote a session owned by user A");
        } catch (Exception expected) {
            assertTrue(expected.getMessage(), expected.getMessage().toLowerCase().contains("permission"));
        }
        Cloud.signOut(c);
    }

    @Test
    public void wrongPasswordGivesAReadableError() throws Exception {
        String e = email("pw");
        Cloud.signIn(c, e, "secret123", true);
        Cloud.signOut(c);
        try {
            Cloud.signIn(c, e, "wrong-password", false);
            fail("signed in with a wrong password");
        } catch (Exception expected) {
            assertEquals("Email or password is incorrect.", expected.getMessage());
        }
    }
}
