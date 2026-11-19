import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';

/* Formulário de cartão oficial do Mercado Pago (Card Payment Brick).
   Os campos do cartão rodam dentro do SDK do MP e viram um token de uso
   único — o número do cartão nunca passa pelo nosso código nem servidor. */

const SDK_URL = 'https://sdk.mercadopago.com/js/v2';

export interface CardFormData {
  token: string;
  issuer_id?: string;
  payment_method_id: string;
  transaction_amount: number;
  installments: number;
  payer?: { email?: string; identification?: { type: string; number: string } };
}


/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { MercadoPago?: any }
}

let sdkPromise: Promise<void> | null = null;
function loadSdk() {
  if (window.MercadoPago) return Promise.resolve();
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SDK_URL;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { sdkPromise = null; reject(new Error('sdk')); };
      document.head.appendChild(s);
    });
  }
  return sdkPromise;
}

export function CardPaymentForm({ publicKey, amount, email, method, maxInstallments, onSubmit }: {
  publicKey: string;
  amount: number;
  email?: string;
  method: 'credit_card' | 'debit_card';
  maxInstallments: number;
  onSubmit: (data: CardFormData) => Promise<void>;
}) {
  const containerId = `card-brick-${useId().replace(/:/g, '')}`;
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const submitRef = useRef(onSubmit);
  useEffect(() => { submitRef.current = onSubmit; }, [onSubmit]);

  useEffect(() => {
    let cancelled = false;
    let controller: any = null;
    // O SDK nem sempre avisa quando falha ao iniciar (ex.: Public Key inválida):
    // se não abrir em 15s, mostramos o aviso.
    const timeout = setTimeout(() => {
      if (!cancelled) setState(s => (s === 'ready' ? s : 'error'));
    }, 15000);

    loadSdk().then(async () => {
      if (cancelled) return;
      const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
      controller = await mp.bricks().create('cardPayment', containerId, {
        initialization: { amount: Number(amount.toFixed(2)), payer: email ? { email } : undefined },
        customization: {
          visual: {
            hideFormTitle: true,
            style: { theme: 'default', customVariables: { baseColor: '#2D5016', borderRadiusLarge: '16px' } },
          },
          paymentMethods: {
            maxInstallments,
            types: { excluded: [method === 'credit_card' ? 'debit_card' : 'credit_card'] },
          },
        },
        callbacks: {
          onReady: () => { if (!cancelled) setState('ready'); },
          onSubmit: (data: CardFormData) => submitRef.current(data),
          onError: (err: { type?: string }) => {
            console.error('[card brick]', err);
            // Erro crítico (ex.: Public Key inválida) antes de abrir: mostra aviso
            // em vez de ficar carregando para sempre.
            if (!cancelled && err?.type === 'critical') setState(s => (s === 'ready' ? s : 'error'));
          },
        },
      });
      if (cancelled) controller?.unmount();
    }).catch(() => { if (!cancelled) setState('error'); });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      try { controller?.unmount(); } catch { /* já desmontado */ }
    };
  }, [publicKey, amount, email, method, maxInstallments, containerId]);

  return (
    <div>
      {state === 'loading' && (
        <div className="py-10 flex flex-col items-center gap-2 text-sm text-[#7a8274]">
          <Loader2 size={22} className="animate-spin text-[#6BA534]" />
          Carregando formulário seguro...
        </div>
      )}
      {state === 'error' && (
        <div className="py-8 flex flex-col items-center gap-2 text-center text-sm text-[#4a5544]">
          <AlertTriangle size={22} className="text-orange-500" />
          Não foi possível carregar o formulário de cartão agora. Tente de novo em instantes ou pague com Pix.
        </div>
      )}
      <div id={containerId} />
      {state === 'ready' && (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#8a9483]">
          <ShieldCheck size={13} className="text-[#6BA534]" />
          Dados do cartão protegidos pelo Mercado Pago — não ficam salvos no Floresta Já.
        </p>
      )}
    </div>
  );
}
