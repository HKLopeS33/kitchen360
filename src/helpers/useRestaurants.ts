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
