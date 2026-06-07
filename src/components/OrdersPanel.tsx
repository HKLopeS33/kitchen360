import { useState } from 'react';
import { Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Package, History } from 'lucide-react';
import { toast } from 'sonner';
import { useRestaurantOrders, type Order, type OrderStatus } from '../helpers/useOrders';

const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'Aguardando pagamento',
  pending:   'Aguardando',
  preparing: 'Preparando',
  ready:     'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  awaiting_payment: 'bg-orange-50 text-orange-600 border-orange-200',
  pending:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  preparing: 'bg-blue-50 text-blue-700 border-blue-200',
  ready:     'bg-[#e8f5e0] text-[#2D5016] border-[#b5dcaa]',
  delivered: 'bg-gray-50 text-gray-500 border-gray-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending:   'preparing',
  preparing: 'ready',
  ready:     'delivered',
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending:   'Iniciar preparo',
  preparing: 'Marcar como pronto',
  ready:     'Confirmar entrega',
};

function formatPrice(p: number) { return `R$ ${Number(p).toFixed(2).replace('.', ',')}`; }
function formatDate(d: string) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function OrderCard({ order, onUpdateStatus }: { order: Order; onUpdateStatus: (id: string, s: OrderStatus) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  const next = NEXT_STATUS[order.status];

  async function handleAdvance() {
    if (!next) return;
    setUpdating(true);
    try {
      await onUpdateStatus(order.id, next);
      toast.success(`Pedido #${order.order_number} → ${STATUS_LABELS[next]}`);
    } catch { toast.error('Erro ao atualizar status'); }
    finally { setUpdating(false); }
  }

  async function handleCancel() {
    if (!confirm(`Cancelar pedido #${order.order_number}?`)) return;
    setUpdating(true);
    try {
      await onUpdateStatus(order.id, 'cancelled');
      toast.success(`Pedido #${order.order_number} cancelado.`);
    } catch { toast.error('Erro ao cancelar pedido'); }
    finally { setUpdating(false); }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden card-hover animate-fade-in-up">
      {/* Header do card */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-black text-[#2D5016] text-lg shrink-0">#{order.order_number}</span>
          <div className="min-w-0 text-left">
            <p className="font-semibold text-sm text-[#1a1a1a] truncate">{order.client_name}</p>
            <p className="text-xs text-[#aaa]">{formatDate(order.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${STATUS_COLORS[order.status]}`}>
            {STATUS_LABELS[order.status]}
          </span>
          <span className="font-bold text-sm text-[#2D5016]">{formatPrice(order.total)}</span>
          {expanded ? <ChevronUp size={16} className="text-[#aaa]" /> : <ChevronDown size={16} className="text-[#aaa]" />}
        </div>
      </button>

      {/* Detalhes expandíveis */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Itens */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#aaa] mb-2">Itens do pedido</p>
            <div className="space-y-1.5">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-[#444]">
                    <span className="font-bold text-[#2D5016]">{item.quantity}×</span> {item.name}
                  </span>
                  <span className="text-[#666]">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between font-bold text-sm">
              <span>Total</span>
              <span className="text-[#2D5016]">{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* Entrega */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#aaa] mb-1">Entrega</p>
            <p className="text-sm text-[#555]">{order.delivery_address}</p>
            {order.notes && (
              <p className="text-xs text-[#888] mt-1 italic">Obs: {order.notes}</p>
            )}
          </div>

          {/* Cliente */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#aaa] mb-1">Cliente</p>
            <p className="text-sm text-[#555]">{order.client_name}</p>
            <p className="text-xs text-[#aaa]">{order.client_email}</p>
          </div>

          {/* Ações */}
          {(next || order.status === 'pending' || order.status === 'preparing') && (
            <div className="flex gap-2 pt-1">
              {next && (
                <button
                  onClick={handleAdvance}
                  disabled={updating}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-b from-[#356019] to-[#2D5016] text-white text-sm font-semibold py-2.5 rounded-xl shadow-[0_2px_10px_rgba(45,80,22,0.25)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  {NEXT_LABEL[order.status]}
                </button>
              )}
              {['pending', 'preparing'].includes(order.status) && (
                <button
                  onClick={handleCancel}
                  disabled={updating}
                  className="flex items-center justify-center gap-1.5 border-2 border-red-200 text-red-500 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <XCircle size={16} /> Cancelar
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface OrdersPanelProps {
  restaurantId: string;
}

export function OrdersPanel({ restaurantId }: OrdersPanelProps) {
  const { activeOrders, historyOrders, isLoading, updateStatus } = useRestaurantOrders(restaurantId);
  const [tab, setTab] = useState<'active' | 'history'>('active');

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mt-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bold text-[#1a1a1a] flex items-center gap-2">
          <Package size={18} className="text-[#6BA534]" /> Pedidos
        </h2>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab('active')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'active' ? 'bg-white text-[#2D5016] shadow-sm' : 'text-[#777] hover:text-[#333]'
            }`}
          >
            <Clock size={13} />
            Ativos
            {activeOrders.length > 0 && (
              <span className="bg-[#2D5016] text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-black">
                {activeOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'history' ? 'bg-white text-[#2D5016] shadow-sm' : 'text-[#777] hover:text-[#333]'
            }`}
          >
            <History size={13} />
            Histórico
            {historyOrders.length > 0 && (
              <span className="text-[#aaa] text-[10px]">({historyOrders.length})</span>
            )}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="skeleton h-16" />)}
        </div>
      ) : tab === 'active' ? (
        activeOrders.length === 0 ? (
          <div className="text-center py-10 text-[#bbb]">
            <Clock size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum pedido ativo no momento</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeOrders.map(order => (
              <OrderCard key={order.id} order={order} onUpdateStatus={updateStatus} />
            ))}
          </div>
        )
      ) : (
        historyOrders.length === 0 ? (
          <div className="text-center py-10 text-[#bbb]">
            <History size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum pedido no histórico ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {historyOrders.map(order => (
              <OrderCard key={order.id} order={order} onUpdateStatus={updateStatus} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
