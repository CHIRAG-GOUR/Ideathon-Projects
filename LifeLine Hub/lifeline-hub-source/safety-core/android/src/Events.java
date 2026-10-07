package @PKG@;

import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;

import org.json.JSONException;
import org.json.JSONObject;

import java.lang.ref.WeakReference;

/** Pushes native events to the UI when it is open. The safety layer never depends on anyone listening. */
final class Events {
    private static WeakReference<WebView> view = new WeakReference<>(null);
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    static void attach(WebView w) {
        view = new WeakReference<>(w);
    }

    static void emit(String type, Object... kv) {
        final JSONObject o = new JSONObject();
        try {
            o.put("type", type);
            for (int i = 0; i + 1 < kv.length; i += 2) o.put((String) kv[i], kv[i + 1] == null ? JSONObject.NULL : kv[i + 1]);
        } catch (JSONException ignored) {
        }
        MAIN.post(new Runnable() {
            @Override
            public void run() {
                WebView w = view.get();
                if (w != null) w.evaluateJavascript("window.__safetyNative&&window.__safetyNative(" + JSONObject.quote(o.toString()) + ")", null);
            }
        });
    }
}
