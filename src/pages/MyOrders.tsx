import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Clock, Truck, CheckCircle } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../helpers/useAuth';
import { useOrders, type Order, type OrderStatus } from '../helpers/useOrders';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  preparing: { label: 'Preparando', color: 'bg-yellow-100 text-yellow-700', icon: <Clock size={14} /> },
  on_the_way: { label: 'A caminho', color: 'bg-blue-100 text-blue-700', icon: <Truck size={14} /> },
  delivered: { label: 'Entregue', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={14} /> },
};

function OrderCard({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const st = STATUS_CONFIG[order.status];

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${st.color}`}>
            {st.icon} {st.label}
          </span>
          <div className="text-left">
            <p className="text-sm font-bold text-[#1a1a1a]">Pedido #{order.id.toString().slice(-6)}</p>
            <p className="text-xs text-[#888]">{new Date(order.created_at).toLocaleDateString('pt-BR')} · R$ {order.total.toFixed(2).replace('.', ',')}</p>
          </div>
        </div>
        {open ? <ChevronUp size={18} className="text-[#aaa]" /> : <ChevronDown size={18} className="text-[#aaa]" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-[#555]">{item.quantity}× {item.dish_name}</span>
                <span className="font-medium text-[#333]">R$ {(item.unit_price * item.quantity).toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 text-sm text-[#666]">
            <p>📍 {order.delivery_address}</p>
            <p>📅 {new Date(order.delivery_date).toLocaleDateString('pt-BR')} às {order.delivery_time}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function MyOrders() {
  const { user, isLoading } = useAuth();
  const { getMyOrders } = useOrders(user?.id);

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const orders = getMyOrders().sort((a, b) => b.id - a.id);

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-[#1a1a1a] mb-2">Meus Pedidos</h1>
        <p className="text-[#888] mb-8">Acompanhe o status dos seus pedidos</p>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🛍️</p>
            <p className="text-[#888]">Você ainda não fez nenhum pedido.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(o => <OrderCard key={o.id} order={o} />)}
          </div>
        )}
      </div>
    </div>
  );
}
