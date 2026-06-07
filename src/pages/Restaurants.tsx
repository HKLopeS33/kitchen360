import { MapPin, Clock, Phone, Search, UtensilsCrossed, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useRestaurants } from '../helpers/useRestaurants';
import { useAuth } from '../helpers/useAuth';
import { useCart } from '../helpers/useCart';

function formatTime(time: string) {
  return time?.slice(0, 5) ?? '--:--';
}

export function Restaurants() {
  const { restaurants, isLoading } = useRestaurants();
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const [search, setSearch] = useState('');

  const filtered = restaurants.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-[#2D5016] font-bold text-lg">
            <Leaf size={22} className="text-[#6BA534]" /> Cardápio Fitness
          </Link>
          <div className="flex items-center gap-3">
            {/* Carrinho com badge */}
            {totalItems > 0 && (
              <Link to="/cart" className="relative flex items-center gap-1.5 bg-[#2D5016] text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-[#3d6b1e] transition-colors">
                <ShoppingCart size={16} />
                <span>{totalItems}</span>
              </Link>
            )}

            {user ? (
              <>
                {user.role === 'restaurant_owner' && (
                  <Link to="/meu-restaurante" className="flex items-center gap-1.5 text-sm font-semibold text-[#2D5016] hover:underline">
                    <UtensilsCrossed size={15} /> Meu restaurante
                  </Link>
                )}
                <button onClick={logout} className="text-sm text-[#777] hover:text-[#333] transition-colors">
                  Sair
                </button>
              </>
            ) : (
              <Link to="/login" className="text-sm font-semibold text-[#2D5016] hover:underline">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-[#1a1a1a]">Restaurantes</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin size={15} className="text-[#6BA534]" />
            <p className="text-sm text-[#6BA534] font-medium">Floresta - PE</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#aaa]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar restaurante..."
            className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
                <div className="h-5 bg-gray-100 rounded w-2/3 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-full mb-2" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#aaa] text-lg">Nenhum restaurante encontrado</p>
            <p className="text-sm text-[#bbb] mt-1">
              {search ? 'Tente outra busca' : 'Ainda não há restaurantes cadastrados em Floresta - PE'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(restaurant => (
              <Link
                key={restaurant.id}
                to={`/restaurantes/${restaurant.id}`}
                className="block bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Logo quadrada */}
                  {restaurant.image_url ? (
                    <img
                      src={restaurant.image_url}
                      alt={restaurant.name}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-100"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[#e8f5e0] flex items-center justify-center shrink-0">
                      <UtensilsCrossed size={28} className="text-[#6BA534]" />
                    </div>
                  )}

                  {/* Informações */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h2 className="text-base font-bold text-[#1a1a1a] truncate">{restaurant.name}</h2>
                      <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        restaurant.is_open_today
                          ? 'bg-[#e8f5e0] text-[#2D5016]'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {restaurant.is_open_today ? 'Aberto' : 'Fechado'}
                      </span>
                    </div>

                    {restaurant.description && (
                      <p className="text-xs text-[#888] mb-2 line-clamp-1">{restaurant.description}</p>
                    )}

                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1 text-xs text-[#999]">
                        <Clock size={11} className="text-[#6BA534]" />
                        {formatTime(restaurant.open_time)} – {formatTime(restaurant.close_time)}
                      </span>
                      {restaurant.address && (
                        <span className="flex items-center gap-1 text-xs text-[#999] truncate max-w-[160px]">
                          <MapPin size={11} className="text-[#6BA534] shrink-0" />
                          {restaurant.address}
                        </span>
                      )}
                      {restaurant.phone && (
                        <span className="flex items-center gap-1 text-xs text-[#999]">
                          <Phone size={11} className="text-[#6BA534]" />
                          {restaurant.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
