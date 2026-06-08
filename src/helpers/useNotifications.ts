import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface AppNotification {
  id: string;
  user_id: string;
  type: 'new_order' | 'order_status' | 'promotion' | 'system';
  title: string;
  body: string | null;
  data: Record<string, any> | null;
  read: boolean;
  created_at: string;
}

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error) setNotifications(data ?? []);
    } catch {
      // tabela pode não existir ainda — não quebra o componente
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  // Realtime: ouve novas notificações chegando
  useEffect(() => {
    if (!userId) return;
    try {
      const channel = supabase
        .channel(`notifications-${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        }, (payload) => {
          setNotifications(prev => [payload.new as AppNotification, ...prev]);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    } catch {
      // silencia erro de realtime
    }
  }, [userId]);

  const markRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
      setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
    } catch { /* silencia */ }
  };

  const markAllRead = async () => {
    if (!userId) return;
    try {
      await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
      setNotifications(ns => ns.map(n => ({ ...n, read: true })));
    } catch { /* silencia */ }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, isLoading, unreadCount, markRead, markAllRead, refetch: fetch };
}
