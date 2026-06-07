import { UtensilsCrossed, ShoppingCart, Store, Pill } from 'lucide-react';
import type { ComponentType } from 'react';

export type Category = 'restaurante' | 'mercado' | 'conveniencia' | 'farmacia';

export const CATEGORIES: { id: Category; label: string; labelPlural: string; icon: ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'restaurante',  label: 'Restaurante',  labelPlural: 'Restaurantes',  icon: UtensilsCrossed },
  { id: 'mercado',      label: 'Mercado',      labelPlural: 'Mercados',      icon: ShoppingCart },
  { id: 'conveniencia', label: 'Conveniência', labelPlural: 'Conveniência',  icon: Store },
  { id: 'farmacia',     label: 'Farmácia',     labelPlural: 'Farmácias',     icon: Pill },
];

export function getCategory(id: string) {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[0];
}
