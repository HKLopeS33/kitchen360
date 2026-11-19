import { useEffect, useState } from 'react';
import { Smartphone, Download, CheckCircle2, BellRing, BellOff, Share, PlusSquare, MoreVertical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useInstallPrompt } from '../helpers/pwaInstall';
import { disablePush, enablePush, getPushState, sendTestNotification, type PushState } from '../helpers/webPush';

/** Instalar o app (PWA) + ativar notificações no celular com o app fechado. */
export function PhoneAppCard({ userId, audience }: { userId: string; audience: 'restaurant' | 'client' }) {
  const { canInstall, installed, ios, install } = useInstallPrompt();
  const [push, setPush] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const refresh = () => { void getPushState().then(s => { if (alive) setPush(s); }); };
    refresh();
    window.addEventListener('focus', refresh);
    return () => { alive = false; window.removeEventListener('focus', refresh); };
  }, []);

  const what = audience === 'restaurant' ? 'cada pedido novo' : 'cada mudança no seu pedido';

  async function turnOn() {
    setBusy(true);
    try {
      const s = await enablePush();
      setPush(s);
      if (s === 'on') {
        await sendTestNotification(userId);
        toast.success('Notificações ativadas! Enviamos uma de teste.');
      } else if (s === 'denied') {
        toast.error('As notificações foram bloqueadas neste aparelho.');
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Não foi possível ativar.');
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try { setPush(await disablePush()); toast.success('Notificações desativadas neste aparelho.'); }
    finally { setBusy(false); }
  }

  async function test() {
    setBusy(true);
    try { await sendTestNotification(userId); toast.success('Enviada! Deve chegar em alguns segundos.'); }
    catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4 animate-fade-in-up">
      <h2 className="font-bold text-[#1a1a1a] flex items-center gap-2">
        <Smartphone size={18} className="text-[#6BA534]" /> App no celular
      </h2>

      {/* Instalar */}
      <div className={`rounded-xl border px-4 py-3 ${installed ? 'border-[#cfe3bd] bg-[#f3f9ec]' : 'border-gray-200'}`}>
        {installed ? (
          <p className="text-sm font-semibold text-[#2D5016] flex items-center gap-2">
            <CheckCircle2 size={16} /> App instalado neste aparelho
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1a1a1a]">Instalar o app</p>
                <p className="text-xs text-[#888]">Ícone na tela inicial, abre em tela cheia. Sem loja de apps.</p>
              </div>
              {canInstall && (
                <button onClick={() => void install()}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full bg-[#2D5016] text-white">
                  <Download size={14} /> Instalar
                </button>
              )}
            </div>
            {!canInstall && (
              <ol className="mt-3 text-xs text-[#555] space-y-1.5">
                {ios ? (
                  <>
                    <li className="flex items-center gap-1.5">1. No Safari, toque em <Share size={14} className="text-[#2D5016]" /> <strong>Compartilhar</strong></li>
                    <li className="flex items-center gap-1.5">2. Toque em <PlusSquare size={14} className="text-[#2D5016]" /> <strong>Adicionar à Tela de Início</strong></li>
                    <li>3. Abra o app pelo ícone novo e ative as notificações abaixo</li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center gap-1.5">1. Toque no menu <MoreVertical size={14} className="text-[#2D5016]" /> do navegador</li>
                    <li>2. Toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong></li>
                  </>
                )}
              </ol>
            )}
          </>
        )}
      </div>

      {/* Notificações */}
      <div className={`rounded-xl border px-4 py-3 ${push === 'on' ? 'border-[#cfe3bd] bg-[#f3f9ec]' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-start gap-2.5">
            {push === 'on'
              ? <BellRing size={18} className="text-[#2D5016] mt-0.5 shrink-0" />
              : <BellOff size={18} className="text-[#999] mt-0.5 shrink-0" />}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1a1a1a]">Notificações no celular</p>
              <p className="text-xs text-[#888]">
                {push === null && 'Verificando...'}
                {push === 'on' && `Ativadas: você recebe ${what}, mesmo com o app fechado.`}
                {push === 'off' && `Receba ${what} mesmo com o app fechado.`}
                {push === 'denied' && 'Bloqueadas. Libere nas configurações do navegador (cadeado ao lado do endereço) e volte aqui.'}
                {push === 'needs-install' && 'No iPhone, instale o app primeiro (passos acima) e ative por ele.'}
                {push === 'unsupported' && 'Este navegador não permite. Use o Chrome no Android ou o Safari no iPhone.'}
                {push === 'no-sw' && 'Disponível no app publicado. Recarregue a página e tente de novo.'}
              </p>
            </div>
          </div>
          {push === 'off' && (
            <button onClick={turnOn} disabled={busy}
              className="shrink-0 flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full bg-[#2D5016] text-white disabled:opacity-60">
              {busy && <Loader2 size={13} className="animate-spin" />} Ativar
            </button>
          )}
        </div>
        {push === 'on' && (
          <div className="mt-3 flex items-center gap-4">
            <button onClick={test} disabled={busy} className="text-xs font-semibold text-[#2D5016] hover:underline disabled:opacity-60">
              Enviar notificação de teste
            </button>
            <button onClick={turnOff} disabled={busy} className="text-xs font-semibold text-[#999] hover:text-red-500 disabled:opacity-60">
              Desativar neste aparelho
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
