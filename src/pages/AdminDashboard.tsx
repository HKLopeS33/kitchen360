import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, LogOut, ShieldCheck, CheckCircle2, Ban, RotateCcw, Pencil, Check, X, Clock, Store, CreditCard, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../helpers/useAuth';
import { useAdminSubscriptions, useMonthlyFee } from '../helpers/useRestaurants';
import { supabase } from '../lib/supabase';
import type { Restaurant } from '../lib/supabase';

function formatPrice(p: number) { return `R$ ${Number(p).toFixed(2).replace('.', ',')} /mês`; }
function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function daysLeft(d: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const STATUS_META: Record<Restaurant['subscription_status'], { label: string; dot: string; text: string }> = {
  trial:     { label: 'Teste',     dot: 'bg-blue-400',   text: 'text-blue-600' },
  active:    { label: 'Ativo',     dot: 'bg-[#6BA534]',  text: 'text-[#2D5016]' },
  past_due:  { label: 'Vencido',   dot: 'bg-orange-400', text: 'text-orange-600' },
  suspended: { label: 'Suspenso',  dot: 'bg-red-400',    text: 'text-red-500' },
};

export function AdminDashboard() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { restaurants, isLoading, registerPayment, suspend, reactivate } = useAdminSubscriptions();
  const { fee, updateFee } = useMonthlyFee();

  const [editingFee, setEditingFee] = useState(false);
  const [feeInput, setFeeInput] = useState('');
  const [savingFee, setSavingFee] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [savingToken, setSavingToken] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate('/login');
    else if (user.role !== 'admin') navigate('/restaurantes');
  }, [user, authLoading, navigate]);

  useEffect(() => { setFeeInput(String(fee)); }, [fee]);

  // Carrega token do admin ao montar
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'admin_mp_token').maybeSingle()
      .then(({ data }) => { if (data?.value) setAdminToken(data.value); });
  }, []);

  async function handleSaveToken() {
    if (!adminToken.trim()) { toast.error('Informe o Access Token'); return; }
    setSavingToken(true);
    try {
      await supabase.from('app_settings').upsert({ key: 'admin_mp_token', value: adminToken.trim(), updated_at: new Date().toISOString() });
      toast.success('Token salvo! Pagamentos de mensalidade serão direcionados à sua conta.');
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingToken(false); }
  }

  async function handleSaveFee() {
    const value = Number(feeInput.replace(',', '.'));
    if (isNaN(value) || value < 0) { toast.error('Valor inválido'); return; }
    setSavingFee(true);
    try { await updateFee(value); toast.success('Mensalidade atualizada!'); setEditingFee(false); }
    catch (err: any) { toast.error(err.message); }
    finally { setSavingFee(false); }
  }

  async function handleAction(action: 'pay' | 'suspend' | 'reactivate', restaurant: Restaurant) {
    setBusyId(restaurant.id);
    try {
      if (action === 'pay') { await registerPayment(restaurant); toast.success(`+30 dias registrado para "${restaurant.name}".`); }
      if (action === 'suspend') { await suspend(restaurant.id); toast.success(`"${restaurant.name}" suspenso.`); }
      if (action === 'reactivate') { await reactivate(restaurant.id); toast.success(`"${restaurant.name}" reativado.`); }
    } catch (err: any) { toast.error(err.message); }
    finally { setBusyId(null); }
  }

  if (authLoading || !user || user.role !== 'admin') return null;

  const counts = {
    trial:     restaurants.filter(r => (r.subscription_status ?? 'trial') === 'trial').length,
    active:    restaurants.filter(r => r.subscription_status === 'active').length,
    past_due:  restaurants.filter(r => r.subscription_status === 'past_due').length,
    suspended: restaurants.filter(r => r.subscription_status === 'suspended').length,
  };

  return (
    <div className="min-h-screen bg-[#f4f6f3]">
      {/* Header */}
      <header className="bg-[#2D5016] sticky top-0 z-10">
        <div className="max-w-2xl lg:max-w-3xl mx-auto safe-px py-3.5 flex items-center justify-between">
          <Link to="/restaurantes" className="flex items-center gap-2 text-white font-bold">
            <Leaf size={18} className="text-[#9fd66c]" /> Floresta Já
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-[#9fd66c]" />
            <span className="text-sm text-white/80 font-medium">Admin</span>
            <span className="text-white/30 mx-1">·</span>
            <button onClick={logout} className="flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors">
              <LogOut size={14} /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl lg:max-w-3xl mx-auto safe-px py-5 space-y-4">

        {/* Linha de resumo rápido */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Em teste',  value: counts.trial,     bg: 'bg-white', num: 'text-blue-500' },
            { label: 'Ativos',    value: counts.active,    bg: 'bg-white', num: 'text-[#2D5016]' },
            { label: 'Vencidos',  value: counts.past_due,  bg: 'bg-white', num: 'text-orange-500' },
            { label: 'Suspensos', value: counts.suspended, bg: 'bg-white', num: 'text-red-500' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-3 text-center shadow-sm`}>
              <p className={`text-2xl font-black ${s.num}`}>{s.value}</p>
              <p className="text-[10px] text-[#999] font-semibold mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Mensalidade */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[#999] font-medium">Mensalidade mensal</p>
            {editingFee ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-[#888]">R$</span>
                <input
                  value={feeInput} onChange={e => setFeeInput(e.target.value)} inputMode="decimal"
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-bold w-24 outline-none focus:border-[#2D5016] transition-all"
                />
                <button onClick={handleSaveFee} disabled={savingFee}
                  className="w-8 h-8 rounded-lg bg-[#2D5016] text-white flex items-center justify-center hover:bg-[#3d6b1e] disabled:opacity-50">
                  <Check size={14} />
                </button>
                <button onClick={() => { setEditingFee(false); setFeeInput(String(fee)); }}
                  className="w-8 h-8 rounded-lg bg-gray-100 text-[#777] flex items-center justify-center hover:bg-gray-200">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <p className="text-xl font-black text-[#1a1a1a] mt-0.5">
                {formatPrice(fee)}
              </p>
            )}
          </div>
          {!editingFee && (
            <button onClick={() => setEditingFee(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#6BA534] hover:text-[#2D5016] bg-[#f0f8e8] hover:bg-[#e4f4d4] px-3 py-2 rounded-xl transition-colors shrink-0">
              <Pencil size={12} /> Editar
            </button>
          )}
        </div>

        {/* Token MP do admin para receber mensalidades */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard size={15} className="text-[#6BA534]" />
            <p className="text-sm font-bold text-[#1a1a1a]">Recebimento de mensalidades</p>
          </div>
          <p className="text-xs text-[#999] leading-relaxed">
            Seu <strong>Access Token de Produção</strong> do Mercado Pago. Os pagamentos de mensalidade de todos os restaurantes serão direcionados à sua conta.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showToken ? 'text' : 'password'}
                value={adminToken}
                onChange={e => setAdminToken(e.target.value)}
                placeholder="APP_USR-xxxxxxxxxxxxxxxx"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm font-mono outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all"
              />
              <button type="button" onClick={() => setShowToken(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#555]">
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <button onClick={handleSaveToken} disabled={savingToken}
              className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl bg-[#2D5016] text-white hover:bg-[#3d6b1e] disabled:opacity-50 transition-colors shrink-0">
              <Check size={13} /> Salvar
            </button>
          </div>
          {adminToken && (
            <p className="text-[11px] text-[#6BA534] flex items-center gap-1">
              <CheckCircle2 size={11} /> Token configurado — pagamentos ativos
            </p>
          )}
        </div>

        {/* Lista de estabelecimentos */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Store size={15} className="text-[#6BA534]" />
            <h2 className="font-bold text-[#1a1a1a] text-sm">Estabelecimentos <span className="text-[#aaa] font-normal">({restaurants.length})</span></h2>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-white animate-pulse" />)}
            </div>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-12 text-sm text-[#bbb]">Nenhum estabelecimento cadastrado.</div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
              {restaurants.map((r, idx) => {
                const status = STATUS_META[r.subscription_status] ?? STATUS_META.trial;
                const isTrial = (r.subscription_status ?? 'trial') === 'trial';
                const refDate = isTrial ? r.trial_ends_at : r.subscription_active_until;
                const remaining = daysLeft(refDate);
                const expired = remaining !== null && remaining < 0;

                return (
                  <div key={r.id} style={{ animationDelay: `${idx * 30}ms` }}
                    className="px-4 py-3 flex items-center gap-3 animate-fade-in-up">

                    {/* Status dot + info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />
                        <span className="font-semibold text-[#1a1a1a] text-sm truncate">{r.name}</span>
                        <span className={`text-[10px] font-bold shrink-0 ${status.text}`}>{status.label}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 ml-4 text-[11px] text-[#aaa]">
                        <Clock size={10} className={expired ? 'text-red-400' : 'text-[#6BA534]'} />
                        <span>{isTrial ? 'Teste' : 'Pago'} até {formatDate(refDate)}</span>
                        {remaining !== null && (
                          <span className={`font-bold ${expired ? 'text-red-400' : remaining <= 5 ? 'text-orange-400' : 'text-[#6BA534]'}`}>
                            · {expired ? 'expirado' : `${remaining}d`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleAction('pay', r)} disabled={busyId === r.id}
                        title="Registrar pagamento (+30 dias)"
                        className="w-8 h-8 rounded-xl bg-[#2D5016] text-white flex items-center justify-center hover:bg-[#3d6b1e] transition-colors disabled:opacity-40">
                        <CheckCircle2 size={14} />
                      </button>
                      {r.subscription_status === 'suspended' ? (
                        <button
                          onClick={() => handleAction('reactivate', r)} disabled={busyId === r.id}
                          title="Reativar"
                          className="w-8 h-8 rounded-xl bg-[#e8f5e0] text-[#2D5016] flex items-center justify-center hover:bg-[#d4edbc] transition-colors disabled:opacity-40">
                          <RotateCcw size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction('suspend', r)} disabled={busyId === r.id}
                          title="Suspender"
                          className="w-8 h-8 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 transition-colors disabled:opacity-40">
                          <Ban size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legenda das ações */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-[#bbb] pb-2">
          <span className="flex items-center gap-1"><CheckCircle2 size={11} /> +30 dias</span>
          <span className="flex items-center gap-1"><RotateCcw size={11} /> Reativar</span>
          <span className="flex items-center gap-1"><Ban size={11} /> Suspender</span>
        </div>
      </main>
    </div>
  );
}
