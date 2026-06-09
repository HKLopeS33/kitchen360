import { useParams, Link, Navigate } from 'react-router-dom';
import {
  CheckCircle2, Clock, ChefHat, PackageCheck, Truck, XCircle,
  ArrowLeft, MapPin, Store, Leaf, MessageCircle,
} from 'lucide-react';
import { useOrderTracking, type OrderStatus } from '../helpers/useOrders';

const STEPS: { key: OrderStatus; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'pending',   label: 'Pedido recebido',   desc: 'O estabelecimento recebeu seu pedido e vai confirmá-lo em instantes.', icon: <CheckCircle2 size={20} /> },
  { key: 'preparing', label: 'Em preparo',        desc: 'Seu pedido está sendo preparado com cuidado.',                          icon: <ChefHat size={20} /> },
  { key: 'ready',     label: 'Pronto / a caminho', desc: 'Seu pedido está pronto e a caminho até você.',                         icon: <Truck size={20} /> },
  { key: 'delivered', label: 'Entregue',          desc: 'Pedido entregue. Bom apetite! 🎉',                                      icon: <PackageCheck size={20} /> },
];

const STEP_INDEX: Record<OrderStatus, number> = { awaiting_payment: -1, pending: 0, preparing: 1, ready: 2, delivered: 3, cancelled: -1 };

function formatPrice(p: number) { return `R$ ${Number(p).toFixed(2).replace('.', ',')}`; }
function formatDate(d: string) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function buildWhatsAppUrl(order: { order_number: number; total: number; created_at: string; restaurant_phone?: string }) {
  const phone = (order.restaurant_phone ?? '').replace(/\D/g, '');
  if (!phone) return null;
  const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
  const date = formatDate(order.created_at);
  const total = formatPrice(order.total);
  const msg = `Olá! Gostaria de informações sobre meu pedido *#${order.order_number}*.\n\nValor pago: *${total}*\nRealizado em: ${date}`;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
}

export function OrderTracking() {
  const { id } = useParams<{ id: string }>();
  const { order, isLoading, notFound } = useOrderTracking(id ?? null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex items-center justify-center">
        <div className="flex items-center gap-2 text-[#aaa] text-sm"><div className="w-4 h-4 border-2 border-[#6BA534] border-t-transparent rounded-full animate-spin" />Carregando pedido...</div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex flex-col items-center justify-center gap-4 px-4">
        <XCircle size={56} className="text-gray-300" />
        <h2 className="text-xl font-bold text-[#333]">Pedido não encontrado</h2>
        <Link to="/restaurantes" className="text-[#2D5016] font-semibold hover:underline">Voltar aos estabelecimentos</Link>
      </div>
    );
  }

  if (order.status === 'awaiting_payment') {
    return <Navigate to={`/pagamento-pendente/${order.id}`} replace />;
  }

  const cancelled = order.status === 'cancelled';
  const currentIndex = STEP_INDEX[order.status];
  const whatsappUrl = buildWhatsAppUrl(order);

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl lg:max-w-3xl mx-auto safe-px py-4 flex items-center gap-3">
          <Link to="/restaurantes" className="text-[#555] hover:text-[#1a1a1a]">
            <ArrowLeft size={22} />
          </Link>
          <span className="font-bold text-[#1a1a1a] flex items-center gap-2">
            <Leaf size={18} className="text-[#6BA534]" /> Acompanhar pedido
          </span>
        </div>
      </header>

      <main className="max-w-2xl lg:max-w-3xl mx-auto safe-px py-6 space-y-5">

        {/* Cabeçalho do pedido */}
        <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between animate-fade-in-up">
          <div>
            <p className="text-xs text-[#999] mb-0.5">Pedido</p>
            <p className="text-2xl font-black bg-gradient-to-r from-[#2D5016] to-[#6BA534] bg-clip-text text-transparent">#{order.order_number}</p>
            <p className="text-xs text-[#aaa] mt-1">{formatDate(order.created_at)}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
            cancelled ? 'bg-red-50 text-red-600' : 'bg-[#e8f5e0] text-[#2D5016]'
          }`}>
            {cancelled ? 'Cancelado' : STEPS[currentIndex]?.label}
          </span>
        </div>

        {/* Linha do tempo */}
        {cancelled ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
              <XCircle size={20} />
            </div>
            <div>
              <p className="font-bold text-[#1a1a1a]">Pedido cancelado</p>
              <p className="text-sm text-[#888] mt-0.5">
                Esse pedido foi cancelado pelo estabelecimento. Em caso de pagamento já realizado, o estorno será processado pelo Mercado Pago.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-6 animate-fade-in-up">
            <div className="relative">
              {/* Linha vertical contínua de fundo */}
              <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-100 -translate-x-1/2" />
              {/* Linha vertical de progresso */}
              {currentIndex > 0 && (
                <div
                  className="absolute left-5 top-5 w-0.5 bg-[#2D5016] -translate-x-1/2 transition-all"
                  style={{ height: `calc(${(currentIndex / (STEPS.length - 1)) * 100}% - ${currentIndex === STEPS.length - 1 ? '40px' : '0px'})` }}
                />
              )}
              <div className="space-y-7 relative">
                {STEPS.map((step, i) => {
                  const done = i <= currentIndex;
                  const active = i === currentIndex;
                  return (
                    <div key={step.key} className="flex items-center gap-4">
                      {/* Indicador */}
                      <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                        done ? 'bg-gradient-to-b from-[#356019] to-[#2D5016] text-white shadow-[0_2px_10px_rgba(45,80,22,0.3)]' : 'bg-gray-100 text-gray-300'
                      } ${active ? 'ring-4 ring-[#e8f5e0] scale-110' : ''}`}>
                        {step.icon}
                      </div>
                      {/* Texto */}
                      <div>
                        <p className={`font-bold text-sm leading-tight ${done ? 'text-[#1a1a1a]' : 'text-[#bbb]'}`}>
                          {step.label}
                          {active && <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-[#6BA534] uppercase tracking-wide align-middle"><Clock size={11} className="animate-pulse" /> Agora</span>}
                        </p>
                        <p className={`text-xs mt-0.5 leading-snug ${done ? 'text-[#888]' : 'text-[#ccc]'}`}>{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Detalhes do pedido */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4 animate-fade-in-up">
          <h3 className="font-bold text-[#1a1a1a] flex items-center gap-2">
            <Store size={16} className="text-[#6BA534]" /> Itens do pedido
          </h3>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-[#555]">{item.quantity}× {item.name}</span>
                <span className="font-semibold text-[#333]">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
            <span className="text-[#666] font-medium text-sm">Total</span>
            <span className="text-xl font-black text-[#2D5016]">{formatPrice(order.total)}</span>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white rounded-2xl shadow-sm p-5 animate-fade-in-up">
          <h3 className="font-bold text-[#1a1a1a] flex items-center gap-2 mb-2">
            <MapPin size={16} className="text-[#6BA534]" /> Entrega
          </h3>
          <p className="text-sm text-[#666]">{order.delivery_address}</p>
          {order.notes && <p className="text-xs text-[#999] mt-1.5">Obs: {order.notes}</p>}
        </div>

        {/* Botão WhatsApp do estabelecimento */}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold rounded-2xl shadow-sm transition-colors animate-fade-in-up"
          >
            <MessageCircle size={18} />
            Falar com o estabelecimento
          </a>
        )}

        <Link to="/restaurantes"
          className="flex items-center justify-center gap-2 text-sm font-semibold text-[#2D5016] hover:underline py-2">
          <ArrowLeft size={15} /> Voltar aos estabelecimentos
        </Link>
      </main>
    </div>
  );
}
