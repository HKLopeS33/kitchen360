import { useState, useEffect, useCallback } from 'react';
import { supabase, type Restaurant } from '../lib/supabase';

export function useRestaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRestaurants = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('city', 'Floresta')
      .eq('state', 'PE')
      .order('name');
    setRestaurants(data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  return { restaurants, isLoading, refetch: fetchRestaurants };
}

export function useMyRestaurant(ownerId: string | null) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!ownerId) { setIsLoading(false); return; }
    setIsLoading(true);
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle();
    setRestaurant(data ?? null);
    setIsLoading(false);
  }, [ownerId]);

  useEffect(() => { fetch(); }, [fetch]);

  const createRestaurant = async (values: Omit<Restaurant, 'id' | 'owner_id' | 'created_at' | 'city' | 'state'>) => {
    if (!ownerId) throw new Error('Usuário não autenticado');
    const { data, error } = await supabase
      .from('restaurants')
      .insert({ ...values, owner_id: ownerId, city: 'Floresta', state: 'PE' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    setRestaurant(data);
    return data;
  };

  const updateRestaurant = async (values: Partial<Restaurant>) => {
    if (!restaurant) throw new Error('Restaurante não encontrado');
    const { data, error } = await supabase
      .from('restaurants')
      .update(values)
      .eq('id', restaurant.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    setRestaurant(data);
    return data;
  };

  const toggleOpenToday = async (isOpen: boolean) => {
    return updateRestaurant({ is_open_today: isOpen });
  };

  return { restaurant, isLoading, createRestaurant, updateRestaurant, toggleOpenToday, refetch: fetch };
}

// ---------------------------------------------------------------------
// Hooks de administração (perfil "admin"/superusuário): listar todos os
// restaurantes como assinantes, gerenciar status da assinatura e o valor
// global da mensalidade cobrada de todos.
// ---------------------------------------------------------------------

export function useAdminSubscriptions() {
  const [restaurants, setRestaurants] = useState<(Restaurant & { owner_email?: string; owner_name?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    const { data: rests } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });

    const ownerIds = Array.from(new Set((rests ?? []).map(r => r.owner_id)));
    let profilesMap: Record<string, { name: string; email: string }> = {};
    if (ownerIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', ownerIds);
      profilesMap = Object.fromEntries((profiles ?? []).map(p => [p.id, { name: p.name, email: p.email }]));
    }

    setRestaurants((rests ?? []).map(r => ({
      ...r,
      owner_name: profilesMap[r.owner_id]?.name,
      owner_email: profilesMap[r.owner_id]?.email,
    })));
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateSubscription = async (
    restaurantId: string,
    values: Partial<Pick<Restaurant, 'subscription_status' | 'subscription_active_until' | 'trial_ends_at'>>
  ) => {
    const { data, error } = await supabase
      .from('restaurants')
      .update(values)
      .eq('id', restaurantId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    setRestaurants(rs => rs.map(r => r.id === restaurantId ? { ...r, ...data } : r));
    return data;
  };

  /** Marca como pago: define active + estende o acesso por 30 dias a partir de hoje (ou da data de expiração atual, se ainda no futuro). */
  const registerPayment = async (restaurant: Restaurant) => {
    const base = restaurant.subscription_active_until && new Date(restaurant.subscription_active_until) > new Date()
      ? new Date(restaurant.subscription_active_until)
      : new Date();
    base.setDate(base.getDate() + 30);
    return updateSubscription(restaurant.id, {
      subscription_status: 'active',
      subscription_active_until: base.toISOString(),
    });
  };

  const suspend = (restaurantId: string) => updateSubscription(restaurantId, { subscription_status: 'suspended' });
  const reactivate = (restaurantId: string) => updateSubscription(restaurantId, { subscription_status: 'active' });

  return { restaurants, isLoading, refetch: fetchAll, registerPayment, suspend, reactivate, updateSubscription };
}

export function useMonthlyFee() {
  const [fee, setFee] = useState<number>(49.9);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFee = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'monthly_fee').maybeSingle();
    if (data?.value) setFee(Number(data.value));
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchFee(); }, [fetchFee]);

  const updateFee = async (value: number) => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'monthly_fee', value: String(value), updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    setFee(value);
  };

  return { fee, isLoading, updateFee, refetch: fetchFee };
}
