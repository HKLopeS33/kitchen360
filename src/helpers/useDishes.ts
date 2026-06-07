import { useState } from 'react';
import { type Dish, DISHES } from '../data/dishes';

const DISHES_KEY = 'cf_dishes';

function getStoredDishes(): Dish[] {
  try {
    const raw = localStorage.getItem(DISHES_KEY);
    return raw ? JSON.parse(raw) : DISHES;
  } catch { return DISHES; }
}

function saveStoredDishes(dishes: Dish[]) {
  localStorage.setItem(DISHES_KEY, JSON.stringify(dishes));
}

export function useDishes() {
  const [dishes, setDishes] = useState<Dish[]>(getStoredDishes);

  const refresh = () => setDishes(getStoredDishes());

  const createDish = (dish: Omit<Dish, 'id'>) => {
    const all = getStoredDishes();
    const newDish = { ...dish, id: Date.now() };
    const updated = [...all, newDish];
    saveStoredDishes(updated);
    setDishes(updated);
    return newDish;
  };

  const updateDish = (id: number, data: Partial<Dish>) => {
    const all = getStoredDishes();
    const updated = all.map(d => d.id === id ? { ...d, ...data } : d);
    saveStoredDishes(updated);
    setDishes(updated);
  };

  const deleteDish = (id: number) => {
    const all = getStoredDishes();
    const updated = all.filter(d => d.id !== id);
    saveStoredDishes(updated);
    setDishes(updated);
  };

  return { dishes, refresh, createDish, updateDish, deleteDish };
}
