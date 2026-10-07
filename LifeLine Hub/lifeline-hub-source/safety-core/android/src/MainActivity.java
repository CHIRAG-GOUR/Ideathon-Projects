package @PKG@;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.ContactsContract;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Hosts the app UI. The UI ships inside the APK (assets/www) and is served for the app's real site origin,
 * so the app opens — and SOS works — with no connection; only /api and Firebase calls use the network.
 */
public class MainActivity extends Activity {
    static final String START = "https://" + Flavor.HOST + "/";
    private static final int REQ_CONTACT = 7, REQ_FILE = 8;

    volatile String currentHost = Flavor.HOST;
    private WebView web;
    private String alertToken, screen;
    private ValueCallback<Uri[]> pendingFiles;
    private PermissionRequest pendingAudio;
    private final Map<Integer, String> permissionNames = new HashMap<>();
    private final long[] volumePresses = new long[4];
    private int volumeIndex;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        Notifs.ensure(this);
        getWindow().setStatusBarColor(Flavor.BACKGROUND);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        web = new WebView(this);
        web.setBackgroundColor(Flavor.BACKGROUND);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setGeolocationEnabled(false); // location always comes from the native layer
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest r) {
                return serveBundled(r);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest r) {
                Uri u = r.getUrl();
                if ("https".equals(u.getScheme()) && Flavor.HOST.equals(u.getHost())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); // tel:, sms:, mailto:, maps, WhatsApp
                } catch (ActivityNotFoundException ignored) {
                }
                return true;
            }

            @Override
            public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                currentHost = Uri.parse(url).getHost();
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                currentHost = Uri.parse(url).getHost();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                // Microphone only for a recording the user starts in the evidence vault; never camera.
                boolean audioOnly = request.getResources().length == 1 && PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(request.getResources()[0]);
                if (!Flavor.AUDIO || !audioOnly || !Flavor.HOST.equals(request.getOrigin().getHost())) {
                    request.deny();
                    return;
                }
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                else {
                    pendingAudio = request;
                    askPermission("microphone", new String[]{Manifest.permission.RECORD_AUDIO});
                }
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingFiles != null) pendingFiles.onReceiveValue(null);
                pendingFiles = callback;
                try {
                    startActivityForResult(params.createIntent(), REQ_FILE);
                    return true;
                } catch (ActivityNotFoundException e) {
                    pendingFiles = null;
                    return false;
                }
            }
        });
        web.addJavascriptInterface(new Bridge(this), "SafetyNative");
        Events.attach(web);

        String deepLink = handleIntent(getIntent());
        if (state != null) web.restoreState(state);
        else web.loadUrl(deepLink != null ? deepLink : START);
    }

    private String handleIntent(Intent i) {
        if (i == null) return null;
        String t = i.getStringExtra("alertToken"), maps = i.getStringExtra("alertMaps");
        if (i.getStringExtra("screen") != null) screen = i.getStringExtra("screen");
        if (t != null || maps != null) {
            if (Build.VERSION.SDK_INT >= 27) {
                setShowWhenLocked(true);
                setTurnScreenOn(true);
            }
            getSystemService(android.app.NotificationManager.class).cancel(Notifs.ID_ALERT);
        }
        if (t != null) return START + "live/" + t; // the contact live view, inside the app
        if (maps != null) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(maps)));
            } catch (ActivityNotFoundException ignored) {
            }
        }
        Uri data = i.getData();
        if (Intent.ACTION_VIEW.equals(i.getAction()) && data != null && Flavor.HOST.equals(data.getHost())) return data.toString();
        return null;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String link = handleIntent(intent);
        if (link != null) web.loadUrl(link);
        else if (screen != null) Events.emit("resume");
    }

    String consumeAlertToken() {
        String t = alertToken;
        alertToken = null;
        return t;
    }

    String consumeScreen() {
        String s = screen;
        screen = null;
        return s;
    }

    /** She Shield Discreet Alert: four presses of volume-down within 3 s while the app is open (if enabled). */
    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        if (Flavor.VOLUME_TRIGGER && e.getKeyCode() == KeyEvent.KEYCODE_VOLUME_DOWN && e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0
                && new Store(this).settings().optBoolean("volumeTrigger", false)) {
            long now = System.currentTimeMillis();
            volumePresses[volumeIndex++ % 4] = now;
            long oldest = Long.MAX_VALUE;
            for (long t : volumePresses) oldest = Math.min(oldest, t);
            if (volumeIndex >= 4 && now - oldest < 3000) {
                volumeIndex = 0;
                java.util.Arrays.fill(volumePresses, 0);
                try {
                    Sos.activate(this, "discreet");
                    Events.emit("discreet_trigger");
                } catch (Exception ignored) {
                }
            }
        }
        return super.dispatchKeyEvent(e);
    }

    // ---- bundled UI ----

    private static final Map<String, String> MIME = new HashMap<>();

    static {
        MIME.put("html", "text/html");
        MIME.put("js", "application/javascript");
        MIME.put("css", "text/css");
        MIME.put("json", "application/json");
        MIME.put("svg", "image/svg+xml");
        MIME.put("webp", "image/webp");
        MIME.put("png", "image/png");
        MIME.put("woff2", "font/woff2");
        MIME.put("woff", "font/woff");
        MIME.put("wav", "audio/wav");
        MIME.put("txt", "text/plain");
        MIME.put("ico", "image/x-icon");
    }

    private WebResourceResponse serveBundled(WebResourceRequest r) {
        Uri u = r.getUrl();
        if (!"https".equals(u.getScheme()) || !Flavor.HOST.equals(u.getHost()) || !"GET".equals(r.getMethod())) return null;
        String path = u.getPath() == null ? "/" : u.getPath();
        if (path.startsWith("/api/") || path.startsWith("/__/")) return null;
        String asset;
        if (path.equals("/") || path.isEmpty()) asset = "index.html";
        else if (path.startsWith("/live/")) asset = "live.html";
        else {
            asset = path.substring(1).replaceAll("/+$", "");
            if (asset.lastIndexOf('.') <= asset.lastIndexOf('/')) asset += ".html";
        }
        if (asset.contains("..")) return null;
        try {
            InputStream in = getAssets().open("www/" + asset);
            String ext = asset.substring(asset.lastIndexOf('.') + 1);
            String mime = MIME.containsKey(ext) ? MIME.get(ext) : "application/octet-stream";
            Map<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "no-cache");
            return new WebResourceResponse(mime, mime.startsWith("text") || mime.endsWith("javascript") || mime.endsWith("json") ? "utf-8" : null, 200, "OK", headers, in);
        } catch (IOException e) {
            return null; // not bundled: fetch from the network
        }
    }

    // ---- permissions & pickers (called from Bridge on a background thread) ----

    void askPermission(final String name, final String[] perms) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                int code = 100 + permissionNames.size();
                permissionNames.put(code, name);
                requestPermissions(perms, code);
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        String name = permissionNames.remove(code);
        if (name == null) return;
        boolean ok = false;
        for (int r : results) ok |= r == PackageManager.PERMISSION_GRANTED;
        if ("microphone".equals(name) && pendingAudio != null) {
            if (ok) pendingAudio.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            else pendingAudio.deny();
            pendingAudio = null;
        }
        Events.emit("permission", "name", name, "granted", ok);
    }

    void pickContact() {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    // The system picker: only the chosen contact is shared with the app — no contacts permission.
                    startActivityForResult(new Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI), REQ_CONTACT);
                } catch (ActivityNotFoundException e) {
                    Events.emit("contact_picked", "cancelled", true);
                }
            }
        });
    }

    @Override
    protected void onActivityResult(int req, int result, Intent data) {
        if (req == REQ_FILE) {
            if (pendingFiles != null) pendingFiles.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            pendingFiles = null;
            return;
        }
        if (req != REQ_CONTACT) return;
        if (result != RESULT_OK || data == null || data.getData() == null) {
            Events.emit("contact_picked", "cancelled", true);
            return;
        }
        try (Cursor cur = getContentResolver().query(data.getData(), new String[]{ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME, ContactsContract.CommonDataKinds.Phone.NUMBER}, null, null, null)) {
            if (cur != null && cur.moveToFirst()) Events.emit("contact_picked", "name", cur.getString(0), "phone", cur.getString(1));
            else Events.emit("contact_picked", "cancelled", true);
        }
    }

    void keepScreenOn(final boolean on) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        Events.emit("resume");
        Events.emit("network", "state", Net.state(this));
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}
