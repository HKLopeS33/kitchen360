import { MapPin, Clock, Search, UtensilsCrossed, ShoppingCart, ChevronDown, Package, User, LogOut, Store, ShieldCheck, Bike, Flame, Timer, X } from 'lucide-react';
import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useRestaurants } from '../helpers/useRestaurants';
import { useAuth } from '../helpers/useAuth';
import { useCart } from '../helpers/useCart';
import { CATEGORIES, getCategory, type Category } from '../lib/categories';
import logo from '../assets/logo-icon.png';
import { Footer } from '../components/Footer';
import { PromotionsCarousel } from '../components/PromotionsCarousel';
import { NotificationBell } from '../components/NotificationBell';

type QuickFilter = 'todos' | 'aberto' | 'frete' | 'promo';

function formatTime(time: string) {
  return time?.slice(0, 5) ?? '--:--';
}

/** Gutter lateral único da página: 16px + área segura do aparelho. */
const GUTTER = 'px-[calc(env(safe-area-inset-left,0px)+1rem)] sm:px-6';
const CONTAINER = `max-w-2xl lg:max-w-3xl mx-auto ${GUTTER}`;

function Chip({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold whitespace-nowrap border ${
        active
          ? 'bg-[#2D5016] border-[#2D5016] text-white'
          : 'bg-white border-[#e3e8dd] text-[#3f4a38] hover:border-[#bcd9a4]'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export function Restaurants() {
  const { restaurants, isLoading } = useRestaurants();
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | 'todos'>('todos');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('todos');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const toggleQuick = (f: QuickFilter) => setQuickFilter(cur => (cur === f ? 'todos' : f));

  const q = search.trim().toLowerCase();
  const filtered = restaurants
    .filter(r =>
      (category === 'todos' || r.category === category) &&
      (quickFilter !== 'aberto' || r.is_open_today) &&
      (quickFilter !== 'frete' || r.free_shipping) &&
      (quickFilter !== 'promo' || !!r.promo_text) &&
      (!q || r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q))
    )
    .sort((a, b) => Number(b.is_open_today) - Number(a.is_open_today));

  const openCount = restaurants.filter(r => r.is_open_today).length;
  const title = category === 'todos' ? 'Estabelecimentos' : getCategory(category).labelPlural;
  const hasFilters = category !== 'todos' || quickFilter !== 'todos' || !!q;

  const iconBtn = 'relative flex items-center justify-center w-10 h-10 rounded-full bg-[#f1f5ec] hover:bg-[#e3ede0] text-[#2D5016]';

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#eceee8] sticky top-0 z-30">
        <div className={`${CONTAINER} h-16 flex items-center justify-between gap-3`}>
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src={logo} alt="" className="h-8 w-auto object-contain shrink-0" />
            <span className="font-black text-[17px] text-[#2D5016] tracking-tight truncate">Floresta Já</span>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              user.role === 'restaurant_owner' ? (
                <>
                  <Link to="/meu-restaurante" className="flex items-center gap-1.5 h-10 px-3 rounded-full bg-[#f1f5ec] text-sm font-semibold text-[#2D5016]">
                    <UtensilsCrossed size={15} /> <span className="hidden sm:inline">Meu estabelecimento</span><span className="sm:hidden">Painel</span>
                  </Link>
                  <button onClick={logout} className={iconBtn} aria-label="Sair">
                    <LogOut size={17} />
                  </button>
                </>
              ) : (
                <>
                  <NotificationBell userId={user.id} />

                  {(user.role === 'client' || user.role === 'admin') && (
                    <Link to="/cart" className={iconBtn} aria-label="Carrinho">
                      <ShoppingCart size={18} />
                      {totalItems > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 ring-2 ring-white text-white text-[10px] font-black flex items-center justify-center leading-none">
                          {totalItems}
                        </span>
                      )}
                    </Link>
                  )}

                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setMenuOpen(o => !o)}
                      aria-label="Minha conta"
                      className="flex items-center gap-1 h-10 pl-1 pr-2 rounded-full bg-[#f1f5ec] hover:bg-[#e3ede0] text-[#2D5016]"
                    >
                      <span className="w-8 h-8 rounded-full bg-[#2D5016] text-white text-sm font-bold flex items-center justify-center uppercase">
                        {user.name?.trim()?.[0] ?? <User size={15} />}
                      </span>
                      <ChevronDown size={14} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-[var(--shadow-lg)] border border-gray-100 py-1.5 z-40 animate-scale-in">
                        <div className="px-4 py-2.5 border-b border-gray-100 mb-1">
                          <p className="text-sm font-bold text-[#1a1a1a] truncate">{user.name ?? 'Minha conta'}</p>
                        </div>
                        <Link to="/meus-pedidos" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#444] hover:bg-[#f7f5f0]">
                          <Package size={15} className="text-[#6BA534]" /> Pedidos
                        </Link>
                        <Link to="/meus-dados" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#444] hover:bg-[#f7f5f0]">
                          <User size={15} className="text-[#6BA534]" /> Meu perfil
                        </Link>
                        {user.role === 'admin' && (
                          <Link to="/admin" onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#2D5016] hover:bg-[#e8f5e0]">
                            <ShieldCheck size={15} className="text-[#6BA534]" /> Painel administrativo
                          </Link>
                        )}
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          onClick={() => { setMenuOpen(false); logout(); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
                        >
                          <LogOut size={15} /> Sair
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )
            ) : (
              <Link to="/login" className="h-10 px-4 rounded-full bg-[#2D5016] text-white text-sm font-semibold flex items-center">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className={`${CONTAINER} pt-5 pb-10 flex flex-col gap-6`}>
        {/* Título + busca */}
        <section className="flex flex-col gap-4 animate-fade-in-up">
          <div>
            <p className="flex items-center gap-1 text-[13px] font-semibold text-[#6BA534]">
              <MapPin size={14} /> Floresta, PE
            </p>
            <h1 className="mt-1 text-[26px] sm:text-3xl leading-tight font-black tracking-tight text-[#1f3a0f]">{title}</h1>
            {!isLoading && (
              <p className="mt-1 text-sm text-[#7a8274]">
                <span className="font-semibold text-[#2D5016]">{openCount} abertos agora</span>
                {' · '}{restaurants.length} no total
              </p>
            )}
          </div>

          <label className="flex items-center gap-2.5 h-12 px-4 bg-white border border-[#e3e8dd] rounded-2xl focus-within:border-[#6BA534] focus-within:ring-4 focus-within:ring-[#6BA534]/10">
            <Search size={18} className="text-[#8a9483] shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar restaurante ou prato"
              className="flex-1 min-w-0 bg-transparent outline-none text-[15px] text-[#1a1a1a] placeholder:text-[#a3aa9d]"
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Limpar busca" className="shrink-0 w-7 h-7 -mr-1 rounded-full bg-[#f1f5ec] text-[#6b7465] flex items-center justify-center">
                <X size={14} />
              </button>
            )}
          </label>
        </section>

        {/* Categorias + filtros rápidos */}
        <section className="flex flex-col gap-2.5">
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            <Chip active={category === 'todos'} onClick={() => setCategory('todos')} icon={<Store size={15} />}>Todos</Chip>
            {CATEGORIES.map(c => {
              const Icon = c.icon;
              return (
                <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)} icon={<Icon size={15} />}>
                  {c.label}
                </Chip>
              );
            })}
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            <Chip active={quickFilter === 'aberto'} onClick={() => toggleQuick('aberto')} icon={<span className={`w-2 h-2 rounded-full ${quickFilter === 'aberto' ? 'bg-white' : 'bg-[#6BA534]'}`} />}>
              Aberto agora
            </Chip>
            <Chip active={quickFilter === 'frete'} onClick={() => toggleQuick('frete')} icon={<Bike size={15} />}>
              Frete grátis
            </Chip>
            <Chip active={quickFilter === 'promo'} onClick={() => toggleQuick('promo')} icon={<Flame size={15} />}>
              Promoções
            </Chip>
          </div>
        </section>

        <PromotionsCarousel />

        {/* Lista */}
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-bold text-[#1a1a1a]">
              {hasFilters ? 'Resultados' : 'Todos os estabelecimentos'}
            </h2>
            {!isLoading && <span className="text-xs text-[#8a9483]">{filtered.length} {filtered.length === 1 ? 'local' : 'locais'}</span>}
          </div>

          {isLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-3 flex gap-3">
                <div className="skeleton w-[72px] h-[72px] shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="skeleton h-4 rounded w-2/3" />
                  <div className="skeleton h-3 rounded w-1/2" />
                  <div className="skeleton h-3 rounded w-3/4" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 px-6 bg-white rounded-2xl animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-[#e8f5e0] flex items-center justify-center mx-auto mb-3">
                <Search size={24} className="text-[#6BA534]" />
              </div>
              <p className="text-[#1a1a1a] font-semibold">Nenhum estabelecimento encontrado</p>
              <p className="text-sm text-[#8a9483] mt-1">
                {q ? 'Tente buscar por outro nome.' : 'Ainda não há estabelecimentos nessa categoria.'}
              </p>
              {hasFilters && (
                <button
                  onClick={() => { setSearch(''); setCategory('todos'); setQuickFilter('todos'); }}
                  className="mt-4 h-9 px-4 rounded-full bg-[#2D5016] text-white text-sm font-semibold"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            filtered.map((restaurant, idx) => {
              const cat = getCategory(restaurant.category);
              const CatIcon = cat.icon;
              const open = restaurant.is_open_today;
              return (
                <Link
                  key={restaurant.id}
                  to={`/restaurantes/${restaurant.id}`}
                  style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
                  className="flex gap-3 p-3 bg-white rounded-2xl border border-[#eceee8] hover:border-[#cfe9ba] card-hover animate-fade-in-up"
                >
                  {/* Logo */}
                  <div className={`relative w-[72px] h-[72px] shrink-0 rounded-xl overflow-hidden bg-[#f1f5ec] ${open ? '' : 'grayscale opacity-60'}`}>
                    {restaurant.image_url ? (
                      <img src={restaurant.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <CatIcon size={28} className="text-[#6BA534]" />
                      </div>
                    )}
                  </div>

                  {/* Informações */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[15px] leading-snug font-bold text-[#1a1a1a] truncate">{restaurant.name}</h3>
                      <span className={`shrink-0 mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold ${open ? 'text-[#4a8526]' : 'text-[#b4453a]'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-[#6BA534]' : 'bg-[#d0675c]'}`} />
                        {open ? 'Aberto' : 'Fechado'}
                      </span>
                    </div>

                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#6b7465] min-w-0">
                      <span className="shrink-0">{cat.label}</span>
                      {open && (
                        <>
                          <span className="text-[#c6cbc1]">•</span>
                          <span className="shrink-0 inline-flex items-center gap-1">
                            <Timer size={12} /> {restaurant.delivery_time_min}–{restaurant.delivery_time_max} min
                          </span>
                        </>
                      )}
                    </p>

                    {restaurant.description && (
                      <p className="mt-1 text-xs text-[#8a9483] line-clamp-1">{restaurant.description}</p>
                    )}

                    {(restaurant.free_shipping || restaurant.promo_text) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {restaurant.free_shipping && (
                          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-[#fff4e0] text-[#9a6408] text-[11px] font-semibold">
                            <Bike size={12} /> Frete grátis
                          </span>
                        )}
                        {restaurant.promo_text && (
                          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-[#fdecee] text-[#b5354b] text-[11px] font-semibold max-w-full">
                            <Flame size={12} className="shrink-0" /> <span className="truncate">{restaurant.promo_text}</span>
                          </span>
                        )}
                      </div>
                    )}

                    <p className="mt-auto pt-1.5 flex items-center gap-1.5 text-[11px] text-[#9aa294] min-w-0">
                      <span className="shrink-0 inline-flex items-center gap-1">
                        <Clock size={11} /> {formatTime(restaurant.open_time)}–{formatTime(restaurant.close_time)}
                      </span>
                      {restaurant.address && (
                        <>
                          <span className="text-[#c6cbc1]">•</span>
                          <MapPin size={11} className="shrink-0" />
                          <span className="truncate">{restaurant.address}</span>
                        </>
                      )}
                    </p>
                  </div>
                </Link>
              );
            })
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
