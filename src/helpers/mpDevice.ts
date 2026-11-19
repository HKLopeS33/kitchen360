/* Identificador do aparelho para o antifraude do Mercado Pago.
   O script oficial do MP gera window.MP_DEVICE_SESSION_ID; enviamos esse
   valor junto com o pagamento (header X-meli-session-id no servidor),
   o que ajuda o MP a aprovar pagamentos legítimos. */

const SECURITY_URL = 'https://www.mercadopago.com/v2/security.js';

declare global {
  interface Window { MP_DEVICE_SESSION_ID?: string }
}

/** Carrega o script uma vez. Chame ao abrir telas de pagamento. */
export function loadMpDevice() {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`script[src="${SECURITY_URL}"]`)) return;
  const s = document.createElement('script');
  s.src = SECURITY_URL;
  s.async = true;
  s.setAttribute('view', 'checkout');
  document.head.appendChild(s);
}

/** Valor atual (pode não existir se o script foi bloqueado — tudo bem). */
export function getMpDeviceId(): string | undefined {
  loadMpDevice();
  return window.MP_DEVICE_SESSION_ID || undefined;
}
