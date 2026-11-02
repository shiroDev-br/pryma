package com.prysma.iptv;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins locais registram antes do super.onCreate (o bridge é criado nele).
        registerPlugin(UpdaterPlugin.class);
        super.onCreate(savedInstanceState);
        // O WebView (scheme http://localhost) cacheava o index.html e servia
        // bundles ANTIGOS mesmo depois de instalar APK novo — o app "não
        // mudava". clearCache no boot resolve (1x por sessão); LOAD_DEFAULT
        // mantém as imagens em cache DURANTE a sessão (LOAD_NO_CACHE rebaixava
        // todo thumbnail a cada troca de tela — morte em chip fraco/TV).
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.getSettings().setCacheMode(WebSettings.LOAD_DEFAULT);
            webView.clearCache(true);
            // Vinheta de abertura com som: sem isto o WebView exige toque antes de tocar áudio.
            webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
        }
    }
}
