import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Promotion {
  id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  type: 'promo' | 'combo' | 'desconto';
  badge: string | null;
  original_price: number | null;
  promo_price: number | null;
  image_url: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  // joined
  restaurant_name?: string;
}

// Todas as promoções ativas (carrossel da home)
export function useActivePromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('promotions')
      .select('*, restaurants(name)')
      .eq('is_active', true)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .lte('starts_at', now)
      .order('created_at', { ascending: false })
      .limit(20);

    setPromotions(
      (data ?? []).map((p: any) => ({
        ...p,
        restaurant_name: p.restaurants?.name ?? '',
      }))
    );
    setIsLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { promotions, isLoading, refetch: fetch };
}

// Promoções do restaurante do dono logado
export function useMyPromotions(restaurantId: string | null) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!restaurantId) { setIsLoading(false); return; }
    setIsLoading(true);
    const { data } = await supabase
      .from('promotions')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    setPromotions(data ?? []);
    setIsLoading(false);
  }, [restaurantId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (values: Omit<Promotion, 'id' | 'created_at' | 'restaurant_name'>) => {
    const { data, error } = await supabase
      .from('promotions')
      .insert(values)
      .select()
      .single();
    if (error) throw new Error(error.message);
    setPromotions(ps => [data, ...ps]);
    return data;
  };

  const update = async (id: string, values: Partial<Promotion>) => {
    const { data, error } = await supabase
      .from('promotions')
      .update(values)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    setPromotions(ps => ps.map(p => p.id === id ? { ...p, ...data } : p));
    return data;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('promotions').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setPromotions(ps => ps.filter(p => p.id !== id));
  };

  const toggle = (id: string, is_active: boolean) => update(id, { is_active });

  return { promotions, isLoading, create, update, remove, toggle, refetch: fetch };
}
