import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

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
}

// Hook para o RESTAURANTE acompanhar seus pedidos (com realtime)
export function useRestaurantOrders(restaurantId: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!restaurantId) { setIsLoading(false); return; }
    setIsLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) ?? []);
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
          setOrders(prev => [payload.new as Order, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new as Order : o));
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
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);
    if (error) throw new Error(error.message);
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
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Order;
}

// Hook para o CLIENTE acompanhar um pedido específico em tempo real
export function useOrderTracking(orderId: string | null) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetch = useCallback(async () => {
    if (!orderId) { setIsLoading(false); return; }
    setIsLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();
    if (data) setOrder(data as Order);
    else setNotFound(true);
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
