import com.skillizee.lpgdock.engine.Engine;
import java.nio.file.Files;
import java.nio.file.Paths;
import org.json.JSONArray;
import org.json.JSONObject;

/** Runs the Java engine on the same scripted inputs as shared/fixtures/traces.json and compares every sample and event. */
public class Parity {
    public static void main(String[] a) throws Exception {
        Engine.Config c = Engine.Config.parse(new String(Files.readAllBytes(Paths.get(a[0])), "UTF-8"));
        JSONArray runs = new JSONArray(new String(Files.readAllBytes(Paths.get(a[1])), "UTF-8"));
        int fails = 0, checks = 0;
        for (int r = 0; r < runs.length(); r++) {
            JSONObject run = runs.getJSONObject(r);
            Engine.State s = Engine.create(run.getString("scenario"), run.getString("mode"), c);
            JSONArray inj = run.getJSONArray("inj");
            int qi = 0;
            JSONArray samples = run.getJSONArray("samples");
            int steps = (int) Math.round(run.getDouble("seconds") / c.stepSec);
            int si = 0;
            for (int i = 0; i < steps; i++) {
                while (qi < inj.length() && inj.getJSONObject(qi).getDouble("at") <= s.t + 1e-9) {
                    String f = inj.getJSONObject(qi++).getString("fault");
                    if (f.equals("clear")) Engine.clearFaults(s);
                    else Engine.inject(s, f, c);
                }
                Engine.step(s, c);
                if ((i + 1) % 10 == 0) {
                    JSONObject e = samples.getJSONObject(si++);
                    String[] str = {"phase", "safety", "supply", "chef"};
                    String[] got = {s.phase, s.safety, s.supply, s.chefAction};
                    for (int k = 0; k < 4; k++) {
                        checks++;
                        if (!e.getString(str[k]).equals(got[k])) {
                            fails++;
                            System.out.println(run.getString("name") + " t=" + s.t + " " + str[k] + ": ts=" + e.getString(str[k]) + " java=" + got[k]);
                        }
                    }
                    String[] num = {"t", "gas", "temp", "tilt", "flow", "kg", "x", "z"};
                    double[] gv = {s.t, s.gas, s.temp, s.tilt, s.flow, s.cylinderKg, s.chefX, s.chefZ};
                    for (int k = 0; k < num.length; k++) {
                        checks++;
                        double ev = e.getDouble(num[k]);
                        if (Math.abs(ev - gv[k]) > 1e-7 * Math.max(1, Math.abs(ev))) {
                            fails++;
                            System.out.println(run.getString("name") + " t=" + s.t + " " + num[k] + ": ts=" + ev + " java=" + gv[k]);
                        }
                    }
                }
            }
            JSONArray ev = run.getJSONArray("events");
            checks++;
            if (ev.length() != s.events.size()) {
                fails++;
                System.out.println(run.getString("name") + " event count ts=" + ev.length() + " java=" + s.events.size());
            }
            for (int i = 0; i < Math.min(ev.length(), s.events.size()); i++) {
                JSONObject e = ev.getJSONObject(i);
                Engine.Event g = s.events.get(i);
                checks++;
                if (!e.getString("kind").equals(g.kind) || Math.abs(e.getDouble("t") - g.t) > 1e-9 || !e.getString("text").equals(g.text)) {
                    fails++;
                    System.out.println(run.getString("name") + " event " + i + ": ts=[" + e.getDouble("t") + " " + e.getString("text") + "] java=[" + g.t + " " + g.text + "]");
                }
            }
        }
        System.out.println(fails == 0 ? "PARITY OK — " + checks + " checks, Java engine matches the TypeScript engine" : fails + " PARITY FAILURES of " + checks);
        System.exit(fails == 0 ? 0 : 1);
    }
}
