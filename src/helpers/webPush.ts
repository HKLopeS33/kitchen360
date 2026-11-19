/* Notificações no celular com o app fechado (Web Push). */
import { supabase } from '../lib/supabase';
import { isIos, isStandalone } from './pwaInstall';

export type PushState =
  | 'unsupported'    // navegador sem suporte
  | 'needs-install'  // iPhone: só funciona com o app instalado na tela inicial
  | 'no-sw'          // service worker ainda não ativo (ex.: ambiente de desenvolvimento)
  | 'denied'         // usuário bloqueou
  | 'off'
  | 'on';

function supported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function registration() {
  if (!('serviceWorker' in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

export async function getPushState(): Promise<PushState> {
  if (isIos() && !isStandalone()) return 'needs-install';
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await registration();
  if (!reg) return 'no-sw';
  const sub = await reg.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function saveSubscription(sub: PushSubscription) {
  const j = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) throw new Error('Inscrição inválida');
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_user_agent: navigator.userAgent,
  });
  if (error) throw new Error(error.message);
}

/** Pede permissão e inscreve este aparelho. Chame num toque/clique. */
export async function enablePush(): Promise<PushState> {
  if (isIos() && !isStandalone()) return 'needs-install';
  if (!supported()) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

  const reg = await registration();
  if (!reg) return 'no-sw';

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { data, error } = await supabase.functions.invoke('push', { method: 'GET' });
    const publicKey = (data as { publicKey?: string } | null)?.publicKey;
    if (error || !publicKey) throw new Error('As notificações ainda não estão configuradas no servidor.');
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  await saveSubscription(sub);
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.rpc('delete_push_subscription', { p_endpoint: sub.endpoint });
    await sub.unsubscribe().catch(() => {});
  }
  return 'off';
}

/** Ao entrar: liga este aparelho ao usuário logado (se já tinha permitido). */
export async function syncPushSubscription() {
  try {
    if (!supported() || Notification.permission !== 'granted') return;
    const sub = await (await registration())?.pushManager.getSubscription();
    if (sub) await saveSubscription(sub);
  } catch { /* silencioso */ }
}

/** Ao sair: este aparelho para de receber as notificações desta conta. */
export async function detachPushFromUser() {
  try {
    if (!supported()) return;
    const sub = await (await registration())?.pushManager.getSubscription();
    if (sub) await supabase.rpc('delete_push_subscription', { p_endpoint: sub.endpoint });
  } catch { /* silencioso */ }
}

/** Cria uma notificação de teste para o próprio usuário (mesmo caminho de uma real). */
export async function sendTestNotification(userId: string) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId, type: 'system',
    title: 'Notificações ativadas ✅',
    body: 'É assim que você vai ser avisado, mesmo com o app fechado.',
  });
  if (error) throw new Error(error.message);
}
