import { useEffect, useState } from 'react';
import { Wallet, CheckCircle2, AlertCircle, Loader2, ShieldCheck, Link2Off } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, type Restaurant } from '../lib/supabase';

/** Busca a comissão vigente (pública). */
export function useCommissionPercent() {
  const [pct, setPct] = useState<number | null>(null);
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'commission_percent').maybeSingle()
      .then(({ data }) => setPct(data?.value != null ? Number(data.value) : 2.5));
  }, []);
  return pct;
}

export const pctLabel = (p: number | null) => `${String(p ?? 2.5).replace('.', ',')}%`;

/** Conexão da conta Mercado Pago da loja (OAuth): recebe direto, comissão separada pelo MP. */
export function MercadoPagoConnect({ restaurant, onChanged }: { restaurant: Restaurant; onChanged?: () => void }) {
  const pct = useCommissionPercent();
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(!!restaurant.mp_oauth_connected);
  useEffect(() => { setConnected(!!restaurant.mp_oauth_connected); }, [restaurant.mp_oauth_connected]);

  async function connect() {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('mp-connect', { body: { action: 'start' } });
    if (error || data?.error || !data?.url) {
      toast.error(data?.error ?? 'Não foi possível abrir o Mercado Pago agora.');
      setBusy(false);
      return;
    }
    window.location.href = data.url; // volta em /mercadopago/retorno
  }

  async function disconnect() {
    if (!confirm('Desconectar o Mercado Pago? Seus clientes não vão conseguir pagar pelo app até você conectar de novo.')) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('mp-connect', { body: { action: 'disconnect' } });
    setBusy(false);
    if (error || data?.error) { toast.error(data?.error ?? 'Não foi possível desconectar.'); return; }
    setConnected(false);
    toast.success('Mercado Pago desconectado.');
    onChanged?.();
  }

  const since = restaurant.mp_connected_at
    ? new Date(restaurant.mp_connected_at).toLocaleDateString('pt-BR')
    : null;

  return (
    <section className="bg-white rounded-2xl shadow-sm p-5 animate-fade-in-up">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-bold text-[#1a1a1a] flex items-center gap-2">
          <Wallet size={18} className="text-[#6BA534]" /> Pagamentos online
        </h2>
        {connected ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-[#2D5016] bg-[#e8f5e0] px-2.5 py-1 rounded-full">
            <CheckCircle2 size={13} /> Conectado
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full">
            <AlertCircle size={13} /> Não conectado
          </span>
        )}
      </div>

      {connected ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {['Pix', 'Cartão de crédito'].map(m => (
              <div key={m} className="rounded-xl px-3 py-2.5 border border-[#cfe3bd] bg-[#f3f9ec]">
                <p className="text-xs font-bold text-[#1a1a1a]">{m}</p>
                <p className="text-[11px] text-[#5c6556]">Recebendo</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#5c6556] leading-relaxed">
            Sua conta Mercado Pago está conectada{since ? ` desde ${since}` : ''}. O dinheiro de cada pedido cai
            direto na sua conta. O Mercado Pago separa automaticamente a comissão de <strong>{pctLabel(pct)}</strong> do
            Floresta Já.
          </p>
          <button onClick={disconnect} disabled={busy}
            className="text-xs font-semibold text-[#6b7465] hover:text-red-600 flex items-center gap-1.5 disabled:opacity-60">
            <Link2Off size={13} /> Desconectar conta
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[#3f4a38] leading-relaxed">
            Conecte sua conta do Mercado Pago para receber os pedidos por <strong>Pix</strong> e <strong>cartão de
            crédito</strong> direto na sua conta.
          </p>
          <ul className="text-xs text-[#5c6556] space-y-1.5">
            <li className="flex gap-2"><CheckCircle2 size={14} className="text-[#3f7a1f] shrink-0 mt-px" /> Você entra na sua conta do Mercado Pago e autoriza o Floresta Já. Não precisa copiar chave nenhuma.</li>
            <li className="flex gap-2"><CheckCircle2 size={14} className="text-[#3f7a1f] shrink-0 mt-px" /> O valor de cada pedido cai direto na sua conta.</li>
            <li className="flex gap-2"><CheckCircle2 size={14} className="text-[#3f7a1f] shrink-0 mt-px" /> A comissão de {pctLabel(pct)} do Floresta Já é separada automaticamente pelo Mercado Pago.</li>
          </ul>
          <button onClick={connect} disabled={busy}
            className="w-full h-12 rounded-xl bg-[#009ee3] hover:bg-[#008ac7] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
            Conectar com Mercado Pago
          </button>
          <p className="text-[11px] text-[#6b7465] flex items-center gap-1">
            <ShieldCheck size={12} className="text-[#3f7a1f]" /> Conexão oficial do Mercado Pago. Você pode desconectar quando quiser.
          </p>
        </div>
      )}
    </section>
  );
}
