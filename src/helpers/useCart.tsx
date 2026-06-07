import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { MenuItem } from '../lib/supabase';

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  restaurantId: string | null;
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: string) => void;
  updateQty: (itemId: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | null>(null);
const CART_KEY = 'cf_cart_v2';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const restaurantId = items.length > 0 ? items[0].item.restaurant_id : null;

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: MenuItem) => {
    setItems(prev => {
      // Se for de outro restaurante, limpa o carrinho
      if (prev.length > 0 && prev[0].item.restaurant_id !== item.restaurant_id) {
        return [{ item, quantity: 1 }];
      }
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeItem = (itemId: string) => setItems(prev => prev.filter(i => i.item.id !== itemId));

  const updateQty = (itemId: string, qty: number) => {
    if (qty <= 0) return removeItem(itemId);
    setItems(prev => prev.map(i => i.item.id === itemId ? { ...i, quantity: qty } : i));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + Number(i.item.price) * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, restaurantId, addItem, removeItem, updateQty, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
