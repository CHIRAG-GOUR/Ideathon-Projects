package com.beyondlegacy.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.res.AssetManager;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * Native shell for the Beyond Legacy web app.
 *
 * The production web build is bundled in assets/www and served at the app's real Firebase Hosting origin
 * (https://beyond-legacy-app.web.app), so the UI opens instantly and offline, while Firebase Auth and Firestore
 * behave exactly as on the website (same origin, same IndexedDB offline cache). The Firebase web config comes
 * from assets/firebase.json when the build provided one, otherwise from the deployed site's /__/firebase/init.json.
 */
public class MainActivity extends Activity {
    static final String HOST = "beyond-legacy-app.web.app";
    static final String ORIGIN = "https://" + HOST;

    private WebView web;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        web = new WebView(this);
        web.setBackgroundColor(0xFFFBF5E9);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setTextZoom(100); // the layout is responsive; system font scaling is honoured through rem sizes instead
        web.addJavascriptInterface(new Bridge(), "BeyondLegacyApp");
        web.setWebViewClient(new Client());
        setContentView(web);
        if (saved == null || web.restoreState(saved) == null) web.loadUrl(ORIGIN + "/");
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

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.removeJavascriptInterface("BeyondLegacyApp");
            web.destroy();
        }
        super.onDestroy();
    }

    /** Serves the bundled build for the app origin; everything else (Firebase APIs) goes to the network. */
    private class Client extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (!"https".equals(u.getScheme()) || !HOST.equals(u.getHost()) || !"GET".equals(req.getMethod())) return null;
            String path = u.getPath() == null || u.getPath().isEmpty() ? "/" : u.getPath();
            if (path.equals("/__/firebase/init.json")) return asset("firebase.json", "application/json", false);
            if (path.contains("..")) return null;
            String file = path.endsWith("/") ? path + "index.html" : path;
            WebResourceResponse r = asset("www" + file, mime(file), file.startsWith("/assets/"));
            if (r != null) return r;
            // Single-page app routes (/inventory, /products/abc …) all render index.html, as Hosting's rewrite does.
            String last = file.substring(file.lastIndexOf('/') + 1);
            return last.contains(".") ? null : asset("www/index.html", "text/html", false);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
            Uri u = req.getUrl();
            if ("https".equals(u.getScheme()) && HOST.equals(u.getHost())) return false;
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, u));
            } catch (ActivityNotFoundException e) {
                Toast.makeText(MainActivity.this, R.string.no_app, Toast.LENGTH_SHORT).show();
            }
            return true;
        }
    }

    private WebResourceResponse asset(String name, String mime, boolean immutable) {
        AssetManager am = getAssets();
        try {
            InputStream in = am.open(name);
            Map<String, String> h = new HashMap<>();
            h.put("Cache-Control", immutable ? "public, max-age=31536000, immutable" : "no-cache");
            h.put("Access-Control-Allow-Origin", ORIGIN);
            String enc = mime.startsWith("text/") || mime.endsWith("json") || mime.endsWith("javascript") ? "utf-8" : null;
            return new WebResourceResponse(mime, enc, 200, "OK", h, in);
        } catch (IOException e) {
            return null;
        }
    }

    private static String mime(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".webmanifest")) return "application/manifest+json";
        if (p.endsWith(".ico")) return "image/x-icon";
        return "application/octet-stream";
    }

    /** window.BeyondLegacyApp — the only native capability the web app uses: handing an export to the share sheet. */
    private class Bridge {
        @JavascriptInterface
        public void shareFile(String name, String mime, String text) {
            String safe = name == null ? "export.csv" : name.replaceAll("[^A-Za-z0-9._-]", "_");
            if (safe.isEmpty() || safe.length() > 120) safe = "export.csv";
            final String fileName = safe;
            final String type = mime == null || mime.isEmpty() ? "text/plain" : mime;
            try {
                File dir = new File(getCacheDir(), ShareProvider.DIR);
                if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("cannot create share folder");
                try (FileOutputStream out = new FileOutputStream(new File(dir, fileName))) {
                    out.write((text == null ? "" : text).getBytes(StandardCharsets.UTF_8));
                }
            } catch (IOException e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Could not prepare the file: " + e.getMessage(), Toast.LENGTH_LONG).show());
                return;
            }
            runOnUiThread(() -> {
                Intent send = new Intent(Intent.ACTION_SEND)
                        .setType(type)
                        .putExtra(Intent.EXTRA_STREAM, ShareProvider.uriFor(fileName))
                        .putExtra(Intent.EXTRA_SUBJECT, fileName)
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try {
                    startActivity(Intent.createChooser(send, getString(R.string.share_title)));
                } catch (ActivityNotFoundException e) {
                    Toast.makeText(MainActivity.this, R.string.no_app, Toast.LENGTH_SHORT).show();
                }
            });
        }
    }
}
