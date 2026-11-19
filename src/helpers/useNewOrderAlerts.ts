import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Order } from './useOrders';
import { loadAlertPrefs, playOrderChime, saveAlertPrefs, type AlertPrefs } from './orderAlerts';

export type NewOrderAlert = Pick<Order, 'id' | 'order_number' | 'client_name' | 'total'>;

const RING_EVERY_MS = 6000;
const RING_FOR_MS = 3 * 60 * 1000;


/**
 * Avisa o estabelecimento quando chega um pedido pago (status "pending"):
 * toca a campainha até alguém ver, pisca o título da aba e mostra a
 * notificação do sistema. Funciona em qualquer aba do painel.
 */
export function useNewOrderAlerts(restaurantId: string | null) {
  const [alerts, setAlerts] = useState<NewOrderAlert[]>([]);
  const [prefs, setPrefsState] = useState<AlertPrefs>(loadAlertPrefs);
  const seen = useRef<Set<string> | null>(null); // null = ainda não carregou a base
  const ringStart = useRef(0);

  const setPrefs = useCallback((p: AlertPrefs) => { setPrefsState(p); saveAlertPrefs(p); }, []);

  const push = useCallback((o: NewOrderAlert) => {
    if (!seen.current || seen.current.has(o.id)) return;
    seen.current.add(o.id);
    ringStart.current = Date.now();
    setAlerts(prev => [o, ...prev]);
    // A notificação do sistema vem pelo push (inclusive com o app fechado).
  }, []);

  // Pedido saiu de "aguardando aceite" (aceito/cancelado): para de avisar.
  const drop = useCallback((id: string) => setAlerts(prev => prev.filter(a => a.id !== id)), []);

  const check = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from('orders')
      .select('id, order_number, client_name, total')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'pending');
    const rows = (data ?? []) as NewOrderAlert[];
    if (!seen.current) {
      // Primeira carga: o que já estava pendente não toca a campainha.
      seen.current = new Set(rows.map(r => r.id));
      return;
    }
    rows.forEach(push);
    const pendingIds = new Set(rows.map(r => r.id));
    setAlerts(prev => prev.filter(a => pendingIds.has(a.id)));
  }, [restaurantId, push]);

  useEffect(() => {
    seen.current = null;
    setAlerts([]);
    void check();
  }, [check]);

  // Tempo real + checagem periódica (se a conexão cair, nada se perde).
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`order-alerts-${restaurantId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}`,
      }, (payload) => {
        const o = payload.new as Order | undefined;
        if (!o?.id) return;
        if (o.status === 'pending') push(o);
        else drop(o.id);
      })
      .subscribe();
    const interval = setInterval(() => { void check(); }, 20000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [restaurantId, push, drop, check]);

  // Campainha repetida enquanto houver pedido não visto.
  const hasAlerts = alerts.length > 0;
  useEffect(() => {
    if (!hasAlerts || !prefs.sound) return;
    playOrderChime();
    const interval = setInterval(() => {
      if (Date.now() - ringStart.current > RING_FOR_MS) { clearInterval(interval); return; }
      playOrderChime();
    }, RING_EVERY_MS);
    return () => clearInterval(interval);
  }, [hasAlerts, prefs.sound]);

  // Título da aba piscando.
  useEffect(() => {
    if (!hasAlerts) return;
    const original = document.title;
    let on = false;
    const label = alerts.length === 1 ? '🔔 Novo pedido!' : `🔔 ${alerts.length} novos pedidos!`;
    const interval = setInterval(() => { on = !on; document.title = on ? label : original; }, 1000);
    return () => { clearInterval(interval); document.title = original; };
  }, [hasAlerts, alerts.length]);

  const acknowledge = useCallback(() => setAlerts([]), []);

  return { alerts, acknowledge, prefs, setPrefs };
}
