import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertTriangle, CreditCard, Smartphone, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useOrderTracking } from '../helpers/useOrders';
import { useAuth } from '../helpers/useAuth';
import { supabase } from '../lib/supabase';
import { PixPayment, type PixData } from '../components/PixPayment';
import { CardPaymentForm, type CardFormData } from '../components/CardPaymentForm';
import { cardResultMessage } from '../helpers/cardPayment';

type Mode = 'pix' | 'card';
type CardMethod = 'credit_card' | 'debit_card';

function formatPrice(p: number) { return `R$ ${Number(p).toFixed(2).replace('.', ',')}`; }

/** Tela de pagamento do pedido, dentro do app: Pix (QR Code) ou cartão. */
export function PaymentWaiting() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { order, isLoading, notFound } = useOrderTracking(id ?? null);

  const [modeChoice, setModeChoice] = useState<Mode | null>(null);
  const [cardMethodChoice, setCardMethodChoice] = useState<CardMethod | null>(null);

  // ── Pix ──
  // O carrinho já manda o Pix gerado; se a tela for reaberta, buscamos de novo
  // (a função devolve o mesmo código enquanto ele vale).
  const [pix, setPix] = useState<PixData | null>((location.state as { pix?: PixData } | null)?.pix ?? null);
  const [pixError, setPixError] = useState<string | null>(null);
  const [renewing, setRenewing] = useState(false);
  const requested = useRef(false);

  // ── Cartão ──
  const [publicKey, setPublicKey] = useState<string | null | undefined>(undefined);
  const [cardMessage, setCardMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);
  const [brickKey, setBrickKey] = useState(0);

  const orderMethod = order?.payment_method;
  const mode: Mode = modeChoice ?? (orderMethod === 'credit_card' || orderMethod === 'debit_card' ? 'card' : 'pix');
  const cardMethod: CardMethod = cardMethodChoice ?? (orderMethod === 'debit_card' ? 'debit_card' : 'credit_card');
  const awaiting = order?.status === 'awaiting_payment';

  const loadPix = useCallback(async (renew: boolean) => {
    if (!id) return;
    const { data, error } = await supabase.functions.invoke('create-payment', {
      body: { orderId: id, paymentMethod: 'pix', renew },
    });
    if (error || data?.error || !data?.pix) {
      setPixError(data?.error ?? 'Não foi possível gerar o Pix agora.');
      return;
    }
    setPixError(null);
    setPix(data.pix);
  }, [id]);

  useEffect(() => {
    if (mode !== 'pix' || pix || requested.current || !awaiting) return;
    requested.current = true;
    void loadPix(false);
  }, [mode, pix, awaiting, loadPix]);

  // Public Key do estabelecimento (pública) para o formulário de cartão.
  const restaurantId = order?.restaurant_id;
  useEffect(() => {
    if (mode !== 'card' || !restaurantId || publicKey !== undefined) return;
    supabase.from('restaurants').select('mp_public_key').eq('id', restaurantId).maybeSingle()
      .then(({ data }) => setPublicKey((data as { mp_public_key?: string | null } | null)?.mp_public_key?.trim() || null));
  }, [mode, restaurantId, publicKey]);

  // Pagamento confirmado (status sai de "awaiting_payment") → acompanhamento.
  useEffect(() => {
    if (order && order.status !== 'awaiting_payment') {
      navigate(`/pedido/${order.id}`, { replace: true });
    }
  }, [order, navigate]);

  const renew = async () => {
    setRenewing(true);
    await loadPix(true);
    setRenewing(false);
  };

  const handleCard = useCallback(async (data: CardFormData) => {
    setCardMessage(null);
    const { data: res, error } = await supabase.functions.invoke('create-payment', {
      body: { orderId: id, paymentMethod: cardMethod, card: data },
    });
    if (error || res?.error || !res?.card) {
      setCardMessage({ tone: 'error', text: res?.error ?? 'Não foi possível processar o pagamento. Tente de novo.' });
      setBrickKey(k => k + 1);
      return;
    }
    const r = res.card as { status: string; statusDetail: string };
    if (r.status === 'approved') {
      toast.success('Pagamento aprovado! Pedido enviado ao estabelecimento.');
      navigate(`/pedido/${id}`, { replace: true });
      return;
    }
    if (r.status === 'in_process' || r.status === 'pending') {
      setCardMessage({ tone: 'info', text: cardResultMessage(r) });
      return;
    }
    setCardMessage({ tone: 'error', text: cardResultMessage(r) });
    setBrickKey(k => k + 1); // novo formulário para outra tentativa
  }, [id, cardMethod, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex items-center justify-center">
        <div className="animate-pulse text-[#aaa] text-sm">Carregando...</div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex flex-col items-center justify-center gap-4 px-4">
        <h2 className="text-xl font-bold text-[#333]">Pedido não encontrado</h2>
        <Link to="/restaurantes" className="text-[#2D5016] font-semibold hover:underline">Voltar aos estabelecimentos</Link>
      </div>
    );
  }

  const analysing = cardMessage?.tone === 'info';

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/restaurantes" aria-label="Voltar" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-[#4a5544] hover:bg-[#f1f5ec]">
            <ArrowLeft size={20} />
          </Link>
          <span className="font-bold text-[#1a1a1a]">Pagamento</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 flex flex-col gap-4">
        {/* Pix ou cartão */}
        {!analysing && (
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-white shadow-[0_1px_6px_rgba(20,40,10,0.06)]">
            {([['pix', 'Pix', Smartphone], ['card', 'Cartão', CreditCard]] as const).map(([m, label, Icon]) => (
              <button key={m} onClick={() => { setModeChoice(m); setCardMessage(null); }}
                className={`h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${mode === m ? 'bg-[#2D5016] text-white' : 'text-[#4a5544] hover:bg-[#f1f5ec]'}`}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        )}

        {mode === 'pix' ? (
          pix ? (
            <PixPayment
              pix={pix}
              title={`Pedido #${order.order_number}`}
              subtitle={order.restaurant_name}
              onRenew={renew}
              renewing={renewing}
            />
          ) : pixError ? (
            <div className="bg-white rounded-3xl p-6 text-center flex flex-col items-center gap-3 shadow-[0_2px_16px_rgba(20,40,10,0.08)]">
              <AlertTriangle size={28} className="text-orange-500" />
              <p className="text-sm text-[#4a5544]">{pixError}</p>
              <button onClick={() => { setPixError(null); void loadPix(false); }}
                className="h-11 px-5 rounded-full bg-[#2D5016] text-white text-sm font-bold">
                Tentar de novo
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-10 flex flex-col items-center gap-3 text-sm text-[#7a8274] shadow-[0_2px_16px_rgba(20,40,10,0.08)]">
              <Loader2 size={24} className="animate-spin text-[#6BA534]" />
              Gerando código Pix...
            </div>
          )
        ) : (
          <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(20,40,10,0.08)] overflow-hidden animate-scale-in">
            <div className="px-5 pt-5 pb-4 text-center border-b border-[#eceee8]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6BA534]">Pedido #{order.order_number}</p>
              <p className="mt-1 text-3xl font-black text-[#1f3a0f] tabular-nums">{formatPrice(order.total)}</p>
              {order.restaurant_name && <p className="mt-0.5 text-sm text-[#7a8274]">{order.restaurant_name}</p>}
            </div>

            <div className="p-4 flex flex-col gap-4">
              {analysing ? (
                <div className="py-6 flex flex-col items-center text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-yellow-50 flex items-center justify-center">
                    <Clock size={26} className="text-yellow-500" />
                  </div>
                  <p className="text-sm text-[#4a5544] px-2">{cardMessage.text}</p>
                  <p className="text-xs text-[#8a9483]">Pode sair desta tela: o pedido segue sozinho quando for aprovado.</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    {([['credit_card', 'Crédito'], ['debit_card', 'Débito']] as const).map(([m, label]) => (
                      <button key={m} onClick={() => { setCardMethodChoice(m); setCardMessage(null); }}
                        className={`h-9 px-4 rounded-full text-sm font-semibold border ${cardMethod === m ? 'border-[#2D5016] bg-[#e8f5e0] text-[#2D5016]' : 'border-[#e3e8dd] text-[#4a5544]'}`}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {cardMessage?.tone === 'error' && (
                    <div className="rounded-xl bg-red-50 text-red-700 text-sm px-4 py-3 flex gap-2">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {cardMessage.text}
                    </div>
                  )}

                  {publicKey === undefined ? (
                    <div className="py-10 flex justify-center"><Loader2 size={22} className="animate-spin text-[#6BA534]" /></div>
                  ) : publicKey === null ? (
                    <div className="py-6 text-center text-sm text-[#4a5544] flex flex-col items-center gap-3">
                      <AlertTriangle size={24} className="text-orange-500" />
                      Este estabelecimento ainda não ativou o pagamento com cartão no app.
                      <button onClick={() => setModeChoice('pix')} className="h-11 px-5 rounded-full bg-[#2D5016] text-white text-sm font-bold">
                        Pagar com Pix
                      </button>
                    </div>
                  ) : (
                    <CardPaymentForm
                      key={`${cardMethod}-${brickKey}`}
                      publicKey={publicKey}
                      amount={Number(order.total)}
                      email={user?.email}
                      method={cardMethod}
                      maxInstallments={cardMethod === 'debit_card' ? 1 : 12}
                      onSubmit={handleCard}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-center text-[#8a9483] px-4">
          O pedido só é enviado ao estabelecimento depois que o pagamento for confirmado.
        </p>
      </main>
    </div>
  );
}
