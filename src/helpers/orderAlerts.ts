/* Alertas de pedido novo no painel do estabelecimento:
   som (Web Audio, sem arquivo), notificação do navegador e preferências. */

const PREFS_KEY = 'order-alerts';

export interface AlertPrefs { sound: boolean }

export function loadAlertPrefs(): AlertPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { sound: true, ...JSON.parse(raw) };
  } catch { /* armazenamento indisponível */ }
  return { sound: true };
}

export function saveAlertPrefs(p: AlertPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* ignora */ }
}

// ── Som ──────────────────────────────────────────────────────────────
// O navegador só libera áudio depois de um toque/clique na página.
// Criamos o contexto no primeiro gesto e reaproveitamos.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

/** Chame em um gesto do usuário (clique/toque) para liberar o som. */
export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume();
}

export function audioUnlocked() {
  return !!ctx && ctx.state === 'running';
}

/** Toque curto de campainha (duas notas). */
export function playOrderChime() {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  const now = c.currentTime;
  [[880, 0], [1175, 0.18], [880, 0.5], [1175, 0.68]].forEach(([freq, at]) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(0.35, now + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.3);
    osc.connect(gain).connect(c.destination);
    osc.start(now + at);
    osc.stop(now + at + 0.32);
  });
}

// ── Notificação do navegador ─────────────────────────────────────────
export type BrowserPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function browserPermission(): BrowserPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestBrowserPermission(): Promise<BrowserPermission> {
  if (browserPermission() === 'unsupported') return 'unsupported';
  try { return await Notification.requestPermission(); }
  catch { return browserPermission(); }
}

/** Mostra a notificação do sistema. No Android, só funciona via service worker. */
export async function showBrowserNotification(title: string, body: string, tag: string) {
  if (browserPermission() !== 'granted') return;
  const options: NotificationOptions = { body, tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) { await reg.showNotification(title, options); return; }
  } catch { /* sem service worker */ }
  try {
    const n = new Notification(title, options);
    n.onclick = () => { window.focus(); n.close(); };
  } catch { /* navegador não permite fora do service worker */ }
}
