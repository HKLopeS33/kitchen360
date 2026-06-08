import { MapPin, Clock, Phone, Search, UtensilsCrossed, ShoppingCart, ChevronDown, Package, User, LogOut, Store } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useRestaurants } from '../helpers/useRestaurants';
import { useAuth } from '../helpers/useAuth';
import { useCart } from '../helpers/useCart';
import { CATEGORIES, getCategory, type Category } from '../lib/categories';
import logo from '../assets/logo-icon.png';
import { Footer } from '../components/Footer';

function formatTime(time: string) {
  return time?.slice(0, 5) ?? '--:--';
}

export function Restaurants() {
  const { restaurants, isLoading } = useRestaurants();
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | 'todos'>('todos');
  const [quickFilter, setQuickFilter] = useState<'todos' | 'aberto' | 'frete' | 'promo'>('todos');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const filtered = restaurants
    .filter(r =>
      (category === 'todos' || r.category === category) &&
      (quickFilter !== 'aberto' || r.is_open_today) &&
      (quickFilter !== 'frete' || r.free_shipping) &&
      (quickFilter !== 'promo' || !!r.promo_text) &&
      (r.name.toLowerCase().includes(search.toLowerCase()) ||
       r.description.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => Number(b.is_open_today) - Number(a.is_open_today));

  const title = category === 'todos' ? 'Estabelecimentos' : getCategory(category).labelPlural;

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-[#e3ede0] sticky top-0 z-10 shadow-[0_1px_12px_rgba(45,80,22,0.06)]">
        <div className="max-w-2xl mx-auto safe-px py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="" className="h-9 w-auto object-contain" />
            <span className="font-black text-lg text-[#2D5016] tracking-tight">Floresta Já</span>
          </Link>
          <div className="flex items-center gap-3">
            {/* Carrinho com badge */}
            {user?.role !== 'restaurant_owner' && totalItems > 0 && (
              <Link to="/cart" className="relative flex items-center gap-1.5 bg-[#2D5016] text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-[#3d6b1e] transition-colors">
                <ShoppingCart size={16} />
                <span>{totalItems}</span>
              </Link>
            )}

            {user ? (
              user.role === 'restaurant_owner' ? (
                <>
                  <Link to="/meu-restaurante" className="flex items-center gap-1.5 text-sm font-semibold text-[#2D5016] hover:underline">
                    <UtensilsCrossed size={15} /> Meu estabelecimento
                  </Link>
                  <button onClick={logout} className="text-sm text-[#777] hover:text-[#333] transition-colors">
                    Sair
                  </button>
                </>
              ) : (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(o => !o)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-[#2D5016] hover:bg-[#e8f5e0] px-2.5 py-1.5 rounded-xl transition-colors"
                  >
                    <User size={15} />
                    <span className="max-w-[100px] truncate">{user.name?.split(' ')[0] ?? 'Conta'}</span>
                    <ChevronDown size={14} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-20">
                      <Link to="/meus-pedidos" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#444] hover:bg-[#f7f5f0] transition-colors">
                        <Package size={15} className="text-[#6BA534]" /> Pedidos
                      </Link>
                      <Link to="/meus-dados" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#444] hover:bg-[#f7f5f0] transition-colors">
                        <MapPin size={15} className="text-[#6BA534]" /> Endereço
                      </Link>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => { setMenuOpen(false); logout(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={15} /> Sair
                      </button>
                    </div>
                  )}
                </div>
              )
            ) : (
              <Link to="/login" className="text-sm font-semibold text-[#2D5016] hover:underline">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto safe-px py-8">
        {/* Title */}
        <div className="mb-5 animate-fade-in-up">
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#2D5016] via-[#4a8526] to-[#6BA534] bg-clip-text text-transparent drop-shadow-sm">{title}</h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="flex items-center gap-1 bg-[#e8f5e0] text-[#2D5016] text-xs font-bold px-2.5 py-1 rounded-full">
              <MapPin size={12} />
              Floresta - PE
            </span>
          </div>
        </div>

        {/* Resumo rápido */}
        <div className="grid grid-cols-3 gap-3 mb-7 animate-fade-in-up">
          <div className="bg-white rounded-2xl p-3.5 shadow-[0_2px_14px_rgba(20,40,10,0.06)] flex flex-col gap-1">
            <div className="w-8 h-8 rounded-xl bg-[#e8f5e0] flex items-center justify-center">
              <UtensilsCrossed size={15} className="text-[#2D5016]" />
            </div>
            <span className="text-lg font-black text-[#1a1a1a] leading-none mt-0.5">{restaurants.length}</span>
            <span className="text-[11px] text-[#999] font-medium">Estabelecimentos</span>
          </div>
          <div className="bg-white rounded-2xl p-3.5 shadow-[0_2px_14px_rgba(20,40,10,0.06)] flex flex-col gap-1">
            <div className="w-8 h-8 rounded-xl bg-[#e8f5e0] flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-[#6BA534] animate-pulse" />
            </div>
            <span className="text-lg font-black text-[#1a1a1a] leading-none mt-0.5">{restaurants.filter(r => r.is_open_today).length}</span>
            <span className="text-[11px] text-[#999] font-medium">Abertos agora</span>
          </div>
          <div className="bg-white rounded-2xl p-3.5 shadow-[0_2px_14px_rgba(20,40,10,0.06)] flex flex-col gap-1">
            <div className="w-8 h-8 rounded-xl bg-[#e8f5e0] flex items-center justify-center">
              <MapPin size={15} className="text-[#2D5016]" />
            </div>
            <span className="text-lg font-black text-[#1a1a1a] leading-none mt-0.5">Floresta</span>
            <span className="text-[11px] text-[#999] font-medium">Pernambuco</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <div className="flex items-center bg-white border-2 border-[#e3ede0] rounded-2xl shadow-sm focus-within:border-[#6BA534] focus-within:ring-4 focus-within:ring-[#6BA534]/12 transition-all overflow-hidden">
            <div className="shrink-0 w-11 h-11 ml-1.5 my-1.5 rounded-xl bg-[#e8f5e0] flex items-center justify-center">
              <Search size={17} className="text-[#2D5016]" />
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, prato ou tipo..."
              className="flex-1 min-w-0 bg-transparent outline-none px-3 py-3.5 text-sm placeholder:text-[#bbb]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="shrink-0 mr-3 text-[#bbb] hover:text-[#888] transition-colors text-lg leading-none px-1">
                ×
              </button>
            )}
          </div>
        </div>

        {/* Atalhos circulares de categoria */}
        <div className="flex gap-4 overflow-x-auto pb-1.5 mb-5 -mx-5 px-5 scrollbar-none">
          <button onClick={() => setCategory('todos')} className="shrink-0 flex flex-col items-center gap-1.5 group">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${
              category === 'todos'
                ? 'bg-[#2D5016] shadow-[0_6px_16px_rgba(45,80,22,0.35)] scale-105'
                : 'bg-white border border-[#e3ede0] shadow-sm group-hover:border-[#bcd9a4]'
            }`}>
              <Store size={22} className={category === 'todos' ? 'text-white' : 'text-[#6BA534]'} />
            </div>
            <span className={`text-[11px] font-semibold ${category === 'todos' ? 'text-[#2D5016]' : 'text-[#888]'}`}>Todos</span>
          </button>
          {CATEGORIES.map(c => {
            const Icon = c.icon;
            const active = category === c.id;
            return (
              <button key={c.id} onClick={() => setCategory(c.id)} className="shrink-0 flex flex-col items-center gap-1.5 group">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                  active
                    ? 'bg-[#2D5016] shadow-[0_6px_16px_rgba(45,80,22,0.35)] scale-105'
                    : 'bg-white border border-[#e3ede0] shadow-sm group-hover:border-[#bcd9a4]'
                }`}>
                  <Icon size={22} className={active ? 'text-white' : 'text-[#6BA534]'} />
                </div>
                <span className={`text-[11px] font-semibold whitespace-nowrap ${active ? 'text-[#2D5016]' : 'text-[#888]'}`}>{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* Chips de filtro rápido */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 mb-7 -mx-5 px-5 scrollbar-none">
          <button
            onClick={() => setQuickFilter(f => f === 'aberto' ? 'todos' : 'aberto')}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              quickFilter === 'aberto'
                ? 'bg-[#2D5016] text-white shadow-[0_4px_12px_rgba(45,80,22,0.3)]'
                : 'bg-[#e8f5e0] text-[#2D5016] hover:brightness-95'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${quickFilter === 'aberto' ? 'bg-white' : 'bg-[#6BA534]'} animate-pulse`} />
            Aberto agora
          </button>
          <button
            onClick={() => setQuickFilter(f => f === 'frete' ? 'todos' : 'frete')}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              quickFilter === 'frete'
                ? 'bg-[#2D5016] text-white shadow-[0_4px_12px_rgba(45,80,22,0.3)]'
                : 'bg-[#fff4e0] text-[#b9790a] hover:brightness-95'
            }`}
          >
            🛵 Frete grátis
          </button>
          <button
            onClick={() => setQuickFilter(f => f === 'promo' ? 'todos' : 'promo')}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              quickFilter === 'promo'
                ? 'bg-[#2D5016] text-white shadow-[0_4px_12px_rgba(45,80,22,0.3)]'
                : 'bg-[#fde8ea] text-[#c23b52] hover:brightness-95'
            }`}
          >
            🔥 Promoções
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="skeleton w-16 h-16 shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <div className="skeleton h-4 rounded w-2/3" />
                  <div className="skeleton h-3 rounded w-full" />
                  <div className="skeleton h-3 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-[#e8f5e0] flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-[#6BA534]" />
            </div>
            <p className="text-[#888] text-lg font-semibold">Nenhum estabelecimento encontrado</p>
            <p className="text-sm text-[#bbb] mt-1">
              {search ? 'Tente outra busca' : 'Ainda não há estabelecimentos cadastrados nessa categoria em Floresta - PE'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((restaurant, idx) => {
              const cat = getCategory(restaurant.category);
              const CatIcon = cat.icon;
              return (
                <Link
                  key={restaurant.id}
                  to={`/restaurantes/${restaurant.id}`}
                  style={{ animationDelay: `${Math.min(idx, 8) * 45}ms` }}
                  className="block bg-white rounded-3xl shadow-[0_2px_14px_rgba(20,40,10,0.06)] card-hover animate-fade-in-up border-2 border-transparent hover:border-[#cfe9ba] overflow-hidden"
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
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#e8f5e0] to-[#d3ecc0] flex items-center justify-center shrink-0">
                        <CatIcon size={28} className="text-[#6BA534]" />
                      </div>
                    )}

                    {/* Informações */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <h2 className="text-base font-bold text-[#1a1a1a] truncate">{restaurant.name}</h2>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#6BA534] uppercase tracking-wide">
                            <CatIcon size={11} /> {cat.label}
                          </span>
                        </div>
                        <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          restaurant.is_open_today
                            ? 'bg-[#e8f5e0] text-[#2D5016]'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${restaurant.is_open_today ? 'bg-[#6BA534]' : 'bg-red-400'}`} />
                          {restaurant.is_open_today ? 'Aberto' : 'Fechado'}
                        </span>
                      </div>

                      {restaurant.description && (
                        <p className="text-xs text-[#888] mb-2 line-clamp-1 mt-1">{restaurant.description}</p>
                      )}

                      {/* Selos: frete grátis, promoção, tempo estimado */}
                      {(restaurant.free_shipping || restaurant.promo_text || restaurant.is_open_today) && (
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          {restaurant.is_open_today && (
                            <span className="inline-flex items-center gap-1 bg-[#eef6f9] text-[#2778a0] text-[10px] font-bold px-2 py-0.5 rounded-full">
                              ⏱ {restaurant.delivery_time_min}-{restaurant.delivery_time_max} min
                            </span>
                          )}
                          {restaurant.free_shipping && (
                            <span className="inline-flex items-center gap-1 bg-[#fff4e0] text-[#b9790a] text-[10px] font-bold px-2 py-0.5 rounded-full">
                              🛵 Frete grátis
                            </span>
                          )}
                          {restaurant.promo_text && (
                            <span className="inline-flex items-center gap-1 bg-[#fde8ea] text-[#c23b52] text-[10px] font-bold px-2 py-0.5 rounded-full">
                              🔥 {restaurant.promo_text}
                            </span>
                          )}
                        </div>
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
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
