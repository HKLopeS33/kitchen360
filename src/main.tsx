import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import './index.css'
import App from './App.tsx'

// O app Android (Capacitor) carrega sempre a versão ao vivo do site (server.url),
// então não há motivo para o Service Worker do PWA cachear conteúdo aqui dentro —
// isso só faz o app instalado mostrar versões antigas mesmo após atualizações no
// servidor. Removemos qualquer SW/cache registrado para garantir que o WebView
// sempre busque o conteúdo mais recente da rede.
if (Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister());
  });
  if ('caches' in window) {
    caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
  }
}

// Botão voltar do Android: navega para a página anterior no histórico.
// Se não houver histórico (já está na raiz), não fecha o app — apenas ignora.
if (Capacitor.isNativePlatform()) {
  CapApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    }
    // canGoBack === false → está na tela inicial, não faz nada (não fecha o app)
  });
}

// Depois de uma atualização do site, uma aba antiga pode pedir um pedaço do
// app que já não existe: recarrega uma vez para pegar a versão nova.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  try {
    if (sessionStorage.getItem('reloaded-after-update')) return;
    sessionStorage.setItem('reloaded-after-update', '1');
  } catch { /* sem armazenamento: recarrega mesmo assim */ }
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
