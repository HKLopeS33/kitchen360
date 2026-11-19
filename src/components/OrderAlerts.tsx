import { useEffect, useState } from 'react';
import { BellRing, Volume2, VolumeX, Bell, BellOff, ChevronRight } from 'lucide-react';
import type { NewOrderAlert } from '../helpers/useNewOrderAlerts';
import {
  browserPermission, playOrderChime, requestBrowserPermission, unlockAudio,
  type AlertPrefs, type BrowserPermission,
} from '../helpers/orderAlerts';

function brl(v: number) { return `R$ ${Number(v).toFixed(2).replace('.', ',')}`; }

/** Faixa fixa no topo enquanto houver pedido novo não visto. */
export function NewOrderBanner({ alerts, onView }: { alerts: NewOrderAlert[]; onView: () => void }) {
  if (alerts.length === 0) return null;
  const first = alerts[0];
  return (
    <div className="fixed inset-x-0 top-0 z-[70] safe-px pt-[max(0.75rem,env(safe-area-inset-top))] pointer-events-none">
      <button
        onClick={onView}
        className="pointer-events-auto mx-auto max-w-md w-full flex items-center gap-3 rounded-2xl bg-[#2D5016] text-white px-4 py-3 shadow-[0_10px_30px_rgba(20,40,10,0.35)] animate-scale-in text-left"
      >
        <span className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
          <BellRing size={20} className="animate-bounce" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-black text-sm">
            {alerts.length === 1 ? `Novo pedido #${first.order_number}` : `${alerts.length} novos pedidos`}
          </span>
          <span className="block text-xs text-white/80 truncate">
            {alerts.length === 1
              ? `${first.client_name || 'Cliente'} · ${brl(first.total)}`
              : alerts.map(a => `#${a.order_number}`).join(' · ')}
          </span>
        </span>
        <span className="shrink-0 flex items-center gap-0.5 text-xs font-bold bg-white text-[#2D5016] rounded-full pl-3 pr-2 py-1.5">
          Ver <ChevronRight size={14} />
        </span>
      </button>
    </div>
  );
}

/** Cartão de configuração dos alertas (aba Pedidos). */
export function AlertSettings({ prefs, setPrefs }: { prefs: AlertPrefs; setPrefs: (p: AlertPrefs) => void }) {
  const [perm, setPerm] = useState<BrowserPermission>(browserPermission);

  // A permissão pode mudar nas configurações do navegador.
  useEffect(() => {
    const onFocus = () => setPerm(browserPermission());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const enableBrowser = async () => {
    unlockAudio();
    setPerm(await requestBrowserPermission());
  };

  const testSound = () => { unlockAudio(); playOrderChime(); };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-sm text-[#1a1a1a] flex items-center gap-2">
            <BellRing size={16} className="text-[#6BA534]" /> Alertas de pedido novo
          </p>
          <p className="text-xs text-[#888] mt-0.5">Mantenha esta página aberta para ouvir a campainha.</p>
        </div>
        <button onClick={testSound} className="shrink-0 text-xs font-semibold text-[#2D5016] hover:underline">
          Testar som
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          onClick={() => { unlockAudio(); setPrefs({ ...prefs, sound: !prefs.sound }); }}
          className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
            prefs.sound ? 'border-[#cfe3bd] bg-[#f3f9ec]' : 'border-gray-200 bg-white'
          }`}
        >
          {prefs.sound ? <Volume2 size={18} className="text-[#2D5016]" /> : <VolumeX size={18} className="text-[#999]" />}
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-[#1a1a1a]">Som</span>
            <span className="block text-[11px] text-[#888]">{prefs.sound ? 'Ligado: toca até você ver o pedido' : 'Desligado'}</span>
          </span>
          <span className={`w-9 h-5 rounded-full relative transition-colors ${prefs.sound ? 'bg-[#2D5016]' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${prefs.sound ? 'left-[18px]' : 'left-0.5'}`} />
          </span>
        </button>

        <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
          perm === 'granted' ? 'border-[#cfe3bd] bg-[#f3f9ec]' : 'border-gray-200 bg-white'
        }`}>
          {perm === 'granted' ? <Bell size={18} className="text-[#2D5016]" /> : <BellOff size={18} className="text-[#999]" />}
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-[#1a1a1a]">Notificação no aparelho</span>
            <span className="block text-[11px] text-[#888]">
              {perm === 'granted' && 'Ativada: aparece mesmo em outra aba'}
              {perm === 'default' && 'Avisa mesmo com outra aba aberta'}
              {perm === 'denied' && 'Bloqueada: libere no cadeado da barra de endereço'}
              {perm === 'unsupported' && 'Este navegador não permite'}
            </span>
          </span>
          {perm === 'default' && (
            <button onClick={enableBrowser} className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-[#2D5016] text-white">
              Ativar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
