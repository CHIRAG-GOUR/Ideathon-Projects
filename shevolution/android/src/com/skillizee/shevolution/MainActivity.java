package com.skillizee.shevolution;

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
import android.view.WindowManager;
import android.webkit.PermissionRequest;
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
 * Hosts the Shevolution UI. The UI files ship inside the APK (assets/www) and are served for the real site
 * origin, so the app opens and SOS works with no connection; only /api calls go to the network.
 */
public class MainActivity extends Activity {
    static final String HOST = "shevolution-ideathon.web.app";
    static final String ALT_HOST = "shevolution.web.app";
    static final String START = "https://" + HOST + "/app";
    private static final int REQ_CONTACT = 7;

    static boolean isHostAllowed(String host) {
        return HOST.equalsIgnoreCase(host) || ALT_HOST.equalsIgnoreCase(host);
    }

    volatile String currentHost = HOST;
    private WebView web;
    private String alertToken;
    private final Map<Integer, String> permissionNames = new HashMap<>();

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        Notifs.ensure(this);
        getWindow().setStatusBarColor(Color.parseColor("#FFFBFB"));
        getWindow().getDecorView().setSystemUiVisibility(android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#FFFBFB"));
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setGeolocationEnabled(false); // location always comes from the native layer
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest r) {
                return serveBundled(r);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest r) {
                Uri u = r.getUrl();
                if ("https".equals(u.getScheme()) && isHostAllowed(u.getHost()) && !u.getPath().startsWith("/download/")) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); // tel:, sms:, maps, other sites
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
                request.deny(); // no camera or microphone use
            }
        });
        web.addJavascriptInterface(new Bridge(this), "ShevolutionNative");
        Events.attach(web);

        String deepLink = handleIntent(getIntent());
        if (state != null) web.restoreState(state);
        else web.loadUrl(deepLink != null ? deepLink : START);
    }

    /** Returns a URL to open when the app was launched from a live-location link. */
    private String handleIntent(Intent i) {
        if (i == null) return null;
        String t = i.getStringExtra("alertToken");
        String maps = i.getStringExtra("alertMaps");
        if (t != null || maps != null) {
            if (Build.VERSION.SDK_INT >= 27) {
                setShowWhenLocked(true);
                setTurnScreenOn(true);
            }
            getSystemService(android.app.NotificationManager.class).cancel(Notifs.ID_ALERT);
        }
        if (t != null) {
            alertToken = t;
            Events.emit("alert_opened", "token", t);
        } else if (maps != null) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(maps)));
            } catch (ActivityNotFoundException ignored) {
            }
        }
        Uri data = i.getData();
        if (Intent.ACTION_VIEW.equals(i.getAction()) && data != null && isHostAllowed(data.getHost())) return data.toString();
        return null;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String link = handleIntent(intent);
        if (link != null) web.loadUrl(link);
    }

    String consumeAlertToken() {
        String t = alertToken;
        alertToken = null;
        return t;
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
        if (!"https".equals(u.getScheme()) || !isHostAllowed(u.getHost()) || !"GET".equals(r.getMethod())) return null;
        String path = u.getPath() == null ? "/" : u.getPath();
        if (path.startsWith("/api/") || path.startsWith("/__/") || path.startsWith("/download/")) return null;
        String asset;
        if (path.equals("/") || path.isEmpty()) asset = "index.html";
        else if (path.startsWith("/e/")) asset = "e.html";
        else if (path.startsWith("/join/")) asset = "join.html";
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
