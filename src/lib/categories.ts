import { UtensilsCrossed, ShoppingCart, Store, Pill, Pizza, Sandwich } from 'lucide-react';
import type { ComponentType } from 'react';

export type Category = 'restaurante' | 'mercado' | 'conveniencia' | 'farmacia' | 'pizzaria' | 'hamburgueria';

export const CATEGORIES: { id: Category; label: string; labelPlural: string; icon: ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'restaurante',   label: 'Restaurante',   labelPlural: 'Restaurantes',   icon: UtensilsCrossed },
  { id: 'pizzaria',      label: 'Pizzaria',      labelPlural: 'Pizzarias',      icon: Pizza },
  { id: 'hamburgueria',  label: 'Hamburgueria',  labelPlural: 'Hamburguerias', icon: Sandwich },
  { id: 'mercado',       label: 'Mercado',       labelPlural: 'Mercados',       icon: ShoppingCart },
  { id: 'conveniencia',  label: 'Conveniência',  labelPlural: 'Conveniência',   icon: Store },
  { id: 'farmacia',      label: 'Farmácia',      labelPlural: 'Farmácias',      icon: Pill },
];

export function getCategory(id: string) {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[0];
}
