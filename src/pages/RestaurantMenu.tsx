import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, MapPin, Phone, ShoppingCart, Plus, Minus, AlertCircle, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, type Restaurant, type MenuItem } from '../lib/supabase';
import { useCart } from '../helpers/useCart';
import { useAuth } from '../helpers/useAuth';
import { useMenuItems } from '../helpers/useMenuItems';
import { useRestaurantPromotions, applyPromo } from '../helpers/usePromotions';
import { FloatingCart } from '../components/FloatingCart';

function formatTime(t: string) { return t?.slice(0, 5) ?? '--:--'; }
function formatPrice(p: number) { return `R$ ${Number(p).toFixed(2).replace('.', ',')}` ; }

function groupByCategory(items: MenuItem[]) {
  return items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});
}

export function RestaurantMenu() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);

  const { items: rawMenuItems, isLoading: loadingMenu } = useMenuItems(id ?? null);
  const promotions = useRestaurantPromotions(id ?? null);
  // Itens já com o preço promocional aplicado (o banco cobra o mesmo valor).
  const menuItems = rawMenuItems.map(i => applyPromo(i, promotions));
  // Promoções sem item ligado (combos, avisos) aparecem como destaque no topo.
  const generalPromos = promotions.filter(p => !p.menu_item_id);
  const { items: cartItems, restaurantId, addItem, updateQty, totalItems, totalPrice } = useCart();
  const { user } = useAuth();
  const isOwner = user?.role === 'restaurant_owner';

  useEffect(() => {
    if (!id) return;
    supabase.from('restaurants').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      setRestaurant(data ?? null);
      setLoadingRestaurant(false);
    });
  }, [id]);

  const getQty = (itemId: string) => cartItems.find(c => c.item.id === itemId)?.quantity ?? 0;

  const handleAdd = (item: MenuItem) => {
    if (isOwner) {
      toast.error('Contas de estabelecimento não podem fazer pedidos. Use uma conta de cliente.');
      return;
    }
    if (restaurantId && restaurantId !== item.restaurant_id) {
      toast('Seu carrinho tem itens de outro restaurante. Deseja limpar e adicionar este?', {
        action: {
          label: 'Sim, trocar',
          onClick: () => { addItem(item); toast.success(`${item.name} adicionado!`); },
        },
      });
      return;
    }
    addItem(item);
    toast.success(`${item.name} adicionado!`, { duration: 1500 });
  };

  if (loadingRestaurant) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#2D5016] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex flex-col items-center justify-center gap-4">
        <p className="text-[#777]">Restaurante não encontrado.</p>
        <Link to="/restaurantes" className="text-[#2D5016] font-semibold hover:underline">Voltar</Link>
      </div>
    );
  }

  const available = menuItems.filter(i => i.available);
  const grouped = groupByCategory(available);
  const onSale = available.filter(i => i.original_price);
  const categories = [
    ...(onSale.length ? ['__promo'] : []),
    ...Object.keys(grouped).sort(),
  ];
  if (onSale.length) grouped.__promo = onSale;

  return (
    <div className="min-h-screen bg-[#f7f5f0] pb-32">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl lg:max-w-3xl mx-auto safe-px py-4 flex items-center gap-3">
          <button onClick={() => navigate('/restaurantes')} className="text-[#555] hover:text-[#1a1a1a] transition-colors">
            <ArrowLeft size={22} />
          </button>
          <span className="font-bold text-[#1a1a1a] truncate flex-1">{restaurant.name}</span>
          {!isOwner && totalItems > 0 && (
            <Link to="/cart" className="relative flex items-center gap-2 bg-[#2D5016] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#3d6b1e] transition-colors">
              <ShoppingCart size={16} />
              <span>{totalItems}</span>
              <span className="hidden sm:inline">· {formatPrice(totalPrice)}</span>
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-2xl lg:max-w-3xl mx-auto safe-px pt-6 pb-24">
        {/* Restaurant info */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6 animate-fade-in-up">
          {restaurant.image_url && (
            <img src={restaurant.image_url} alt={restaurant.name} fetchPriority="high" decoding="async" width={800} height={176} className="w-full h-44 object-cover" />
          )}
          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h1 className="text-2xl font-black text-[#1a1a1a]">{restaurant.name}</h1>
                {restaurant.description && <p className="text-sm text-[#666] mt-1">{restaurant.description}</p>}
              </div>
              <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${
                restaurant.is_open_today ? 'bg-[#e8f5e0] text-[#2D5016]' : 'bg-red-50 text-red-600'
              }`}>
                {restaurant.is_open_today ? 'Aberto' : 'Fechado'}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-[#777]">
              <span className="flex items-center gap-1.5"><Clock size={14} className="text-[#6BA534]" />{formatTime(restaurant.open_time)} – {formatTime(restaurant.close_time)}</span>
              {restaurant.address && <span className="flex items-center gap-1.5"><MapPin size={14} className="text-[#6BA534]" />{restaurant.address}</span>}
              {restaurant.phone && <span className="flex items-center gap-1.5"><Phone size={14} className="text-[#6BA534]" />{restaurant.phone}</span>}
            </div>
          </div>
        </div>

        {/* Menu */}
        {!restaurant.is_open_today && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 mb-5 text-sm text-red-700">
            <AlertCircle size={18} className="shrink-0" />
            Este restaurante está fechado hoje. Você ainda pode ver o cardápio.
          </div>
        )}

        {generalPromos.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2 mb-5 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
            {generalPromos.map(p => (
              <div key={p.id} className="shrink-0 w-64 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 text-white p-4">
                <div className="flex items-center gap-2">
                  <Tag size={14} />
                  {p.badge && <span className="text-xs font-black uppercase">{p.badge}</span>}
                </div>
                <p className="mt-1 font-bold leading-tight">{p.title}</p>
                {p.description && <p className="mt-1 text-xs text-white/85 line-clamp-2">{p.description}</p>}
                {p.promo_price && (
                  <p className="mt-2 text-sm">
                    {p.original_price && <span className="line-through text-white/70 mr-1.5">{formatPrice(p.original_price)}</span>}
                    <span className="font-black">{formatPrice(p.promo_price)}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {loadingMenu ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4">
                <div className="skeleton h-4 rounded w-1/3 mb-4" />
                <div className="skeleton h-16 rounded mb-2" />
                <div className="skeleton h-16 rounded" />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 text-[#aaa]">
            <p className="text-lg">Nenhum item no cardápio ainda.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((cat, ci) => (
              <div key={cat} className="animate-fade-in-up" style={{ animationDelay: `${ci * 60}ms` }}>
                {cat === '__promo' ? (
                  <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 mb-3 px-1 flex items-center gap-1.5">
                    <Tag size={13} /> Em promoção
                  </h2>
                ) : (
                  <h2 className="text-xs font-black uppercase tracking-widest text-[#6BA534] mb-3 px-1">{cat}</h2>
                )}
                <div className="space-y-3">
                  {grouped[cat].map(item => {
                    const qty = getQty(item.id);
                    return (
                      <div key={`${cat}-${item.id}`} className="bg-white rounded-2xl shadow-sm p-4 flex gap-4 card-hover">
                        {item.image_url && (
                          <img src={item.image_url} alt={item.name} loading="lazy" decoding="async" width={80} height={80} className="w-20 h-20 object-cover rounded-xl shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <h3 className="font-bold text-[#1a1a1a] flex-1 min-w-0">{item.name}</h3>
                            {item.original_price && (
                              <span className="shrink-0 text-[10px] font-black uppercase bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full">
                                {item.promo_badge || `${Math.round((1 - item.price / item.original_price) * 100)}% OFF`}
                              </span>
                            )}
                          </div>
                          {item.description && <p className="text-xs text-[#888] mt-0.5 line-clamp-2">{item.description}</p>}
                          <div className="flex items-center justify-between mt-3">
                            <span className="flex items-baseline gap-1.5">
                              {item.original_price && (
                                <span className="text-xs text-[#aaa] line-through">{formatPrice(item.original_price)}</span>
                              )}
                              <span className={`font-black ${item.original_price ? 'text-orange-500' : 'text-[#2D5016]'}`}>{formatPrice(item.price)}</span>
                            </span>
                            {isOwner ? (
                              <span className="text-xs text-[#bbb] italic">Conta de estabelecimento</span>
                            ) : qty === 0 ? (
                              <button
                                onClick={() => handleAdd(item)}
                                disabled={!restaurant.is_open_today}
                                className="flex items-center gap-1.5 bg-gradient-to-b from-[#356019] to-[#2D5016] disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-[0_2px_10px_rgba(45,80,22,0.25)] hover:brightness-110 active:scale-95 transition-all"
                              >
                                <Plus size={15} /> Adicionar
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQty(item.id, qty - 1)}
                                  className="w-8 h-8 rounded-xl bg-[#e8f5e0] text-[#2D5016] flex items-center justify-center hover:bg-[#d0edc0] transition-colors"
                                >
                                  <Minus size={15} />
                                </button>
                                <span className="font-black text-[#2D5016] w-5 text-center">{qty}</span>
                                <button
                                  onClick={() => handleAdd(item)}
                                  className="w-8 h-8 rounded-xl bg-[#2D5016] text-white flex items-center justify-center hover:bg-[#3d6b1e] transition-colors"
                                >
                                  <Plus size={15} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {!isOwner && <FloatingCart />}
    </div>
  );
}
