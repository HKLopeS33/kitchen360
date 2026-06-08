import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Loader2, Leaf } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function SubscriptionStatus() {
  const [params] = useSearchParams();
  const result = params.get('result') ?? 'pendente';    // sucesso | falha | pendente
  const restaurantId = params.get('rid');

  const [verified, setVerified]   = useState<'loading' | 'confirmed' | 'pending' | 'failed'>('loading');
  const [validUntil, setValidUntil] = useState<string | null>(null);
  const [, setPollCount]   = useState(0);

  // Consulta o banco até confirmar que a assinatura foi renovada (webhook pode demorar alguns segundos)
  useEffect(() => {
    if (!restaurantId || result === 'falha') {
      setVerified('failed');
      return;
    }

    let cancelled = false;
    const maxAttempts = 12; // até ~24 segundos de polling

    const check = async () => {
      const { data } = await supabase
        .from('restaurants')
        .select('subscription_status, subscription_active_until, last_subscription_payment_id')
        .eq('id', restaurantId)
        .maybeSingle();

      if (cancelled) return;

      const isActive = data?.subscription_status === 'active';
      const hasPaymentId = !!data?.last_subscription_payment_id;

      if (isActive && hasPaymentId) {
        setVerified('confirmed');
        setValidUntil(data?.subscription_active_until ?? null);
        return;
      }

      setPollCount(a => {
        const next = a + 1;
        if (next >= maxAttempts) {
          setVerified(result === 'sucesso' ? 'pending' : 'failed');
        } else {
          setTimeout(check, 2000);
        }
        return next;
      });
    };

    setTimeout(check, 1500); // pequena espera inicial para o webhook processar
    return () => { cancelled = true; };
  }, [restaurantId, result]);

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  return (
    <div className="min-h-screen bg-[#f7f5f0] flex flex-col items-center justify-center px-6 py-12">
      <Link to="/meu-restaurante" className="flex items-center gap-2 text-[#2D5016] font-bold text-lg mb-8">
        <Leaf size={20} className="text-[#6BA534]" /> Floresta Já
      </Link>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm p-7 text-center animate-fade-in-up">

        {/* Verificando */}
        {verified === 'loading' && (
          <>
            <Loader2 size={48} className="text-[#6BA534] mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-black text-[#1a1a1a] mb-2">Verificando pagamento…</h2>
            <p className="text-sm text-[#888]">Aguarde enquanto confirmamos com o Mercado Pago.</p>
            <div className="mt-4 flex justify-center gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className="w-2 h-2 rounded-full bg-[#6BA534] animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </>
        )}

        {/* Confirmado */}
        {verified === 'confirmed' && (
          <>
            <div className="w-16 h-16 rounded-full bg-[#e8f5e0] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-[#2D5016]" />
            </div>
            <h2 className="text-xl font-black text-[#2D5016] mb-2">Pagamento confirmado!</h2>
            <p className="text-sm text-[#666] leading-relaxed mb-4">
              Sua assinatura foi renovada com sucesso. Sua loja está ativa e visível para todos os clientes.
            </p>
            <div className="bg-[#f0f8e8] rounded-2xl py-3 px-4 mb-5">
              <p className="text-xs text-[#888] mb-0.5">Acesso garantido até</p>
              <p className="font-black text-[#2D5016] text-lg">{formatDate(validUntil)}</p>
            </div>
            <Link to="/meu-restaurante"
              className="block w-full py-3 bg-[#2D5016] text-white font-bold rounded-2xl hover:bg-[#3d6b1e] transition-colors">
              Ir para meu painel
            </Link>
          </>
        )}

        {/* Pendente (pago no MP mas webhook ainda não chegou) */}
        {verified === 'pending' && (
          <>
            <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="text-yellow-500" />
            </div>
            <h2 className="text-xl font-black text-yellow-600 mb-2">Pagamento em análise</h2>
            <p className="text-sm text-[#666] leading-relaxed mb-4">
              Seu pagamento foi recebido pelo Mercado Pago e está sendo processado. A renovação do acesso
              pode levar alguns minutos — você receberá uma notificação assim que for confirmado.
            </p>
            <p className="text-xs text-[#aaa] mb-5">
              Se o pagamento for aprovado, sua assinatura será renovada automaticamente. Não é necessário pagar novamente.
            </p>
            <Link to="/meu-restaurante"
              className="block w-full py-3 bg-[#2D5016] text-white font-bold rounded-2xl hover:bg-[#3d6b1e] transition-colors">
              Voltar ao painel
            </Link>
          </>
        )}

        {/* Falha */}
        {verified === 'failed' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <XCircle size={32} className="text-red-500" />
            </div>
            <h2 className="text-xl font-black text-red-500 mb-2">Pagamento não concluído</h2>
            <p className="text-sm text-[#666] leading-relaxed mb-4">
              O pagamento não foi finalizado. Nenhum valor foi cobrado e sua assinatura permanece inalterada.
            </p>
            <p className="text-xs text-[#aaa] mb-5">
              Você pode tentar novamente a qualquer momento pela página "Minha assinatura".
            </p>
            <Link to="/assinatura"
              className="block w-full py-3 bg-[#2D5016] text-white font-bold rounded-2xl hover:bg-[#3d6b1e] transition-colors mb-3">
              Tentar novamente
            </Link>
            <Link to="/meu-restaurante" className="block text-sm text-[#aaa] hover:text-[#666] transition-colors">
              Voltar ao painel
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
