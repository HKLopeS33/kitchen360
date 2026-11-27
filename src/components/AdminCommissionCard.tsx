import { useEffect, useState } from 'react';
import { Percent, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

type Row = { restaurant_id: string; restaurant_name: string; orders_count: number; gross: number; commission: number };

const brl = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

/** Admin: percentual da comissão e quanto o app recebeu no mês por loja. */
export function AdminCommissionCard() {
  const [pct, setPct] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'commission_percent').maybeSingle()
      .then(({ data }) => { const v = data?.value != null ? Number(data.value) : 2.5; setPct(v); setInput(String(v)); });
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    supabase.rpc('admin_commission_summary', { p_from: from, p_to: to })
      .then(({ data, error }) => setRows(error ? [] : ((data ?? []) as Row[])));
  }, []);

  async function save() {
    const v = Number(input.replace(',', '.'));
    if (!Number.isFinite(v) || v < 0 || v > 20) { toast.error('Use um valor entre 0 e 20%.'); return; }
    setSaving(true);
    const { error } = await supabase.from('app_settings')
      .upsert({ key: 'commission_percent', value: String(v), updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setPct(v); setEditing(false);
    toast.success('Comissão atualizada! Vale para os próximos pagamentos.');
  }

  const total = (rows ?? []).reduce((s, r) => s + Number(r.commission), 0);
  const orders = (rows ?? []).reduce((s, r) => s + Number(r.orders_count), 0);
  const month = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[#6b7465] font-medium flex items-center gap-1"><Percent size={12} /> Comissão por pedido pago pelo app</p>
          {editing ? (
            <div className="flex items-center gap-2 mt-1">
              <input value={input} onChange={e => setInput(e.target.value)} inputMode="decimal"
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-bold w-20 outline-none focus:border-[#2D5016]" />
              <span className="text-sm text-[#6b7465]">%</span>
              <button onClick={save} disabled={saving} aria-label="Salvar"
                className="w-8 h-8 rounded-lg bg-[#2D5016] text-white flex items-center justify-center disabled:opacity-50"><Check size={14} /></button>
              <button onClick={() => { setEditing(false); setInput(String(pct ?? 2.5)); }} aria-label="Cancelar"
                className="w-8 h-8 rounded-lg bg-gray-100 text-[#6b7465] flex items-center justify-center"><X size={14} /></button>
            </div>
          ) : (
            <p className="text-xl font-black text-[#1a1a1a] mt-0.5">{pct == null ? '…' : `${String(pct).replace('.', ',')}%`}</p>
          )}
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#3f7a1f] bg-[#f0f8e8] hover:bg-[#e4f4d4] px-3 py-2 rounded-xl shrink-0">
            <Pencil size={12} /> Editar
          </button>
        )}
      </div>

      <div className="rounded-xl bg-[#f7fbf3] border border-[#e3ede0] p-3">
        <p className="text-xs text-[#5c6556]">Comissões em {month}</p>
        <p className="text-2xl font-black text-[#2D5016]">{rows == null ? '…' : brl(total)}</p>
        <p className="text-[11px] text-[#6b7465]">{orders} pedido{orders === 1 ? '' : 's'} pago{orders === 1 ? '' : 's'} com comissão · cai direto na sua conta Mercado Pago</p>
        {rows && rows.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {rows.map(r => (
              <li key={r.restaurant_id} className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-[#3f4a38]">{r.restaurant_name} <span className="text-[#6b7465]">· {r.orders_count} pedidos · {brl(Number(r.gross))}</span></span>
                <span className="font-bold text-[#1a1a1a] shrink-0">{brl(Number(r.commission))}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
