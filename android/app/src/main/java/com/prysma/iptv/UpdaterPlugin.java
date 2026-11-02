package com.prysma.iptv;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Botão "Atualizações" → app Downloader (AFTVnews), que baixa e instala o APK novo.
 *
 * O Downloader não documenta um link para abrir já com o código; ele é um
 * navegador, então tenta primeiro abrir a URL de atualização DENTRO dele
 * (ACTION_VIEW com o pacote fixo). Se o Downloader não aceitar, abre o app e a
 * tela mostra o código para digitar. Sem o Downloader, o JS oferece a loja.
 * (O pacote precisa estar em <queries> no manifest — visibilidade do Android 11+.)
 */
@CapacitorPlugin(name = "Updater")
public class UpdaterPlugin extends Plugin {

    private static final String DOWNLOADER = "com.esaba.downloader";

    private PackageManager pm() {
        return getContext().getPackageManager();
    }

    private Intent launchIntent() {
        Intent intent = pm().getLaunchIntentForPackage(DOWNLOADER);
        // Na TV o app pode ter só a entrada do launcher leanback.
        if (intent == null) intent = pm().getLeanbackLaunchIntentForPackage(DOWNLOADER);
        return intent;
    }

    private Intent viewIntent(String url) {
        if (url == null || url.isEmpty()) return null;
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        intent.setPackage(DOWNLOADER);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return intent.resolveActivity(pm()) != null ? intent : null;
    }

    /** { installed, canOpenUrl, amazon } — `canOpenUrl`: abre direto na URL de atualização. */
    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("installed", launchIntent() != null);
        result.put("canOpenUrl", viewIntent(call.getString("url")) != null);
        result.put("amazon", "Amazon".equalsIgnoreCase(Build.MANUFACTURER));
        call.resolve(result);
    }

    /** Abre o Downloader na URL (se ele aceitar) ou só o app. Resolve { mode: 'url' | 'app' }. */
    @PluginMethod
    public void openDownloader(PluginCall call) {
        try {
            Intent view = viewIntent(call.getString("url"));
            JSObject result = new JSObject();
            if (view != null) {
                getActivity().startActivity(view);
                result.put("mode", "url");
                call.resolve(result);
                return;
            }
            Intent launch = launchIntent();
            if (launch == null) {
                call.reject("Downloader não instalado", "not_installed");
                return;
            }
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(launch);
            result.put("mode", "app");
            call.resolve(result);
        } catch (ActivityNotFoundException error) {
            call.reject("Não foi possível abrir o Downloader", "open_failed");
        }
    }

    /** Página do Downloader na loja do aparelho: Amazon Appstore (Fire TV) ou Google Play. */
    @PluginMethod
    public void openStore(PluginCall call) {
        String[] uris = {
            "amzn://apps/android?p=" + DOWNLOADER,
            "market://details?id=" + DOWNLOADER,
            "https://play.google.com/store/apps/details?id=" + DOWNLOADER,
        };
        // Fire TV primeiro tenta a Amazon; nos outros a Amazon nem existe (cai no Play).
        for (String uri : uris) {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(uri));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(intent);
                call.resolve();
                return;
            } catch (ActivityNotFoundException ignored) {
                // próxima loja
            }
        }
        call.reject("Nenhuma loja disponível", "no_store");
    }
}
