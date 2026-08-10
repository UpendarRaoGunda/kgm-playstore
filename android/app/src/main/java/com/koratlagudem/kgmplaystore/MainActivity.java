package com.koratlagudem.kgmplaystore;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

public final class MainActivity extends Activity {
    private static final String HOME_URL = "https://kgm-playstore.onrender.com/";
    private static final String HOME_HOST = "kgm-playstore.onrender.com";
    private static final int STORAGE_PERMISSION_REQUEST = 41;
    private static final int FILE_CHOOSER_REQUEST = 42;

    private WebView webView;
    private ProgressBar progressBar;
    private LinearLayout offlineView;
    private ValueCallback<Uri[]> pendingFileCallback;
    private PendingDownload pendingDownload;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(23, 33, 61));
        getWindow().setNavigationBarColor(Color.rgb(251, 247, 239));
        setContentView(createContentView());
        configureWebView();

        if (savedInstanceState == null) {
            loadHome();
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private View createContentView() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(251, 247, 239));

        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgressTintList(android.content.res.ColorStateList.valueOf(Color.rgb(118, 87, 237)));
        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                dp(3));
        progressParams.gravity = Gravity.TOP;
        root.addView(progressBar, progressParams);

        offlineView = new LinearLayout(this);
        offlineView.setOrientation(LinearLayout.VERTICAL);
        offlineView.setGravity(Gravity.CENTER);
        offlineView.setPadding(dp(32), dp(32), dp(32), dp(32));
        offlineView.setBackgroundColor(Color.rgb(251, 247, 239));
        offlineView.setVisibility(View.GONE);

        TextView mark = new TextView(this);
        mark.setText("K");
        mark.setTextSize(42);
        mark.setTextColor(Color.rgb(118, 87, 237));
        mark.setGravity(Gravity.CENTER);
        offlineView.addView(mark, new LinearLayout.LayoutParams(dp(88), dp(88)));

        TextView title = new TextView(this);
        title.setText(R.string.offline_title);
        title.setTextSize(24);
        title.setTextColor(Color.rgb(23, 33, 61));
        title.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        titleParams.topMargin = dp(16);
        offlineView.addView(title, titleParams);

        TextView message = new TextView(this);
        message.setText(R.string.offline_message);
        message.setTextSize(14);
        message.setTextColor(Color.rgb(100, 110, 132));
        message.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams messageParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        messageParams.topMargin = dp(10);
        offlineView.addView(message, messageParams);

        Button retry = new Button(this);
        retry.setText(R.string.retry);
        retry.setTextColor(Color.WHITE);
        retry.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(118, 87, 237)));
        retry.setOnClickListener(view -> loadHome());
        LinearLayout.LayoutParams retryParams = new LinearLayout.LayoutParams(dp(170), dp(52));
        retryParams.topMargin = dp(24);
        offlineView.addView(retry, retryParams);

        root.addView(offlineView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));
        return root;
    }

    @SuppressWarnings("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        settings.setUserAgentString(settings.getUserAgentString() + " KGMAndroid/1.0.0");

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equalsIgnoreCase(uri.getScheme()) && HOME_HOST.equalsIgnoreCase(uri.getHost())) {
                    return false;
                }
                openExternal(uri);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                offlineView.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
                CookieManager.getInstance().flush();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    showOffline();
                }
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, android.net.http.SslError error) {
                handler.cancel();
                showOffline();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                progressBar.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
            }

            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {
                if (pendingFileCallback != null) {
                    pendingFileCallback.onReceiveValue(null);
                }
                pendingFileCallback = filePathCallback;
                Intent chooser;
                try {
                    chooser = fileChooserParams.createIntent();
                    chooser.addCategory(Intent.CATEGORY_OPENABLE);
                    startActivityForResult(chooser, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException exception) {
                    pendingFileCallback = null;
                    Toast.makeText(MainActivity.this, R.string.no_file_picker, Toast.LENGTH_LONG).show();
                    return false;
                }
            }
        });

        webView.setDownloadListener(createDownloadListener());
    }

    private DownloadListener createDownloadListener() {
        return (url, userAgent, contentDisposition, mimeType, contentLength) -> {
            String fileName = android.webkit.URLUtil.guessFileName(url, contentDisposition, mimeType);
            PendingDownload download = new PendingDownload(url, userAgent, mimeType, fileName);
            if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P
                    && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                pendingDownload = download;
                requestPermissions(
                        new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE},
                        STORAGE_PERMISSION_REQUEST);
                return;
            }
            enqueueDownload(download);
        };
    }

    private void enqueueDownload(PendingDownload download) {
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(download.url));
            request.setTitle(download.fileName);
            request.setDescription(getString(R.string.download_description));
            request.setMimeType(download.mimeType);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, download.fileName);
            request.addRequestHeader("User-Agent", download.userAgent);
            String cookies = CookieManager.getInstance().getCookie(download.url);
            if (cookies != null) {
                request.addRequestHeader("Cookie", cookies);
            }
            DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            manager.enqueue(request);
            Toast.makeText(this, R.string.download_started, Toast.LENGTH_LONG).show();
        } catch (Exception exception) {
            openExternal(Uri.parse(download.url));
        }
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException exception) {
            Toast.makeText(this, R.string.cannot_open_link, Toast.LENGTH_LONG).show();
        }
    }

    private void loadHome() {
        if (!isOnline()) {
            showOffline();
            return;
        }
        offlineView.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
        webView.loadUrl(HOME_URL);
    }

    private boolean isOnline() {
        ConnectivityManager manager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        Network network = manager.getActiveNetwork();
        if (network == null) return false;
        NetworkCapabilities capabilities = manager.getNetworkCapabilities(network);
        return capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    private void showOffline() {
        progressBar.setVisibility(View.GONE);
        webView.setVisibility(View.GONE);
        offlineView.setVisibility(View.VISIBLE);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri uri = intent.getData();
        webView.loadUrl(uri == null ? HOME_URL : uri.toString());
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || pendingFileCallback == null) return;
        Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        pendingFileCallback.onReceiveValue(result);
        pendingFileCallback = null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != STORAGE_PERMISSION_REQUEST || pendingDownload == null) return;
        PendingDownload download = pendingDownload;
        pendingDownload = null;
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            enqueueDownload(download);
        } else {
            Toast.makeText(this, R.string.storage_permission_needed, Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onDestroy() {
        if (pendingFileCallback != null) {
            pendingFileCallback.onReceiveValue(null);
            pendingFileCallback = null;
        }
        webView.destroy();
        super.onDestroy();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private static final class PendingDownload {
        final String url;
        final String userAgent;
        final String mimeType;
        final String fileName;

        PendingDownload(String url, String userAgent, String mimeType, String fileName) {
            this.url = url;
            this.userAgent = userAgent;
            this.mimeType = mimeType;
            this.fileName = URLDecoder.decode(fileName, StandardCharsets.UTF_8);
        }
    }
}
