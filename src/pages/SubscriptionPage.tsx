import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Leaf, ShieldCheck, Clock, CheckCircle2, AlertTriangle, XCircle, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../helpers/useAuth';
import { useMyRestaurant } from '../helpers/useRestaurants';
import { useMonthlyFee } from '../helpers/useRestaurants';
import { Button } from '../components/Button';

type PaymentMethod = 'pix' | 'credit_card' | 'debit_card';

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'pix',         label: 'PIX',            desc: 'Aprovação imediata',        icon: <Smartphone size={18} /> },
  { id: 'credit_card', label: 'Cartão de crédito', desc: 'À vista',               icon: <CreditCard size={18} /> },
  { id: 'debit_card',  label: 'Cartão de débito',  desc: 'Aprovação imediata',    icon: <Wallet size={18} /> },
];

function daysLeft(d: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function SubscriptionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { restaurant } = useMyRestaurant(user?.id ?? null);
  const { fee } = useMonthlyFee();
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [loading, setLoading] = useState(false);

  const status = restaurant?.subscription_status ?? 'trial';
  const isTrial = status === 'trial';
  const refDate = isTrial ? restaurant?.trial_ends_at : restaurant?.subscription_active_until;
  const remaining = daysLeft(refDate ?? null);
  const expired = remaining !== null && remaining < 0;
  const suspended = status === 'suspended';

  const statusInfo = suspended
    ? { icon: <XCircle size={24} className="text-red-500" />, label: 'Conta suspensa', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100', desc: 'Seu acesso está bloqueado. Renove a mensalidade para reativar sua loja.' }
    : expired
    ? { icon: <AlertTriangle size={24} className="text-orange-500" />, label: 'Acesso vencido', color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100', desc: 'Seu período expirou. Renove para manter sua loja ativa.' }
    : isTrial
    ? { icon: <Clock size={24} className="text-blue-500" />, label: 'Período de teste', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', desc: `Você tem ${remaining ?? 0} dia${remaining === 1 ? '' : 's'} grátis restante${remaining === 1 ? '' : 's'}.` }
    : remaining !== null && remaining <= 10
    ? { icon: <AlertTriangle size={24} className="text-yellow-500" />, label: 'Vencimento próximo', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100', desc: `Seu acesso vence em ${remaining} dia${remaining === 1 ? '' : 's'}. Renove para não perder continuidade.` }
    : { icon: <CheckCircle2 size={24} className="text-[#2D5016]" />, label: 'Assinatura ativa', color: 'text-[#2D5016]', bg: 'bg-[#e8f5e0]', border: 'border-[#c5e0a0]', desc: 'Sua loja está ativa e visível para todos os clientes.' };

  const handlePay = async () => {
    if (!restaurant || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-payment', {
        body: {
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          payerEmail: user.email,
          payerName: user.name,
          paymentMethod: method,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.checkoutUrl) throw new Error('Sem URL de checkout');

      window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
      toast.success('Redirecionando para o pagamento...');
      navigate('/meu-restaurante');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto safe-px py-4 flex items-center gap-3">
          <Link to="/meu-restaurante" className="text-[#555] hover:text-[#1a1a1a]">
            <ArrowLeft size={22} />
          </Link>
          <span className="font-bold text-[#1a1a1a] flex items-center gap-2">
            <Leaf size={18} className="text-[#6BA534]" /> Minha assinatura
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto safe-px py-6 space-y-4">

        {/* Status atual */}
        <div className={`rounded-2xl border p-5 ${statusInfo.bg} ${statusInfo.border} animate-fade-in-up`}>
          <div className="flex items-center gap-3 mb-2">
            {statusInfo.icon}
            <h2 className={`font-black text-lg ${statusInfo.color}`}>{statusInfo.label}</h2>
          </div>
          <p className="text-sm text-[#555] leading-relaxed">{statusInfo.desc}</p>
        </div>

        {/* Detalhes */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4 animate-fade-in-up">
          <h3 className="font-bold text-[#1a1a1a] flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#6BA534]" /> Detalhes da assinatura
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2.5 border-b border-gray-50">
              <span className="text-[#777]">Estabelecimento</span>
              <span className="font-semibold text-[#1a1a1a]">{restaurant?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-gray-50">
              <span className="text-[#777]">Plano</span>
              <span className="font-semibold text-[#1a1a1a]">Mensal — Floresta Já</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-gray-50">
              <span className="text-[#777]">Valor da mensalidade</span>
              <span className="font-black text-[#2D5016] text-base">R$ {Number(fee).toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-gray-50">
              <span className="text-[#777]">{isTrial ? 'Teste grátis até' : 'Acesso válido até'}</span>
              <span className={`font-semibold ${expired || suspended ? 'text-red-500' : 'text-[#1a1a1a]'}`}>{formatDate(refDate ?? null)}</span>
            </div>
            {remaining !== null && !expired && !suspended && (
              <div className="flex justify-between items-center py-2.5">
                <span className="text-[#777]">Dias restantes</span>
                <span className={`font-bold ${remaining <= 10 ? 'text-yellow-600' : 'text-[#2D5016]'}`}>{remaining} dia{remaining === 1 ? '' : 's'}</span>
              </div>
            )}
          </div>
        </div>

        {/* O que está incluso */}
        <div className="bg-white rounded-2xl shadow-sm p-5 animate-fade-in-up">
          <h3 className="font-bold text-[#1a1a1a] mb-3 text-sm">O que está incluso</h3>
          {[
            'Loja visível para todos os clientes de Floresta - PE',
            'Cardápio digital ilimitado com fotos e categorias',
            'Recebimento de pedidos em tempo real',
            'Pagamentos online via PIX, crédito e débito',
            'Sistema de promoções e combos',
            'Suporte via WhatsApp',
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 py-1.5">
              <CheckCircle2 size={14} className="text-[#6BA534] mt-0.5 shrink-0" />
              <span className="text-sm text-[#555]">{item}</span>
            </div>
          ))}
        </div>

        {/* Renovar */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4 animate-fade-in-up">
          <h3 className="font-bold text-[#1a1a1a]">Renovar por 30 dias</h3>
          <p className="text-sm text-[#777]">Escolha a forma de pagamento e conclua pelo Mercado Pago:</p>

          <div className="space-y-2">
            {PAYMENT_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setMethod(opt.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${method === opt.id ? 'border-[#2D5016] bg-[#f0f8e8]' : 'border-gray-100 hover:border-gray-200'}`}
              >
                <span className={`${method === opt.id ? 'text-[#2D5016]' : 'text-[#aaa]'}`}>{opt.icon}</span>
                <div className="text-left">
                  <p className={`font-semibold text-sm ${method === opt.id ? 'text-[#2D5016]' : 'text-[#333]'}`}>{opt.label}</p>
                  <p className="text-xs text-[#aaa]">{opt.desc}</p>
                </div>
                <div className={`ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center ${method === opt.id ? 'border-[#2D5016] bg-[#2D5016]' : 'border-gray-300'}`}>
                  {method === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-xs text-[#aaa]">Total a pagar</p>
              <p className="text-2xl font-black text-[#2D5016]">R$ {Number(fee).toFixed(2).replace('.', ',')}</p>
            </div>
            <Button onClick={handlePay} loading={loading} size="lg">
              Pagar agora →
            </Button>
          </div>

          <p className="text-[11px] text-[#bbb] text-center">
            Pagamento seguro via Mercado Pago. Após confirmação, seu acesso é renovado automaticamente por 30 dias.
          </p>
        </div>
      </main>
    </div>
  );
}
