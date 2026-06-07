import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Leaf, ShoppingCart } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { DishCard } from '../components/DishCard';
import { useDishes } from '../helpers/useDishes';
import { CATEGORY_LABELS, type DishCategory } from '../data/dishes';
import { useCart } from '../helpers/useCart';

type Filter = 'all' | DishCategory;

export function Home() {
  const { dishes } = useDishes();
  const { totalItems } = useCart();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = filter === 'all' ? dishes.filter(d => d.available) : dishes.filter(d => d.category === filter && d.available);
  const categories: Filter[] = ['all', 'breakfast', 'lunch', 'dinner', 'snack'];

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#2D5016] to-[#4A7C2F] text-white py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4 opacity-80">
            <Leaf size={20} />
            <span className="text-sm font-medium uppercase tracking-widest">Alimentação Saudável</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
            Coma <span className="text-[#a8d45f]">Bem,</span><br />
            Viva Melhor
          </h1>
          <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto">
            Refeições balanceadas, frescas e deliciosas entregues na sua porta.
            Cuide do corpo sem abrir mão do prazer de comer bem.
          </p>
          <a
            href="#cardapio"
            className="inline-flex items-center gap-2 bg-white text-[#2D5016] font-bold px-8 py-4 rounded-2xl hover:bg-[#e8f5e0] transition-colors text-base"
          >
            Ver Cardápio <ChevronDown size={18} />
          </a>
        </div>
      </section>

      {/* Menu */}
      <section id="cardapio" className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-black text-[#1a1a1a] text-center mb-3">Nosso Cardápio</h2>
        <p className="text-center text-[#777] mb-10">Escolha suas refeições e monte o cardápio perfeito</p>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap justify-center mb-10">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-150 ${
                filter === cat
                  ? 'bg-[#2D5016] text-white shadow-md scale-105'
                  : 'bg-white text-[#555] hover:bg-[#e8f5e0] hover:text-[#2D5016] border border-gray-200'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(dish => <DishCard key={dish.id} dish={dish} />)}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-[#999] py-16">Nenhum prato disponível nesta categoria.</p>
        )}
      </section>

      {/* Floating cart */}
      {totalItems > 0 && (
        <Link
          to="/cart"
          className="fixed bottom-6 right-6 bg-[#2D5016] text-white flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl hover:bg-[#3d6b1e] transition-all duration-200 hover:scale-105"
        >
          <ShoppingCart size={20} />
          <span className="font-bold">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
        </Link>
      )}

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-[#999] border-t border-gray-200">
        © 2024 Cardápio Fitness · Alimentação saudável na sua porta
      </footer>
    </div>
  );
}
