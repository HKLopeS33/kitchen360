import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../helpers/useAuth';
import { supabase } from '../lib/supabase';

/** Volta do Mercado Pago depois que a loja autoriza o Floresta Já. */
export function MercadoPagoReturn() {
  const [params] = useSearchParams();
  const { user, isLoading } = useAuth();
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('');
  const sent = useRef(false);

  useEffect(() => {
    if (isLoading || sent.current) return;
    const code = params.get('code');
    const st = params.get('state');
    if (params.get('error') || !code || !st) {
      setState('error');
      setMessage('A conexão foi cancelada no Mercado Pago.');
      return;
    }
    if (!user) {
      setState('error');
      setMessage('Entre na conta do estabelecimento e tente conectar de novo.');
      return;
    }
    sent.current = true;
    supabase.functions.invoke('mp-connect', { body: { action: 'finish', code, state: st } })
      .then(({ data, error }) => {
        if (error || data?.error || !data?.connected) {
          setState('error');
          setMessage(data?.error ?? 'Não foi possível concluir a conexão. Tente de novo.');
        } else {
          setState('done');
        }
      });
  }, [params, user, isLoading]);

  return (
    <div className="min-h-screen bg-[#f7f5f0] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-[0_2px_16px_rgba(20,40,10,0.08)] p-8 text-center flex flex-col items-center gap-3">
        {state === 'working' && (
          <>
            <Loader2 size={32} className="animate-spin text-[#6BA534]" />
            <p className="text-sm text-[#3f4a38]">Concluindo a conexão com o Mercado Pago...</p>
          </>
        )}
        {state === 'done' && (
          <>
            <div className="w-14 h-14 rounded-full bg-[#e8f5e0] flex items-center justify-center">
              <CheckCircle2 size={28} className="text-[#2D5016]" />
            </div>
            <h1 className="text-lg font-black text-[#1a1a1a]">Mercado Pago conectado!</h1>
            <p className="text-sm text-[#5c6556]">Seus clientes já podem pagar por Pix e cartão. O dinheiro cai direto na sua conta.</p>
            <Link to="/configuracoes" className="mt-2 h-11 px-6 rounded-full bg-[#2D5016] text-white text-sm font-bold flex items-center">
              Voltar às configurações
            </Link>
          </>
        )}
        {state === 'error' && (
          <>
            <AlertTriangle size={30} className="text-orange-500" />
            <p className="text-sm text-[#3f4a38]">{message}</p>
            <Link to="/configuracoes" className="mt-2 h-11 px-6 rounded-full bg-[#2D5016] text-white text-sm font-bold flex items-center">
              Voltar às configurações
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
