import { Link } from 'react-router-dom';
import { ArrowLeft, Leaf, Package, ChevronRight } from 'lucide-react';
import { useAuth } from '../helpers/useAuth';
import { useClientOrders, type OrderStatus } from '../helpers/useOrders';

const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'Aguardando pagamento',
  pending: 'Aguardando',
  preparing: 'Preparando',
  ready: 'Pronto / a caminho',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  awaiting_payment: 'bg-orange-50 text-orange-600',
  pending: 'bg-yellow-50 text-yellow-700',
  preparing: 'bg-blue-50 text-blue-700',
  ready: 'bg-[#e8f5e0] text-[#2D5016]',
  delivered: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-50 text-red-600',
};

function formatPrice(p: number) { return `R$ ${Number(p).toFixed(2).replace('.', ',')}`; }
function formatDate(d: string) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function ClientOrders() {
  const { user } = useAuth();
  const { orders, isLoading } = useClientOrders(user?.id ?? null);

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto safe-px py-4 flex items-center gap-3">
          <Link to="/restaurantes" className="text-[#555] hover:text-[#1a1a1a]">
            <ArrowLeft size={22} />
          </Link>
          <span className="font-bold text-[#1a1a1a] flex items-center gap-2">
            <Leaf size={18} className="text-[#6BA534]" /> Meus pedidos
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto safe-px py-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm h-24 flex items-center gap-4">
                <div className="skeleton h-12 w-12 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2"><div className="skeleton h-3 w-1/2 rounded" /><div className="skeleton h-3 w-3/4 rounded" /></div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-[#e8f5e0] flex items-center justify-center mx-auto mb-4">
              <Package size={32} className="text-[#6BA534]" />
            </div>
            <p className="text-[#888] text-lg font-semibold">Você ainda não fez pedidos</p>
            <Link to="/restaurantes" className="inline-block mt-4 text-sm font-semibold text-[#2D5016] hover:underline">
              Ver estabelecimentos
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order, idx) => (
              <Link
                key={order.id}
                to={order.status === 'awaiting_payment' ? `/pagamento-pendente/${order.id}` : `/pedido/${order.id}`}
                style={{ animationDelay: `${idx * 50}ms` }}
                className="block bg-white rounded-2xl shadow-sm card-hover animate-fade-in-up p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-[#1a1a1a]">Pedido #{order.order_number}</p>
                    <p className="text-xs text-[#999] mt-0.5">{formatDate(order.created_at)}</p>
                    <p className="text-xs text-[#888] mt-1 line-clamp-1">
                      {order.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                    <span className="font-black text-[#2D5016] text-sm">{formatPrice(order.total)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end mt-1 text-[#bbb]">
                  <ChevronRight size={16} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
