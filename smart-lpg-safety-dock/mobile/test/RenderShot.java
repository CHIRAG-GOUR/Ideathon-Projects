import android.opengl.GLES20;
import com.skillizee.lpgdock.engine.Engine;
import com.skillizee.lpgdock.gl.KitchenRenderer;
import com.skillizee.lpgdock.gl.ProductRenderer;
import com.skillizee.lpgdock.sim.SimController;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;

/**
 * TEST-ONLY: runs the app's real renderers on the JVM against the recording GLES20 stub and writes one frame as JSON.
 *   RenderShot <dock-config.json> <kitchen|compare|product> <scenario> <seconds> <w> <h> <out.json>
 */
public class RenderShot {
    public static void main(String[] a) throws Exception {
        Engine.Config c = Engine.Config.parse(new String(Files.readAllBytes(Paths.get(a[0])), StandardCharsets.UTF_8));
        String kind = a[1], scen = a[2];
        double secs = Double.parseDouble(a[3]);
        int w = Integer.parseInt(a[4]), h = Integer.parseInt(a[5]);
        SimController[] sims = "compare".equals(kind)
                ? new SimController[] {new SimController(c, "without", "scripted"), new SimController(c, "with", "scripted")}
                : new SimController[] {new SimController(c, scen, "scripted")};
        int frames = 120;
        Object r = "product".equals(kind) ? new ProductRenderer(sims[0]) : new KitchenRenderer(sims);
        android.opengl.GLSurfaceView.Renderer gr = (android.opengl.GLSurfaceView.Renderer) r;
        gr.onSurfaceCreated(null, null);
        gr.onSurfaceChanged(null, w, h);
        GLES20.markSetup();
        // Advance the simulation so it reaches `secs` on the last frame; the renderer's smoothing sees real frame steps.
        double pre = Math.max(0, secs - frames / 60.0);
        for (SimController s : sims) {
            int n = (int) Math.round(pre / c.stepSec);
            for (int i = 0; i < n; i++) Engine.step(s.state, c);
        }
        double[] carry = new double[sims.length];
        for (int f = 0; f < frames; f++) {
            for (int k = 0; k < sims.length; k++) carry[k] = Engine.advance(sims[k].state, (secs - pre) / frames, carry[k], c);
            GLES20.resetFrame();
            gr.onDrawFrame(null);
            Thread.sleep(16);
        }
        Files.write(Paths.get(a[6]), GLES20.json().getBytes(StandardCharsets.UTF_8));
        System.out.println(kind + " " + scen + " t=" + Engine.clock(sims[sims.length - 1].state.t) + " phase=" + sims[sims.length - 1].state.phase);
    }
}
