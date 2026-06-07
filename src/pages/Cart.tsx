import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Minus, Plus, Trash2, ShoppingCart, ArrowLeft, Store,
  FileText, CreditCard, Smartphone, Landmark,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/Button';
import { useCart } from '../helpers/useCart';
import { useAuth } from '../helpers/useAuth';
import { createOrder } from '../helpers/useOrders';
import { supabase } from '../lib/supabase';

type PaymentMethod = 'pix' | 'credit_card' | 'debit_card';

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'pix',         label: 'PIX',              desc: 'Aprovação imediata',         icon: <Smartphone size={20} /> },
  { id: 'credit_card', label: 'Cartão de Crédito', desc: 'Até 12x sem juros',          icon: <CreditCard size={20} /> },
  { id: 'debit_card',  label: 'Cartão de Débito',  desc: 'Débito na hora',             icon: <Landmark size={20} /> },
];

function formatPrice(p: number) { return `R$ ${Number(p).toFixed(2).replace('.', ',')}`; }

export function Cart() {
  const { items, removeItem, updateQty, clearCart, totalPrice, totalItems, restaurantId } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState(user?.address ?? '');

  // Preenche automaticamente com o endereço cadastrado no perfil do cliente
  useEffect(() => {
    if (user?.address && !address) setAddress(user.address);
  }, [user]);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Faça login para finalizar o pedido'); navigate('/login'); return; }
    if (user.role === 'restaurant_owner') { toast.error('Contas de estabelecimento não podem fazer pedidos.'); return; }
    if (!address.trim()) { toast.error('Informe o endereço de entrega'); return; }
    if (!restaurantId) { toast.error('Restaurante não identificado'); return; }

    setLoading(true);
    try {
      // 1. Cria o pedido no banco
      const order = await createOrder({
        restaurantId,
        clientId: user.id,
        clientName: user.name,
        clientEmail: user.email,
        items: items.map(ci => ({
          id: ci.item.id,
          name: ci.item.name,
          category: ci.item.category,
          price: Number(ci.item.price),
          quantity: ci.quantity,
        })),
        total: totalPrice,
        deliveryAddress: address.trim(),
        notes: notes.trim(),
        paymentMethod,
      });

      // 2. Chama a Edge Function para criar pagamento no Mercado Pago
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          orderId: order.id,
          orderNumber: order.order_number,
          restaurantId: order.restaurant_id,
          items: order.items,
          total: totalPrice,
          paymentMethod,
          payerEmail: user.email,
          payerName: user.name,
        },
      });

      // Log detalhado para diagnóstico
      console.log('[create-payment] data:', JSON.stringify(data));
      console.log('[create-payment] error:', JSON.stringify(error));

      if (error) {
        toast.error(`Erro na função: ${error.message}`);
        setLoading(false);
        return;
      }

      if (!data?.checkoutUrl && !data?.sandboxUrl) {
        toast.error(`Erro do Mercado Pago: ${data?.error ?? 'Sem URL de checkout'} — ${data?.detail ?? ''}`);
        setLoading(false);
        return;
      }

      // 3. Limpa o carrinho
      clearCart();
      toast.success(`Pedido #${order.order_number} criado! Abrindo pagamento...`);

      // Abre o checkout do Mercado Pago em uma nova aba.
      // Importante: para métodos assíncronos (PIX, boleto) o MP NÃO redireciona
      // automaticamente de volta ao site após o pagamento — o cliente só vê a
      // confirmação dentro do próprio checkout. Por isso já levamos o cliente
      // para a tela de acompanhamento do pedido nesta aba, garantindo que ele
      // sempre veja o status do pedido independente do comportamento do MP.
      window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
      navigate(`/pedido/${order.id}`, { replace: true });

    } catch (err: any) {
      toast.error(err.message || 'Erro ao finalizar pedido');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role === 'restaurant_owner') {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <ShoppingCart size={64} className="text-gray-200" />
        <h2 className="text-2xl font-bold text-[#333]">Indisponível para estabelecimentos</h2>
        <p className="text-[#888]">Contas de estabelecimento não podem fazer pedidos nem pagamentos. Use uma conta de cliente para comprar.</p>
        <Link to="/restaurantes" className="mt-2 bg-[#2D5016] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#3d6b1e] transition-colors">
          Voltar
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex flex-col items-center justify-center gap-4 px-4">
        <ShoppingCart size={64} className="text-gray-200" />
        <h2 className="text-2xl font-bold text-[#333]">Seu carrinho está vazio</h2>
        <p className="text-[#888] text-center">Escolha um restaurante e adicione itens ao carrinho</p>
        <Link to="/restaurantes" className="mt-2 bg-[#2D5016] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#3d6b1e] transition-colors">
          Ver restaurantes
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-[#555] hover:text-[#1a1a1a]">
            <ArrowLeft size={22} />
          </button>
          <span className="font-bold text-[#1a1a1a] flex-1">
            Carrinho · {totalItems} {totalItems === 1 ? 'item' : 'itens'}
          </span>
          <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors">
            Limpar
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {restaurantId && (
          <Link to={`/restaurantes/${restaurantId}`}
            className="flex items-center gap-2 text-sm text-[#2D5016] font-semibold hover:underline">
            <Store size={15} /> Adicionar mais itens
          </Link>
        )}

        {/* Itens */}
        <div className="space-y-3">
          {items.map(({ item, quantity }) => (
            <div key={item.id} className="bg-white rounded-2xl p-4 flex gap-4 shadow-sm">
              {item.image_url && (
                <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-xl shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[#1a1a1a] truncate">{item.name}</h3>
                <p className="text-xs text-[#6BA534] font-medium mt-0.5">{item.category}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.id, quantity - 1)}
                      className="w-8 h-8 rounded-xl bg-[#e8f5e0] text-[#2D5016] flex items-center justify-center hover:bg-[#d0edc0] transition-colors">
                      <Minus size={14} />
                    </button>
                    <span className="font-black text-[#2D5016] w-5 text-center">{quantity}</span>
                    <button onClick={() => updateQty(item.id, quantity + 1)}
                      className="w-8 h-8 rounded-xl bg-[#2D5016] text-white flex items-center justify-center hover:bg-[#3d6b1e] transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#2D5016]">{formatPrice(Number(item.price) * quantity)}</span>
                    <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout */}
        <form onSubmit={handleCheckout} className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="font-black text-[#1a1a1a] text-lg flex items-center gap-2">
            <FileText size={18} className="text-[#6BA534]" /> Finalizar Pedido
          </h2>

          {/* Endereço */}
          <div>
            <label className="block text-sm font-semibold text-[#333] mb-1.5">Endereço de entrega *</label>
            <input value={address} onChange={e => setAddress(e.target.value)}
              placeholder="Rua, número, bairro" required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-semibold text-[#333] mb-1.5">Observações (opcional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Ex: sem cebola, ponto da carne..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all"
            />
          </div>

          {/* Forma de pagamento */}
          <div>
            <label className="block text-sm font-semibold text-[#333] mb-3">Forma de pagamento</label>
            <div className="space-y-2">
              {PAYMENT_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPaymentMethod(opt.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    paymentMethod === opt.id
                      ? 'border-[#2D5016] bg-[#e8f5e0]'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span className={paymentMethod === opt.id ? 'text-[#2D5016]' : 'text-[#aaa]'}>
                    {opt.icon}
                  </span>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${paymentMethod === opt.id ? 'text-[#2D5016]' : 'text-[#333]'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-[#888]">{opt.desc}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                    paymentMethod === opt.id ? 'border-[#2D5016] bg-[#2D5016]' : 'border-gray-300'
                  }`} />
                </button>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
            <span className="text-[#666] font-medium">Total</span>
            <span className="text-2xl font-black text-[#2D5016]">{formatPrice(totalPrice)}</span>
          </div>

          {!user && (
            <p className="text-xs text-orange-500 text-center">
              <Link to="/login" className="underline font-semibold">Entre</Link> para finalizar o pedido
            </p>
          )}

          <Button type="submit" fullWidth loading={loading} size="lg">
            {loading ? 'Processando...' : `Pagar ${formatPrice(totalPrice)}`}
          </Button>

          <p className="text-center text-xs text-[#aaa]">
            Você será redirecionado para o Mercado Pago para concluir o pagamento com segurança.
          </p>
        </form>
      </div>
    </div>
  );
}
