import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Clock, ExternalLink, ArrowLeft, Leaf } from 'lucide-react';
import { useOrderTracking } from '../helpers/useOrders';

export function PaymentWaiting() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { order, isLoading, notFound } = useOrderTracking(id ?? null);

  // Assim que o pagamento for confirmado (status sai de "awaiting_payment"),
  // o cliente é levado automaticamente para a tela de acompanhamento do pedido.
  useEffect(() => {
    if (order && order.status !== 'awaiting_payment') {
      navigate(`/pedido/${order.id}`, { replace: true });
    }
  }, [order, navigate]);

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

  return (
    <div className="min-h-screen bg-[#f7f5f0] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm p-8 text-center">
        <div className="flex justify-center mb-2">
          <Leaf size={20} className="text-[#6BA534]" />
        </div>
        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-yellow-50 flex items-center justify-center">
              <Clock size={36} className="text-yellow-500" />
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-yellow-200 border-t-yellow-500 animate-spin" />
          </div>
        </div>
        <h1 className="text-xl font-black text-[#1a1a1a] mb-2">Aguardando pagamento</h1>
        <p className="text-sm font-semibold text-[#555] mb-2">Pedido #{order.order_number}</p>
        <p className="text-sm text-[#666] mb-6">
          Estamos aguardando a confirmação do seu pagamento pelo Mercado Pago.
          Assim que for aprovado, o estabelecimento receberá seu pedido automaticamente
          e você será redirecionado para o acompanhamento.
        </p>

        <div className="bg-yellow-50 text-yellow-700 text-xs rounded-xl px-4 py-3 mb-6 text-left flex gap-2">
          <ExternalLink size={15} className="shrink-0 mt-0.5" />
          <span>
            Se a aba de pagamento não abriu ou você a fechou sem concluir,
            volte ao carrinho e finalize o pagamento para que seu pedido seja enviado.
          </span>
        </div>

        <Link to="/restaurantes"
          className="flex items-center justify-center gap-2 text-sm font-semibold text-[#2D5016] hover:underline py-2">
          <ArrowLeft size={15} /> Voltar aos estabelecimentos
        </Link>
      </div>
    </div>
  );
}
