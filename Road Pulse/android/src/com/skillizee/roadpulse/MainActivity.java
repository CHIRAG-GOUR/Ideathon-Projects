package com.skillizee.roadpulse;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * RoadPulse for Android: the web app full screen with the phone's real camera and GPS.
 * Detection, reporting and sync all live in the web app; this only hosts it and bridges permissions.
 */
public class MainActivity extends Activity {
    // Where the web app is deployed (Firebase Hosting site "roadpulse-ideathon").
    static final String APP_URL = "https://roadpulse-ideathon.web.app/";
    static final String APP_HOST = "roadpulse-ideathon.web.app";

    private static final int REQ_CAMERA = 1;
    private static final int REQ_LOCATION = 2;
    private static final int REQ_FILE = 3;

    private WebView web;
    private PermissionRequest pendingCamera;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;
    private ValueCallback<Uri[]> pendingFiles;

    public class WebAppInterface {
        @JavascriptInterface
        public String getPairedBluetoothDevices() {
            try {
                BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                if (adapter == null) return "[]";
                Set<BluetoothDevice> paired = adapter.getBondedDevices();
                JSONArray arr = new JSONArray();
                if (paired != null) {
                    for (BluetoothDevice d : paired) {
                        JSONObject obj = new JSONObject();
                        String name = null;
                        try {
                            name = d.getName();
                        } catch (SecurityException ignored) {}
                        if (name == null || name.trim().isEmpty() || name.equals(d.getAddress())) {
                            name = "Car Audio / Device (" + d.getAddress() + ")";
                        }
                        obj.put("name", name);
                        obj.put("address", d.getAddress());
                        arr.put(obj);
                    }
                }
                return arr.toString();
            } catch (Exception e) {
                return "[]";
            }
        }

        @JavascriptInterface
        public void openBluetoothSettings() {
            try {
                Intent intent = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public boolean isBluetoothEnabled() {
            try {
                BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                return adapter != null && adapter.isEnabled();
            } catch (Exception e) {
                return false;
            }
        }
    }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#FAF8F4"));
        web.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false); // live camera preview plays inline
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setRenderPriority(WebSettings.RenderPriority.HIGH);
        s.setEnableSmoothTransition(true);
        web.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        web.clearCache(true);
        web.clearFormData();
        web.clearHistory();
        web.addJavascriptInterface(new WebAppInterface(), "Android");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                String scheme = u.getScheme() != null ? u.getScheme().toLowerCase() : "";
                
                // 1-Tap Citizen Email Dispatch (mailto:)
                if ("mailto".equals(scheme)) {
                    try {
                        Intent emailIntent = new Intent(Intent.ACTION_SENDTO, u);
                        startActivity(emailIntent);
                        return true;
                    } catch (ActivityNotFoundException e) {
                        try {
                            startActivity(new Intent(Intent.ACTION_VIEW, u));
                            return true;
                        } catch (ActivityNotFoundException ignored) {}
                    }
                }
                
                // Keep internal app navigation within WebView
                if ("https".equals(scheme) && APP_HOST.equals(u.getHost())) return false;
                
                // External links (maps, official portals, telephone) open in external apps
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (ActivityNotFoundException ignored) {
                }
                return true;
            }

            @Override
            public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                // Keep the screen on only while Live Drive is monitoring the road.
                Uri u = Uri.parse(url);
                boolean live = u.getPath() != null && u.getPath().startsWith("/live");
                if (live) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
                if (req.isForMainFrame()) showOffline(view);
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                boolean wantsCamera = false;
                for (String r : request.getResources()) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) wantsCamera = true;
                }
                if (!wantsCamera) {
                    request.deny();
                    return;
                }
                if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                    request.grant(new String[] {PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                } else {
                    pendingCamera = request;
                    requestPermissions(new String[] {Manifest.permission.CAMERA}, REQ_CAMERA);
                }
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                Uri u = Uri.parse(origin);
                if (!APP_HOST.equals(u.getHost())) {
                    callback.invoke(origin, false, false);
                    return;
                }
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false);
                } else {
                    pendingGeoOrigin = origin;
                    pendingGeoCallback = callback;
                    requestPermissions(new String[] {Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOCATION);
                }
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingFiles != null) pendingFiles.onReceiveValue(null);
                pendingFiles = callback;
                try {
                    startActivityForResult(params.createIntent(), REQ_FILE);
                } catch (ActivityNotFoundException e) {
                    pendingFiles = null;
                    return false;
                }
                return true;
            }
        });

        web.loadUrl(APP_URL);
    }

    private void showOffline(WebView view) {
        String html = "<html><head><meta name='viewport' content='width=device-width,initial-scale=1'></head>"
                + "<body style='margin:0;font-family:sans-serif;background:#FAF8F4;color:#2B2F33;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center'>"
                + "<div style='padding:24px'><div style='font-size:48px'>&#128739;</div>"
                + "<h2 style='margin:12px 0 6px'>You&rsquo;re offline</h2>"
                + "<p style='color:#747B83;margin:0 0 20px'>RoadPulse needs a connection to open. Live Drive keeps events on the phone and uploads them later.</p>"
                + "<a href='" + APP_URL + "' style='display:inline-block;padding:14px 28px;border-radius:16px;background:#2F9A5E;color:#fff;font-weight:bold;text-decoration:none'>Try again</a>"
                + "</div></body></html>";
        view.loadDataWithBaseURL(APP_URL, html, "text/html", "utf-8", APP_URL);
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        boolean granted = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
        if (code == REQ_CAMERA && pendingCamera != null) {
            if (granted) pendingCamera.grant(new String[] {PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else pendingCamera.deny(); // the web app then offers "Upload Image"
            pendingCamera = null;
        } else if (code == REQ_LOCATION && pendingGeoCallback != null) {
            // Denied → the web app shows "We couldn't access your location" and lets the user place the pin.
            pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
        }
    }

    @Override
    protected void onActivityResult(int code, int result, Intent data) {
        if (code == REQ_FILE && pendingFiles != null) {
            pendingFiles.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            pendingFiles = null;
            return;
        }
        super.onActivityResult(code, result, data);
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.setVisibility(View.GONE);
            web.destroy();
        }
        super.onDestroy();
    }
}
