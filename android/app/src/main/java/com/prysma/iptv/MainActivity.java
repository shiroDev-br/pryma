package com.prysma.iptv;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // O WebView (scheme http://localhost) cacheava o index.html e servia
        // bundles ANTIGOS mesmo depois de instalar APK novo — o app "não
        // mudava". Desliga o cache e limpa no boot; assets são locais.
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
            webView.clearCache(true);
        }
    }
}
