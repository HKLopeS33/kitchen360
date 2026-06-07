export type DishCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Dish {
  id: number;
  name: string;
  description: string;
  category: DishCategory;
  image_url: string;
  price: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  available: boolean;
}

export const DISHES: Dish[] = [
  {
    id: 1, name: 'Bowl de Açaí Proteico',
    description: 'Açaí com whey protein, banana, granola e mel',
    category: 'breakfast',
    image_url: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600',
    price: 24.90, calories: 380, protein: 25, carbs: 48, fat: 8, available: true,
  },
  {
    id: 2, name: 'Omelete Fitness',
    description: 'Omelete com claras, espinafre, tomate e queijo cottage',
    category: 'breakfast',
    image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600',
    price: 18.90, calories: 220, protein: 28, carbs: 5, fat: 10, available: true,
  },
  {
    id: 3, name: 'Frango Grelhado com Batata Doce',
    description: 'Peito de frango grelhado com batata doce e brócolis',
    category: 'lunch',
    image_url: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600',
    price: 32.90, calories: 450, protein: 42, carbs: 38, fat: 12, available: true,
  },
  {
    id: 4, name: 'Salmão com Quinoa',
    description: 'Filé de salmão grelhado com quinoa e legumes salteados',
    category: 'lunch',
    image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600',
    price: 42.90, calories: 520, protein: 38, carbs: 35, fat: 22, available: true,
  },
  {
    id: 5, name: 'Wrap de Frango Integral',
    description: 'Wrap integral com frango desfiado, alface e molho de iogurte',
    category: 'dinner',
    image_url: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600',
    price: 26.90, calories: 380, protein: 32, carbs: 30, fat: 14, available: true,
  },
  {
    id: 6, name: 'Strogonoff Fit',
    description: 'Strogonoff de frango com creme de leite light e arroz integral',
    category: 'dinner',
    image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600',
    price: 34.90, calories: 420, protein: 35, carbs: 40, fat: 10, available: true,
  },
  {
    id: 7, name: 'Barra de Proteína Caseira',
    description: 'Barra com aveia, whey, pasta de amendoim e chocolate amargo',
    category: 'snack',
    image_url: 'https://images.unsplash.com/photo-1622484212850-eb596d769edc?w=600',
    price: 12.90, calories: 180, protein: 15, carbs: 20, fat: 6, available: true,
  },
  {
    id: 8, name: 'Smoothie Verde Detox',
    description: 'Smoothie de couve, gengibre, abacaxi e hortelã',
    category: 'snack',
    image_url: 'https://images.unsplash.com/photo-1638176066666-ffb2f013c7dd?w=600',
    price: 14.90, calories: 120, protein: 3, carbs: 28, fat: 1, available: true,
  },
];

export const CATEGORY_LABELS: Record<DishCategory | 'all', string> = {
  all: 'Todos',
  breakfast: 'Café da Manhã',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanche',
};
