import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, MapPin, Phone, ShoppingCart, Plus, Minus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, type Restaurant, type MenuItem } from '../lib/supabase';
import { useCart } from '../helpers/useCart';
import { useAuth } from '../helpers/useAuth';
import { useMenuItems } from '../helpers/useMenuItems';

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

  const { items: menuItems, isLoading: loadingMenu } = useMenuItems(id ?? null);
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

  const grouped = groupByCategory(menuItems.filter(i => i.available));
  const categories = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen bg-[#f7f5f0] pb-32">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
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

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Restaurant info */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6 animate-fade-in-up">
          {restaurant.image_url && (
            <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-44 object-cover" />
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
                <h2 className="text-xs font-black uppercase tracking-widest text-[#6BA534] mb-3 px-1">{cat}</h2>
                <div className="space-y-3">
                  {grouped[cat].map(item => {
                    const qty = getQty(item.id);
                    return (
                      <div key={item.id} className="bg-white rounded-2xl shadow-sm p-4 flex gap-4 card-hover">
                        {item.image_url && (
                          <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-xl shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[#1a1a1a]">{item.name}</h3>
                          {item.description && <p className="text-xs text-[#888] mt-0.5 line-clamp-2">{item.description}</p>}
                          <div className="flex items-center justify-between mt-3">
                            <span className="font-black text-[#2D5016]">{formatPrice(item.price)}</span>
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

      {/* Floating cart bar */}
      {!isOwner && totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-transparent pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <Link
              to="/cart"
              className="flex items-center justify-between bg-gradient-to-b from-[#356019] to-[#2D5016] text-white px-6 py-4 rounded-2xl shadow-xl hover:brightness-110 active:scale-[0.98] transition-all animate-fade-in-up"
            >
              <div className="flex items-center gap-3">
                <span className="bg-white/20 rounded-lg w-7 h-7 flex items-center justify-center text-sm font-black">{totalItems}</span>
                <span className="font-semibold">Ver carrinho</span>
              </div>
              <span className="font-black text-lg">{formatPrice(totalPrice)}</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
