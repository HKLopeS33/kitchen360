package br.com.florestaja.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // O app sempre carrega o conteúdo ao vivo do servidor (server.url no
        // capacitor.config). Para garantir que o usuário SEMPRE veja a versão
        // mais recente do site (e não uma cópia antiga guardada pelo WebView
        // ou por um Service Worker registrado nele), desativamos o cache HTTP
        // do WebView e limpamos qualquer cache já existente na inicialização.
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
            webView.clearCache(true);
            webView.clearHistory();
        }
    }
}
