import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, LogOut, ShieldCheck, Wallet, CheckCircle2, Ban, RotateCcw, Pencil, Check, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../helpers/useAuth';
import { useAdminSubscriptions, useMonthlyFee } from '../helpers/useRestaurants';
import type { Restaurant } from '../lib/supabase';

function formatPrice(p: number) { return `R$ ${Number(p).toFixed(2).replace('.', ',')}`; }
function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function daysLeft(d: string | null) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

const STATUS_META: Record<Restaurant['subscription_status'], { label: string; cls: string }> = {
  trial:     { label: 'Em teste',   cls: 'bg-blue-50 text-blue-600' },
  active:    { label: 'Ativo',      cls: 'bg-[#e8f5e0] text-[#2D5016]' },
  past_due:  { label: 'Vencido',    cls: 'bg-orange-50 text-orange-600' },
  suspended: { label: 'Suspenso',   cls: 'bg-red-50 text-red-500' },
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

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate('/login');
    else if (user.role !== 'admin') navigate('/restaurantes');
  }, [user, authLoading, navigate]);

  useEffect(() => { setFeeInput(String(fee)); }, [fee]);

  async function handleSaveFee() {
    const value = Number(feeInput.replace(',', '.'));
    if (isNaN(value) || value < 0) { toast.error('Valor inválido'); return; }
    setSavingFee(true);
    try { await updateFee(value); toast.success('Mensalidade atualizada para todos!'); setEditingFee(false); }
    catch (err: any) { toast.error(err.message); }
    finally { setSavingFee(false); }
  }

  async function handleAction(action: 'pay' | 'suspend' | 'reactivate', restaurant: Restaurant) {
    setBusyId(restaurant.id);
    try {
      if (action === 'pay') { await registerPayment(restaurant); toast.success(`Mensalidade de "${restaurant.name}" registrada — acesso renovado por 30 dias.`); }
      if (action === 'suspend') { await suspend(restaurant.id); toast.success(`"${restaurant.name}" suspenso.`); }
      if (action === 'reactivate') { await reactivate(restaurant.id); toast.success(`"${restaurant.name}" reativado.`); }
    } catch (err: any) { toast.error(err.message); }
    finally { setBusyId(null); }
  }

  if (authLoading || !user || user.role !== 'admin') return null;

  const counts = {
    trial: restaurants.filter(r => r.subscription_status === 'trial').length,
    active: restaurants.filter(r => r.subscription_status === 'active').length,
    past_due: restaurants.filter(r => r.subscription_status === 'past_due').length,
    suspended: restaurants.filter(r => r.subscription_status === 'suspended').length,
  };

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl lg:max-w-3xl mx-auto safe-px py-4 flex items-center justify-between">
          <Link to="/restaurantes" className="flex items-center gap-2 text-[#2D5016] font-bold text-lg">
            <Leaf size={22} className="text-[#6BA534]" /> Floresta Já
          </Link>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-[#777] hover:text-[#333] transition-colors">
            <LogOut size={15} /> Sair
          </button>
        </div>
      </header>

      <main className="max-w-2xl lg:max-w-3xl mx-auto safe-px py-8 space-y-6">
        <div className="animate-fade-in-up">
          <h1 className="text-[28px] sm:text-4xl font-black tracking-tight flex items-center gap-2.5 text-[#1a1a1a]">
            <ShieldCheck size={30} className="text-[#6BA534]" /> Painel do Administrador
          </h1>
          <p className="text-sm text-[#888] mt-1">Gerencie as assinaturas dos estabelecimentos da plataforma.</p>
        </div>

        {/* Mensalidade global */}
        <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(20,40,10,0.06)] p-5 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={18} className="text-[#6BA534]" />
            <h2 className="font-black text-[#1a1a1a]">Mensalidade da plataforma</h2>
          </div>
          <p className="text-xs text-[#999] mb-3">Valor único cobrado de todos os estabelecimentos pelo uso do sistema.</p>
          {editingFee ? (
            <div className="flex items-center gap-2">
              <span className="text-[#888] font-semibold">R$</span>
              <input
                value={feeInput}
                onChange={e => setFeeInput(e.target.value)}
                inputMode="decimal"
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold w-28 outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all"
              />
              <button onClick={handleSaveFee} disabled={savingFee}
                className="w-9 h-9 rounded-xl bg-[#2D5016] text-white flex items-center justify-center hover:bg-[#3d6b1e] transition-colors disabled:opacity-50">
                <Check size={16} />
              </button>
              <button onClick={() => { setEditingFee(false); setFeeInput(String(fee)); }}
                className="w-9 h-9 rounded-xl bg-gray-100 text-[#777] flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-[#2D5016]">{formatPrice(fee)}<span className="text-sm font-semibold text-[#999]">/mês</span></span>
              <button onClick={() => setEditingFee(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#6BA534] hover:text-[#2D5016] transition-colors">
                <Pencil size={13} /> Alterar para todos
              </button>
            </div>
          )}
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-4 gap-2.5 animate-fade-in-up">
          {[
            { label: 'Em teste', value: counts.trial, cls: 'text-blue-600 bg-blue-50' },
            { label: 'Ativos', value: counts.active, cls: 'text-[#2D5016] bg-[#e8f5e0]' },
            { label: 'Vencidos', value: counts.past_due, cls: 'text-orange-600 bg-orange-50' },
            { label: 'Suspensos', value: counts.suspended, cls: 'text-red-500 bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-3 text-center ${s.cls}`}>
              <p className="text-xl font-black leading-none">{s.value}</p>
              <p className="text-[10px] font-bold mt-1 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Lista de estabelecimentos / assinantes */}
        <div className="space-y-3">
          <h2 className="font-black text-[#1a1a1a] text-lg">Estabelecimentos ({restaurants.length})</h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
            </div>
          ) : restaurants.length === 0 ? (
            <p className="text-sm text-[#999] text-center py-10">Nenhum estabelecimento cadastrado ainda.</p>
          ) : (
            restaurants.map((r, idx) => {
              const status = STATUS_META[r.subscription_status] ?? STATUS_META.trial;
              const isTrial = (r.subscription_status ?? 'trial') === 'trial';
              const refDate = isTrial ? r.trial_ends_at : r.subscription_active_until;
              const remaining = daysLeft(refDate);
              const expired = remaining !== null && remaining < 0;

              const dayLabel = remaining === null ? '' : expired
                ? (isTrial ? 'expirado' : 'vencido')
                : `${remaining}d restante${remaining === 1 ? '' : 's'}`;

              return (
                <div key={r.id} style={{ animationDelay: `${idx * 40}ms` }}
                  className="bg-white rounded-xl shadow-[0_1px_8px_rgba(20,40,10,0.05)] px-3.5 py-3 animate-fade-in-up">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-[#1a1a1a] text-sm truncate">{r.name}</h3>
                      <p className="text-[11px] text-[#999] truncate">{r.owner_name ?? '—'}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                  </div>

                  <div className="flex items-center gap-1 mt-1.5 text-[11px] text-[#888]">
                    <Clock size={11} className={expired ? 'text-red-400' : 'text-[#6BA534]'} />
                    <span>{isTrial ? 'Teste até' : 'Pago até'} {formatDate(refDate)}</span>
                    {dayLabel && (
                      <span className={`font-bold ${expired ? 'text-red-500' : 'text-[#6BA534]'}`}>· {dayLabel}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-2.5">
                    <button
                      onClick={() => handleAction('pay', r)}
                      disabled={busyId === r.id}
                      title="Registrar pagamento (+30 dias)"
                      className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-[#2D5016] text-white hover:bg-[#3d6b1e] transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={12} /> +30 dias
                    </button>

                    {r.subscription_status === 'suspended' ? (
                      <button
                        onClick={() => handleAction('reactivate', r)}
                        disabled={busyId === r.id}
                        className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-[#e8f5e0] text-[#2D5016] hover:bg-[#d8edc8] transition-colors disabled:opacity-50"
                      >
                        <RotateCcw size={12} /> Reativar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction('suspend', r)}
                        disabled={busyId === r.id}
                        className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <Ban size={12} /> Suspender
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
