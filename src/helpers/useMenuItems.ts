import { useState, useEffect, useCallback } from 'react';
import { supabase, type MenuItem } from '../lib/supabase';

export function useMenuItems(restaurantId: string | null) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!restaurantId) { setIsLoading(false); return; }
    setIsLoading(true);
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('category')
      .order('name');
    setItems(data ?? []);
    setIsLoading(false);
  }, [restaurantId]);

  useEffect(() => { fetch(); }, [fetch]);

  const createItem = async (values: Omit<MenuItem, 'id' | 'restaurant_id' | 'created_at'>) => {
    if (!restaurantId) throw new Error('Restaurante não encontrado');
    const { data, error } = await supabase
      .from('menu_items')
      .insert({ ...values, restaurant_id: restaurantId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    setItems(prev => [...prev, data].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)));
    return data;
  };

  const updateItem = async (id: string, values: Partial<MenuItem>) => {
    const { data, error } = await supabase
      .from('menu_items')
      .update(values)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    setItems(prev => prev.map(i => i.id === id ? data : i));
    return data;
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const toggleAvailable = (id: string, available: boolean) => updateItem(id, { available });

  return { items, isLoading, createItem, updateItem, deleteItem, toggleAvailable, refetch: fetch };
}
