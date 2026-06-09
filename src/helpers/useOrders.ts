import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export type OrderStatus = 'awaiting_payment' | 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  order_number: number;
  restaurant_id: string;
  client_id: string | null;
  client_name: string;
  client_email: string;
  items: OrderItem[];
  total: number;
  delivery_address: string;
  status: OrderStatus;
  notes: string;
  created_at: string;
  // campos extras do join (só em useOrderTracking)
  restaurant_name?: string;
  restaurant_phone?: string;
}

// Hook para o RESTAURANTE acompanhar seus pedidos (com realtime)
export function useRestaurantOrders(restaurantId: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadedOnce = useRef(false);

  const fetch = useCallback(async () => {
    if (!restaurantId) { setIsLoading(false); return; }
    // Só mostra o estado de carregamento na primeira busca — atualizações
    // em segundo plano (polling/realtime) não devem "piscar" a tela
    if (!loadedOnce.current) setIsLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      // Pedidos com pagamento ainda não confirmado não são exibidos ao estabelecimento
      .neq('status', 'awaiting_payment')
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) ?? []);
    loadedOnce.current = true;
    setIsLoading(false);
  }, [restaurantId]);

  useEffect(() => { fetch(); }, [fetch]);

  // Realtime: atualiza automaticamente quando chegar novo pedido
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`orders-restaurant-${restaurantId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newOrder = payload.new as Order;
          // Só exibe ao estabelecimento se o pagamento já foi confirmado
          if (newOrder.status !== 'awaiting_payment') {
            setOrders(prev => [newOrder, ...prev]);
          }
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Order;
          setOrders(prev => {
            const exists = prev.some(o => o.id === updated.id);
            if (updated.status === 'awaiting_payment') {
              // Continua oculto enquanto aguarda pagamento
              return prev.filter(o => o.id !== updated.id);
            }
            if (exists) return prev.map(o => o.id === updated.id ? updated : o);
            // Pedido acabou de ter o pagamento confirmado: passa a aparecer
            return [updated, ...prev];
          });
        } else if (payload.eventType === 'DELETE') {
          setOrders(prev => prev.filter(o => o.id !== (payload.old as Order).id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [restaurantId]);

  // Polling de segurança: garante que novos pedidos sempre apareçam,
  // mesmo se a conexão realtime cair (comum em PWA/mobile em segundo plano)
  useEffect(() => {
    if (!restaurantId) return;
    const interval = setInterval(() => { fetch(); }, 15000);
    return () => clearInterval(interval);
  }, [restaurantId, fetch]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    // Atualização otimista: muda o status na tela imediatamente,
    // sem esperar o roundtrip do servidor/realtime/polling
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);
    if (error) {
      // Reverte em caso de falha
      await fetch();
      throw new Error(error.message);
    }
  };

  const activeOrders = orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));
  const historyOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  return { orders, activeOrders, historyOrders, isLoading, updateStatus, refetch: fetch };
}

// Função para criar pedido (usada no Cart)
export async function createOrder(payload: {
  restaurantId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  items: OrderItem[];
  total: number;
  deliveryAddress: string;
  notes?: string;
  paymentMethod?: string;
}): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      restaurant_id: payload.restaurantId,
      client_id: payload.clientId,
      client_name: payload.clientName,
      client_email: payload.clientEmail,
      items: payload.items,
      total: payload.total,
      delivery_address: payload.deliveryAddress,
      notes: payload.notes ?? '',
      payment_method: payload.paymentMethod ?? 'pix',
      // O pedido só é enviado ao estabelecimento após a confirmação do pagamento
      // (o webhook do Mercado Pago muda para 'pending' quando aprovado)
      status: 'awaiting_payment',
      payment_status: 'pending',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Order;
}

// Hook para o CLIENTE ver seu histórico de pedidos
export function useClientOrders(clientId: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadedOnce = useRef(false);

  const fetch = useCallback(async () => {
    if (!clientId) { setIsLoading(false); return; }
    if (!loadedOnce.current) setIsLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) ?? []);
    loadedOnce.current = true;
    setIsLoading(false);
  }, [clientId]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel(`orders-client-${clientId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `client_id=eq.${clientId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setOrders(prev => [payload.new as Order, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new as Order : o));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;
    const interval = setInterval(() => { fetch(); }, 15000);
    return () => clearInterval(interval);
  }, [clientId, fetch]);

  return { orders, isLoading, refetch: fetch };
}

// Hook para o CLIENTE acompanhar um pedido específico em tempo real
export function useOrderTracking(orderId: string | null) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const loadedOnce = useRef(false);

  const fetch = useCallback(async () => {
    if (!orderId) { setIsLoading(false); return; }
    if (!loadedOnce.current) setIsLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, restaurants(name, phone)')
      .eq('id', orderId)
      .maybeSingle();
    if (data) {
      const { restaurants: rest, ...order } = data as any;
      setOrder({ ...order, restaurant_name: rest?.name, restaurant_phone: rest?.phone } as Order);
    } else setNotFound(true);
    loadedOnce.current = true;
    setIsLoading(false);
  }, [orderId]);

  useEffect(() => { fetch(); }, [fetch]);

  // Realtime: atualiza assim que o restaurante mudar o status
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`order-tracking-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      }, (payload) => {
        setOrder(payload.new as Order);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  // Polling de segurança a cada 10s (garante atualização mesmo sem realtime)
  useEffect(() => {
    if (!orderId) return;
    const interval = setInterval(() => { fetch(); }, 10000);
    return () => clearInterval(interval);
  }, [orderId, fetch]);

  return { order, isLoading, notFound, refetch: fetch };
}
