import { Plus, Minus, Flame, Dumbbell } from 'lucide-react';
import { type Dish, CATEGORY_LABELS } from '../data/dishes';
import { useCart } from '../helpers/useCart';

interface DishCardProps {
  dish: Dish;
}

export function DishCard({ dish }: DishCardProps) {
  const { items, addItem, updateQty } = useCart();
  const cartItem = items.find(i => i.dish.id === dish.id);
  const qty = cartItem?.quantity ?? 0;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
      <div className="relative">
        <img src={dish.image_url} alt={dish.name} className="w-full h-48 object-cover" />
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[#2D5016] text-xs font-semibold px-2.5 py-1 rounded-full">
          {CATEGORY_LABELS[dish.category]}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-[#1a1a1a] text-base mb-1">{dish.name}</h3>
        <p className="text-sm text-[#666] mb-3 flex-1">{dish.description}</p>

        <div className="flex gap-3 mb-4">
          <span className="flex items-center gap-1 text-xs text-[#888]">
            <Flame size={13} className="text-orange-400" /> {dish.calories} kcal
          </span>
          <span className="flex items-center gap-1 text-xs text-[#888]">
            <Dumbbell size={13} className="text-[#6BA534]" /> {dish.protein}g prot.
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-bold text-[#2D5016] text-lg">
            R$ {dish.price.toFixed(2).replace('.', ',')}
          </span>

          {qty === 0 ? (
            <button
              onClick={() => addItem(dish)}
              className="bg-[#2D5016] text-white w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#3d6b1e] transition-colors"
            >
              <Plus size={18} />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQty(dish.id, qty - 1)}
                className="bg-[#e8f5e0] text-[#2D5016] w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#d0edc0] transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="font-bold text-[#2D5016] w-5 text-center">{qty}</span>
              <button
                onClick={() => addItem(dish)}
                className="bg-[#2D5016] text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#3d6b1e] transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
