import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Leaf, Clock, MapPin, Phone, Store, ToggleLeft, ToggleRight,
  LogOut, Eye, Plus, Trash2, Pencil, X, Check,
  Package, UtensilsCrossed, Settings, Wallet, ExternalLink, EyeOff, CheckCircle2, AlertCircle,
  Share2, Copy, ShieldCheck, Tag, Calendar, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../helpers/useAuth';
import { useMyRestaurant } from '../helpers/useRestaurants';
import { useMenuItems } from '../helpers/useMenuItems';
import { useMyPromotions, type Promotion } from '../helpers/usePromotions';
import { Button } from '../components/Button';
import { ImageUpload } from '../components/ImageUpload';
import { OrdersPanel } from '../components/OrdersPanel';
import { supabase } from '../lib/supabase';
import type { MenuItem } from '../lib/supabase';
import { CATEGORIES, type Category } from '../lib/categories';

type Tab = 'pedidos' | 'cardapio' | 'promocoes' | 'dados';

function InputField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#333] mb-1.5">{label}</label>
      <input {...props}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all"
      />
    </div>
  );
}

export function RestaurantDashboard() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { restaurant, isLoading: restaurantLoading, createRestaurant, updateRestaurant, toggleOpenToday } = useMyRestaurant(user?.id ?? null);

  const [tab, setTab] = useState<Tab>('pedidos');

  // Adia a busca do cardápio até a aba "Cardápio" ser aberta — evita atraso na exibição inicial (Pedidos)
  const [menuLoaded, setMenuLoaded] = useState(false);
  useEffect(() => { if (tab === 'cardapio' || tab === 'promocoes') setMenuLoaded(true); }, [tab]);
  const { promotions, create: createPromo, update: updatePromo, toggle: togglePromo, remove: removePromo } = useMyPromotions(restaurant?.id ?? null);
  const { items: menuItems, isLoading: loadingMenu, createItem, updateItem, deleteItem } = useMenuItems(menuLoaded ? (restaurant?.id ?? null) : null);
  const [toggling, setToggling] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form dados do restaurante
  const [form, setForm] = useState({
    name: '', description: '', phone: '', address: '',
    open_time: '08:00', close_time: '18:00', image_url: '', is_open_today: false,
    category: 'restaurante' as Category,
    free_shipping: false, promo_text: '', delivery_time_min: 30, delivery_time_max: 50,
    mp_public_key: '',
  });
  const [showToken, setShowToken] = useState(false);
  // Token do Mercado Pago: só é enviado ao banco, nunca lido de volta.
  const [mpTokenInput, setMpTokenInput] = useState('');
  const [mpConfigured, setMpConfigured] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant.name,
        description: restaurant.description,
        phone: restaurant.phone,
        address: restaurant.address,
        open_time: restaurant.open_time.slice(0, 5),
        close_time: restaurant.close_time.slice(0, 5),
        image_url: restaurant.image_url ?? '',
        is_open_today: restaurant.is_open_today,
        category: (restaurant.category as Category) ?? 'restaurante',
        free_shipping: restaurant.free_shipping ?? false,
        promo_text: restaurant.promo_text ?? '',
        delivery_time_min: restaurant.delivery_time_min ?? 30,
        delivery_time_max: restaurant.delivery_time_max ?? 50,
        mp_public_key: restaurant.mp_public_key ?? '',
      });
    }
  }, [restaurant]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate('/login');
    else if (user.role === 'client') navigate('/restaurantes');
  }, [user, authLoading, navigate]);

  // Form cardápio
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [itemForm, setItemForm] = useState({ name: '', description: '', price: '', category: '', image_url: '', available: true });

  function openNewItem() {
    setEditingItem(null);
    setItemForm({ name: '', description: '', price: '', category: '', image_url: '', available: true });
    setShowItemForm(true);
  }
  function openEditItem(item: MenuItem) {
    setEditingItem(item);
    setItemForm({ name: item.name, description: item.description, price: String(item.price), category: item.category, image_url: item.image_url ?? '', available: item.available });
    setShowItemForm(true);
  }
  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemForm.name.trim()) { toast.error('Nome obrigatório'); return; }
    if (!itemForm.price || isNaN(Number(itemForm.price))) { toast.error('Preço inválido'); return; }
    setSavingItem(true);
    try {
      const payload = { name: itemForm.name.trim(), description: itemForm.description.trim(), price: Number(itemForm.price), category: itemForm.category.trim() || 'Geral', image_url: itemForm.image_url || null, available: itemForm.available };
      if (editingItem) { await updateItem(editingItem.id, payload); toast.success('Item atualizado!'); }
      else { await createItem(payload); toast.success('Item adicionado!'); }
      setShowItemForm(false);
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingItem(false); }
  }
  async function handleDeleteItem(id: string) {
    if (!confirm('Remover este item?')) return;
    try { await deleteItem(id); toast.success('Item removido.'); }
    catch (err: any) { toast.error(err.message); }
  }

  useEffect(() => {
    if (!restaurant?.id) return;
    supabase.rpc('restaurant_mp_token_configured', { p_restaurant_id: restaurant.id })
      .then(({ data }) => setMpConfigured(data === true));
  }, [restaurant?.id]);

  async function saveMpToken(restaurantId: string) {
    if (!mpTokenInput.trim()) return;
    const { error } = await supabase.rpc('set_restaurant_mp_token', { p_restaurant_id: restaurantId, p_token: mpTokenInput.trim() });
    if (error) throw new Error(`Dados salvos, mas o token não: ${error.message}`);
    setMpTokenInput('');
    setShowToken(false);
    setMpConfigured(true);
  }

  const field = (key: keyof typeof form) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value })),
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return; }
    if (!restaurant && !acceptedTerms) { toast.error('Você precisa aceitar a política de uso e assinatura para continuar.'); return; }
    setSaving(true);
    try {
      const payload: any = { name: form.name.trim(), description: form.description.trim(), phone: form.phone.trim(), address: form.address.trim(), open_time: form.open_time, close_time: form.close_time, image_url: form.image_url || null, is_open_today: form.is_open_today, category: form.category, free_shipping: form.free_shipping, promo_text: form.promo_text.trim() || null, delivery_time_min: Number(form.delivery_time_min) || 30, delivery_time_max: Number(form.delivery_time_max) || 50, mp_public_key: form.mp_public_key.trim() || null };
      if (!restaurant) payload.accepted_terms_at = new Date().toISOString();
      if (restaurant) { await updateRestaurant(payload); await saveMpToken(restaurant.id); toast.success('Dados atualizados!'); }
      else { const created = await createRestaurant(payload); await saveMpToken(created.id); toast.success('Restaurante cadastrado!'); setTab('pedidos'); }
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function handleToggle() {
    if (!restaurant) return;
    setToggling(true);
    try {
      const next = !restaurant.is_open_today;
      await toggleOpenToday(next);
      toast.success(next ? 'Aberto hoje!' : 'Fechado hoje.');
    } catch (err: any) { toast.error(err.message); }
    finally { setToggling(false); }
  }

  // Só bloqueia a renderização pela autenticação (rápida, já em cache de contexto).
  // O carregamento do restaurante exibe seu próprio skeleton, evitando tela em branco.
  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl lg:max-w-3xl mx-auto safe-px py-4 flex items-center justify-between">
          <Link to="/restaurantes" className="flex items-center gap-2 text-[#2D5016] font-bold text-lg">
            <Leaf size={22} className="text-[#6BA534]" /> Floresta Já
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/restaurantes"
              className="text-sm text-[#777] hover:text-[#2D5016] flex items-center gap-1 transition-colors">
              <Eye size={15} /> Ver restaurantes
            </Link>
            <button onClick={async () => { await logout(); navigate('/login'); }}
              className="text-sm text-[#777] hover:text-[#333] flex items-center gap-1 transition-colors">
              <LogOut size={15} /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl lg:max-w-3xl mx-auto safe-px py-6">

        {/* Cabeçalho com nome + status */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black text-[#1a1a1a]">
              {restaurant ? restaurant.name : 'Meu Restaurante'}
            </h1>
            <p className="text-sm text-[#6BA534]">Floresta - PE</p>
          </div>

          {/* Toggle status — sempre visível */}
          {restaurant && (
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-2xl border-2 transition-all disabled:opacity-50 ${
                restaurant.is_open_today
                  ? 'border-[#2D5016] bg-[#e8f5e0] text-[#2D5016]'
                  : 'border-red-300 bg-red-50 text-red-600'
              }`}
            >
              {restaurant.is_open_today
                ? <><ToggleRight size={20} /> Aberto</>
                : <><ToggleLeft size={20} /> Fechado</>}
            </button>
          )}
        </div>

        {/* Skeleton de carregamento */}
        {restaurantLoading ? (
          <div className="bg-white rounded-2xl p-6 space-y-3">
            <div className="h-5 bg-gray-100 rounded w-1/3" />
            <div className="h-12 bg-gray-100 rounded" />
            <div className="h-12 bg-gray-100 rounded" />
          </div>
        ) : !restaurant ? (
          /* Primeiro acesso — ainda não tem restaurante cadastrado */
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-[#1a1a1a] mb-5 flex items-center gap-2">
              <Store size={18} className="text-[#6BA534]" /> Cadastre seu estabelecimento
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#333] mb-2">Categoria *</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(c => {
                    const Icon = c.icon;
                    const active = form.category === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, category: c.id }))}
                        className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                          active
                            ? 'border-[#2D5016] bg-[#e8f5e0] text-[#2D5016]'
                            : 'border-gray-200 bg-white text-[#666] hover:border-gray-300'
                        }`}
                      >
                        <Icon size={17} className={active ? 'text-[#2D5016]' : 'text-[#aaa]'} />
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <InputField label="Nome do estabelecimento *" placeholder="Ex: Fit Grill Floresta" {...field('name')} required />
              <InputField label="Descrição" placeholder="Uma breve descrição" {...field('description')} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#333] mb-1.5 flex items-center gap-1"><Clock size={13} className="text-[#6BA534]" /> Abre às</label>
                  <input type="time" value={form.open_time} onChange={e => setForm(f => ({ ...f, open_time: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#333] mb-1.5 flex items-center gap-1"><Clock size={13} className="text-[#6BA534]" /> Fecha às</label>
                  <input type="time" value={form.close_time} onChange={e => setForm(f => ({ ...f, close_time: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#333] mb-1.5">⏱ Entrega mín. (min)</label>
                  <input type="number" min={5} value={form.delivery_time_min}
                    onChange={e => setForm(f => ({ ...f, delivery_time_min: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#333] mb-1.5">⏱ Entrega máx. (min)</label>
                  <input type="number" min={5} value={form.delivery_time_max}
                    onChange={e => setForm(f => ({ ...f, delivery_time_max: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#333] mb-1.5">🔥 Texto de promoção (opcional)</label>
                <input value={form.promo_text} onChange={e => setForm(f => ({ ...f, promo_text: e.target.value }))} placeholder="Ex: 20% OFF hoje, 2 por 1..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all" />
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, free_shipping: !f.free_shipping }))}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  form.free_shipping ? 'border-[#2D5016] bg-[#e8f5e0] glow-brand' : 'border-gray-200 hover:border-[#bcd9a4] bg-white'
                }`}
              >
                <span className="text-xl">🛵</span>
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${form.free_shipping ? 'text-[#2D5016]' : 'text-[#333]'}`}>Frete grátis</p>
                  <p className="text-xs text-[#888]">Exibe um selo de frete grátis nos cards do estabelecimento</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${form.free_shipping ? 'border-[#2D5016] bg-[#2D5016]' : 'border-gray-300'}`} />
              </button>
              <div>
                <label className="block text-sm font-semibold text-[#333] mb-1.5 flex items-center gap-1"><MapPin size={13} className="text-[#6BA534]" /> Endereço</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Rua, número, bairro"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#333] mb-1.5 flex items-center gap-1"><Phone size={13} className="text-[#6BA534]" /> Telefone / WhatsApp</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(87) 99999-9999"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all" />
              </div>
              <ImageUpload currentUrl={form.image_url || null} onUpload={url => setForm(f => ({ ...f, image_url: url }))} onRemove={() => setForm(f => ({ ...f, image_url: '' }))} folder="restaurantes" aspectRatio="aspect-video" />

              {/* Resumo da política de assinatura + aceite */}
              <div className="bg-[#f7fbf3] border border-[#e3ede0] rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={17} className="text-[#6BA534]" />
                  <h3 className="font-bold text-sm text-[#1a1a1a]">Como funciona o uso da plataforma</h3>
                </div>
                <p className="text-xs text-[#666] leading-relaxed">
                  Você terá <strong className="text-[#2D5016]">15 dias grátis</strong> para cadastrar seus produtos e
                  testar vendas reais. Depois desse período, o uso da plataforma passa a ter uma
                  <strong className="text-[#2D5016]"> mensalidade única</strong>, com o mesmo valor para todos os
                  estabelecimentos parceiros — definida pela administração do Floresta Já.
                </p>
                <Link to="/politica-assinatura" target="_blank" className="inline-block text-xs font-semibold text-[#6BA534] hover:text-[#2D5016] hover:underline">
                  Ler a política de uso e assinatura completa →
                </Link>
                <label className="flex items-start gap-2.5 pt-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={e => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-[#2D5016] cursor-pointer"
                  />
                  <span className="text-xs text-[#555] leading-relaxed">
                    Li e estou de acordo com a <strong>política de uso e assinatura</strong>, incluindo o período de
                    teste de 15 dias e a cobrança de mensalidade após esse prazo.
                  </span>
                </label>
              </div>

              <Button type="submit" fullWidth loading={saving} size="lg" disabled={!acceptedTerms}>Cadastrar restaurante</Button>
            </form>
          </div>
        ) : (
          <>
            {/* Indicador de assinatura — botão compacto */}
            {(() => {
              const status = restaurant.subscription_status ?? 'trial';
              const isTrial = status === 'trial';
              const refDate = isTrial ? restaurant.trial_ends_at : restaurant.subscription_active_until;
              const remaining = refDate ? Math.ceil((new Date(refDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
              const expired = remaining !== null && remaining < 0;
              const suspended = status === 'suspended';

              let dot = 'bg-[#6BA534]';
              let label = 'Assinatura ativa';
              if (suspended || expired) { dot = 'bg-red-500'; label = suspended ? 'Conta suspensa' : 'Acesso vencido'; }
              else if (isTrial) { dot = 'bg-blue-400'; label = `Teste — ${remaining ?? 0}d restantes`; }
              else if (remaining !== null && remaining <= 10) { dot = 'bg-yellow-400'; label = `Vence em ${remaining}d`; }

              return (
                <Link to="/assinatura"
                  className="flex items-center gap-2 mb-4 self-start bg-white rounded-xl shadow-sm px-3 py-2 border border-gray-100 hover:border-[#6BA534] hover:bg-[#f8fdf5] transition-all animate-fade-in-up">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot} ${(suspended || expired) ? 'animate-pulse' : ''}`} />
                  <span className="text-xs font-semibold text-[#444]">{label}</span>
                  <ChevronRight size={13} className="text-[#aaa] ml-0.5" />
                </Link>
              );
            })()}

            {/* Compartilhar link da loja */}
            <div className="bg-white rounded-2xl shadow-sm p-4 mb-5 flex items-center gap-3 animate-fade-in-up">
              <div className="w-10 h-10 rounded-xl bg-[#e8f5e0] flex items-center justify-center shrink-0">
                <Share2 size={18} className="text-[#6BA534]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-[#1a1a1a]">Compartilhe sua loja</p>
                <p className="text-xs text-[#999] truncate">Envie o link direto da sua página para seus clientes</p>
              </div>
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/restaurantes/${restaurant.id}`;
                  try {
                    if (navigator.share) {
                      await navigator.share({ title: restaurant.name, text: `Confira ${restaurant.name} no Floresta Já!`, url });
                    } else {
                      await navigator.clipboard.writeText(url);
                      toast.success('Link copiado!');
                    }
                  } catch { /* usuário cancelou o compartilhamento */ }
                }}
                className="shrink-0 flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl bg-[#2D5016] text-white hover:bg-[#3d6b1e] transition-colors"
              >
                <Copy size={14} /> Copiar link
              </button>
            </div>

            {/* Tabs de navegação */}
            <div className="flex bg-white rounded-2xl shadow-sm p-1.5 gap-1 mb-5">
              {([
                { key: 'pedidos',   label: 'Pedidos',    icon: <Package size={15} /> },
                { key: 'cardapio',  label: 'Cardápio',   icon: <UtensilsCrossed size={15} /> },
                { key: 'promocoes', label: 'Promoções',  icon: <Tag size={15} /> },
                { key: 'dados',     label: 'Dados',      icon: <Settings size={15} /> },
              ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    tab === t.key
                      ? 'bg-gradient-to-b from-[#356019] to-[#2D5016] text-white shadow-[0_2px_10px_rgba(45,80,22,0.28)]'
                      : 'text-[#777] hover:text-[#2D5016] hover:bg-[#f7f5f0]'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* ── ABA PEDIDOS ── */}
            {tab === 'pedidos' && <OrdersPanel restaurantId={restaurant.id} />}

            {/* ── ABA CARDÁPIO ── */}
            {tab === 'cardapio' && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-[#1a1a1a] flex items-center gap-2">
                    <UtensilsCrossed size={18} className="text-[#6BA534]" /> Cardápio
                    <span className="text-xs font-normal text-[#aaa]">({menuItems.length} itens)</span>
                  </h2>
                  <button onClick={openNewItem}
                    className="flex items-center gap-1.5 bg-[#2D5016] text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-[#3d6b1e] transition-colors">
                    <Plus size={15} /> Novo item
                  </button>
                </div>

                {/* Formulário de item */}
                {showItemForm && (
                  <form onSubmit={handleSaveItem} className="border border-[#e8f5e0] rounded-2xl p-4 mb-5 space-y-3 bg-[#f9fdf6]">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#2D5016]">{editingItem ? 'Editar item' : 'Novo item'}</span>
                      <button type="button" onClick={() => setShowItemForm(false)} className="text-[#aaa] hover:text-[#555]"><X size={18} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-[#333] mb-1">Nome *</label>
                        <input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Frango Grelhado" required
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2D5016] transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#333] mb-1">Preço (R$) *</label>
                        <input type="number" step="0.01" min="0" value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))} placeholder="0,00" required
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2D5016] transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#333] mb-1">Categoria</label>
                        <input value={itemForm.category} onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))} placeholder="Pratos, Lanches, Sucos…"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2D5016] transition-all" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-[#333] mb-1">Descrição</label>
                        <input value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} placeholder="Breve descrição do item"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2D5016] transition-all" />
                      </div>
                      <div className="col-span-2">
                        <ImageUpload currentUrl={itemForm.image_url || null} onUpload={url => setItemForm(f => ({ ...f, image_url: url }))} onRemove={() => setItemForm(f => ({ ...f, image_url: '' }))} folder="cardapio" aspectRatio="aspect-video" />
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <input type="checkbox" id="available" checked={itemForm.available} onChange={e => setItemForm(f => ({ ...f, available: e.target.checked }))} className="w-4 h-4 accent-[#2D5016]" />
                        <label htmlFor="available" className="text-sm text-[#555]">Disponível no cardápio</label>
                      </div>
                    </div>
                    <Button type="submit" fullWidth loading={savingItem} size="sm">
                      <Check size={15} /> {editingItem ? 'Salvar alterações' : 'Adicionar ao cardápio'}
                    </Button>
                  </form>
                )}

                {loadingMenu ? (
                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-14" />)}</div>
                ) : menuItems.length === 0 ? (
                  <p className="text-sm text-[#aaa] text-center py-8">Nenhum item ainda. Adicione o primeiro!</p>
                ) : (
                  <div className="space-y-2">
                    {menuItems.map(item => (
                      <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border ${item.available ? 'border-gray-100 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                        {item.image_url && <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-lg shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-[#1a1a1a] truncate">{item.name}</p>
                          <p className="text-xs text-[#6BA534]">{item.category} · R$ {Number(item.price).toFixed(2).replace('.', ',')}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => openEditItem(item)} className="w-8 h-8 flex items-center justify-center text-[#aaa] hover:text-[#2D5016] transition-colors"><Pencil size={15} /></button>
                          <button onClick={() => handleDeleteItem(item.id)} className="w-8 h-8 flex items-center justify-center text-[#aaa] hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── ABA PROMOÇÕES ── */}
            {tab === 'promocoes' && (
              <PromotionsTab
                restaurantId={restaurant.id}
                promotions={promotions}
                menuItems={menuItems}
                onCreate={createPromo}
                onUpdate={updatePromo}
                onToggle={togglePromo}
                onRemove={removePromo}
              />
            )}

            {/* ── ABA DADOS ── */}
            {tab === 'dados' && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="font-bold text-[#1a1a1a] mb-5 flex items-center gap-2">
                  <Settings size={18} className="text-[#6BA534]" /> Dados do estabelecimento
                </h2>
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#333] mb-2">Categoria *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map(c => {
                        const Icon = c.icon;
                        const active = form.category === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, category: c.id }))}
                            className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                              active
                                ? 'border-[#2D5016] bg-[#e8f5e0] text-[#2D5016]'
                                : 'border-gray-200 bg-white text-[#666] hover:border-gray-300'
                            }`}
                          >
                            <Icon size={17} className={active ? 'text-[#2D5016]' : 'text-[#aaa]'} />
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <InputField label="Nome *" placeholder="Ex: Fit Grill Floresta" {...field('name')} required />
                  <InputField label="Descrição" placeholder="Uma breve descrição" {...field('description')} />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-[#333] mb-1.5 flex items-center gap-1"><Clock size={13} className="text-[#6BA534]" /> Abre às</label>
                      <input type="time" value={form.open_time} onChange={e => setForm(f => ({ ...f, open_time: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#333] mb-1.5 flex items-center gap-1"><Clock size={13} className="text-[#6BA534]" /> Fecha às</label>
                      <input type="time" value={form.close_time} onChange={e => setForm(f => ({ ...f, close_time: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#333] mb-1.5 flex items-center gap-1"><MapPin size={13} className="text-[#6BA534]" /> Endereço</label>
                    <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Rua, número, bairro"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#333] mb-1.5 flex items-center gap-1"><Phone size={13} className="text-[#6BA534]" /> Telefone / WhatsApp</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(87) 99999-9999"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all" />
                  </div>
                  <ImageUpload currentUrl={form.image_url || null} onUpload={url => setForm(f => ({ ...f, image_url: url }))} onRemove={() => setForm(f => ({ ...f, image_url: '' }))} folder="restaurantes" aspectRatio="aspect-video" />

                  {/* Pagamentos online — token Mercado Pago do próprio restaurante */}
                  <div className="border border-[#e8f5e0] rounded-2xl p-4 bg-[#f9fdf6] space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-[#2D5016] flex items-center gap-2">
                        <Wallet size={16} /> Pagamentos online
                      </h3>
                      {mpConfigured ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-[#2D5016] bg-[#e8f5e0] px-2.5 py-1 rounded-full">
                          <CheckCircle2 size={13} /> Configurado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
                          <AlertCircle size={13} /> Pendente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#777] leading-relaxed">
                      Para receber pagamentos online (Pix e cartão de crédito) diretamente na sua conta,
                      conecte seu <strong>Access Token de Produção</strong> do Mercado Pago. Sem isso,
                      seu restaurante não poderá receber pedidos com pagamento online.
                    </p>
                    <div>
                      <label className="block text-xs font-semibold text-[#333] mb-1">Access Token (Mercado Pago)</label>
                      <div className="relative">
                        <input
                          type={showToken ? 'text' : 'password'}
                          value={mpTokenInput}
                          onChange={e => setMpTokenInput(e.target.value)}
                          autoComplete="off"
                          placeholder={mpConfigured ? 'Token salvo — cole um novo para trocar' : 'APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                          className="w-full border border-gray-200 rounded-xl pl-4 pr-10 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all font-mono"
                        />
                        <button type="button" onClick={() => setShowToken(s => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#555] transition-colors">
                          {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#333] mb-1">Public Key (Mercado Pago) — para cartão no app</label>
                      <input
                        value={form.mp_public_key}
                        onChange={e => setForm(f => ({ ...f, mp_public_key: e.target.value }))}
                        autoComplete="off"
                        placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all font-mono"
                      />
                      <p className="mt-1 text-[11px] text-[#999]">Fica na mesma tela de credenciais do Access Token. Sem ela, seus clientes pagam só com Pix.</p>
                    </div>
                    <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2D5016] hover:underline">
                      <ExternalLink size={13} /> Não tem um token? Crie sua aplicação gratuita no Mercado Pago
                    </a>
                    <ol className="text-xs text-[#888] list-decimal list-inside space-y-0.5 pl-1">
                      <li>Crie uma conta gratuita no Mercado Pago (CPF ou CNPJ)</li>
                      <li>Acesse o painel de desenvolvedores e clique em "Criar aplicação"</li>
                      <li>Escolha "Pagamentos online" como modelo de integração</li>
                      <li>Copie o <strong>Access Token</strong> e a <strong>Public Key</strong> de Produção (começam com <code>APP_USR-</code>)</li>
                      <li>Cole nos campos acima e salve</li>
                    </ol>
                  </div>

                  <Button type="submit" fullWidth loading={saving} size="lg">Salvar alterações</Button>
                </form>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: aba de Promoções
// ─────────────────────────────────────────────────────────────────────────────

type PromoForm = {
  menu_item_id: string;
  title: string; description: string; type: Promotion['type'];
  badge: string; original_price: string; promo_price: string; discount: string; ends_at: string;
};

const EMPTY_PROMO: PromoForm = {
  menu_item_id: '', title: '', description: '', type: 'promo',
  badge: '', original_price: '', promo_price: '', discount: '', ends_at: '',
};

const brl = (n: number) => `R$ ${Number(n).toFixed(2).replace('.', ',')}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

// "Válida até" é o fim do dia escolhido, no horário de Brasília.
const endOfDayBrasilia = (date: string) => new Date(`${date}T23:59:59-03:00`).toISOString();
const toDateInput = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) : '';

function promoStatus(p: Promotion): { label: string; cls: string } {
  if (!p.is_active) return { label: 'Pausada', cls: 'bg-gray-100 text-[#888]' };
  if (p.ends_at && new Date(p.ends_at).getTime() <= Date.now()) return { label: 'Encerrada', cls: 'bg-red-50 text-red-500' };
  return { label: 'Ativa', cls: 'bg-[#e8f5e0] text-[#2D5016]' };
}

function PromotionsTab({ restaurantId, promotions, menuItems, onCreate, onUpdate, onToggle, onRemove }: {
  restaurantId: string;
  promotions: Promotion[];
  menuItems: MenuItem[];
  onCreate: (v: any) => Promise<any>;
  onUpdate: (id: string, v: Partial<Promotion>) => Promise<any>;
  onToggle: (id: string, active: boolean) => Promise<any>;
  onRemove: (id: string) => Promise<void>;
}) {
  // null = fechado · 'new' = criando · id = editando
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<PromoForm>(EMPTY_PROMO);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const linkedItem = menuItems.find(i => i.id === form.menu_item_id) ?? null;
  const basePrice = linkedItem ? Number(linkedItem.price) : Number(form.original_price) || 0;
  const promoNum = Number(form.promo_price) || 0;
  const autoBadge = basePrice > 0 && promoNum > 0 && promoNum < basePrice
    ? `${Math.round((1 - promoNum / basePrice) * 100)}% OFF` : '';

  const openNew = () => { setForm(EMPTY_PROMO); setEditing('new'); };
  const openEdit = (p: Promotion) => {
    const item = menuItems.find(i => i.id === p.menu_item_id);
    const base = item ? Number(item.price) : Number(p.original_price) || 0;
    setForm({
      menu_item_id: item ? item.id : '',
      title: p.title,
      description: p.description ?? '',
      type: p.type,
      badge: p.badge ?? '',
      original_price: p.original_price != null ? String(p.original_price) : '',
      promo_price: p.promo_price != null ? String(p.promo_price) : '',
      discount: base > 0 && p.promo_price ? String(Math.round((1 - Number(p.promo_price) / base) * 100)) : '',
      ends_at: toDateInput(p.ends_at),
    });
    setEditing(p.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const close = () => { setEditing(null); setForm(EMPTY_PROMO); };

  const pickItem = (id: string) => {
    const item = menuItems.find(i => i.id === id);
    setForm(f => {
      const next = { ...f, menu_item_id: id };
      if (!item) return next;
      const base = Number(item.price);
      // Mantém o % de desconto já digitado ao trocar de item.
      const pct = Number(f.discount);
      return {
        ...next,
        title: f.title.trim() && f.title !== menuItems.find(i => i.id === f.menu_item_id)?.name ? f.title : item.name,
        original_price: String(base),
        promo_price: pct > 0 && pct < 100 ? String(round2(base * (1 - pct / 100))) : f.promo_price,
      };
    });
  };

  const setDiscount = (v: string) => {
    const pct = Number(v);
    setForm(f => ({
      ...f, discount: v,
      promo_price: basePrice > 0 && pct > 0 && pct < 100 ? String(round2(basePrice * (1 - pct / 100))) : f.promo_price,
    }));
  };
  const setPromoPrice = (v: string) => {
    const price = Number(v);
    setForm(f => ({
      ...f, promo_price: v,
      discount: basePrice > 0 && price > 0 && price < basePrice ? String(Math.round((1 - price / basePrice) * 100)) : '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim() || linkedItem?.name || '';
    if (!title) { toast.error('Informe o título da promoção'); return; }
    if (linkedItem && !(promoNum > 0 && promoNum < Number(linkedItem.price))) {
      toast.error(`O preço promocional precisa ser menor que ${brl(Number(linkedItem.price))}.`);
      return;
    }
    const values = {
      title,
      description: form.description.trim() || null,
      type: form.type,
      badge: form.badge.trim() || autoBadge || null,
      menu_item_id: linkedItem?.id ?? null,
      original_price: linkedItem ? Number(linkedItem.price) : (form.original_price ? Number(form.original_price) : null),
      promo_price: form.promo_price ? round2(Number(form.promo_price)) : null,
      image_url: linkedItem?.image_url ?? null,
      ends_at: form.ends_at ? endOfDayBrasilia(form.ends_at) : null,
    };
    setSaving(true);
    try {
      if (editing && editing !== 'new') {
        await onUpdate(editing, values);
        toast.success('Promoção atualizada!');
      } else {
        await onCreate({ ...values, restaurant_id: restaurantId, starts_at: new Date().toISOString(), is_active: true });
        toast.success(linkedItem ? `Promoção publicada! ${linkedItem.name} já aparece com o novo preço.` : 'Promoção publicada!');
      }
      close();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remover esta promoção?')) return;
    setBusyId(id);
    try { await onRemove(id); toast.success('Promoção removida.'); if (editing === id) close(); }
    catch (err: any) { toast.error(err.message); }
    finally { setBusyId(null); }
  };

  const handleToggle = async (p: Promotion) => {
    setBusyId(p.id);
    try {
      await onToggle(p.id, !p.is_active);
      toast.success(p.is_active ? 'Promoção pausada.' : 'Promoção ativada!');
    } catch (err: any) { toast.error(err.message); }
    finally { setBusyId(null); }
  };

  const TYPE_LABEL: Record<string, string> = { promo: 'Promoção', combo: 'Combo', desconto: 'Desconto' };
  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all';
  const availableItems = menuItems.filter(i => i.available || i.id === form.menu_item_id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[#1a1a1a] flex items-center gap-2">
          <Tag size={18} className="text-[#6BA534]" /> Promoções
          <span className="text-xs font-normal text-[#aaa]">({promotions.length})</span>
        </h2>
        {editing === null && (
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-[#2D5016] hover:bg-[#3d6b1e] px-3 py-2 rounded-xl transition-colors"
          >
            <Plus size={15} /> Nova promoção
          </button>
        )}
      </div>

      {/* Formulário (criar / editar) */}
      {editing !== null && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-5 space-y-4 border border-[#e8f5e0] animate-scale-in">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#2D5016]">{editing === 'new' ? 'Nova promoção' : 'Editar promoção'}</h3>
            <button type="button" onClick={close} aria-label="Fechar" className="w-8 h-8 rounded-full flex items-center justify-center text-[#999] hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>

          {/* Item do cardápio */}
          <div>
            <label className="text-xs font-semibold text-[#555] mb-1 block">Item do cardápio em promoção</label>
            <select value={form.menu_item_id} onChange={e => pickItem(e.target.value)} className={inputCls}>
              <option value="">Nenhum: só divulgação (combo, aviso…)</option>
              {availableItems.map(i => (
                <option key={i.id} value={i.id}>{i.name} — {brl(Number(i.price))}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-[#999]">
              {linkedItem
                ? 'Enquanto a promoção estiver ativa, o item aparece no cardápio com o novo preço e o cliente paga esse valor.'
                : 'Sem item, a promoção só aparece como destaque e não muda nenhum preço.'}
            </p>
          </div>

          {/* Preço */}
          {linkedItem ? (
            <div className="rounded-xl bg-[#f7faf4] border border-[#e8f5e0] p-3 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#777]">Preço normal</span>
                <span className="font-bold text-[#1a1a1a]">{brl(Number(linkedItem.price))}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#555] mb-1 block">Desconto (%)</label>
                  <input type="number" inputMode="numeric" min="1" max="99" value={form.discount}
                    onChange={e => setDiscount(e.target.value)} placeholder="Ex: 20" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#555] mb-1 block">Preço promocional (R$) *</label>
                  <input type="number" inputMode="decimal" step="0.01" value={form.promo_price}
                    onChange={e => setPromoPrice(e.target.value)} placeholder="Ex: 19.90" className={inputCls} />
                </div>
              </div>
              {autoBadge && (
                <p className="text-xs text-[#2D5016]">
                  Cliente vê <span className="line-through text-[#aaa]">{brl(basePrice)}</span>{' '}
                  <strong className="text-orange-500">{brl(promoNum)}</strong> · economia de {brl(basePrice - promoNum)}
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#555] mb-1 block">Preço original (R$)</label>
                <input type="number" inputMode="decimal" step="0.01" value={form.original_price}
                  onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))} placeholder="Ex: 25.00" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#555] mb-1 block">Preço promocional (R$)</label>
                <input type="number" inputMode="decimal" step="0.01" value={form.promo_price}
                  onChange={e => setForm(f => ({ ...f, promo_price: e.target.value }))} placeholder="Ex: 19.90" className={inputCls} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-[#555] mb-1 block">Título {linkedItem ? '' : '*'}</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={linkedItem ? linkedItem.name : 'Ex: Combo do dia, 2 por 1 no almoço...'} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#555] mb-1 block">Tipo</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Promotion['type'] }))} className={inputCls}>
                <option value="promo">Promoção</option>
                <option value="combo">Combo</option>
                <option value="desconto">Desconto</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#555] mb-1 block">Selo</label>
              <input value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))}
                placeholder={autoBadge || 'Ex: 20% OFF, COMBO'} className={inputCls} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-semibold text-[#555] mb-1 flex items-center gap-1"><Calendar size={11} /> Válida até (opcional)</label>
              <input type="date" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-[#555] mb-1 block">Descrição</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Itens incluídos, regras, horários..." rows={2} className={`${inputCls} resize-none`} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" loading={saving} size="sm">{editing === 'new' ? 'Publicar promoção' : 'Salvar alterações'}</Button>
            <button type="button" onClick={close} className="px-4 py-2 text-sm text-[#777] hover:text-[#333] transition-colors">Cancelar</button>
          </div>
        </form>
      )}

      {/* Lista */}
      {promotions.length === 0 && editing === null ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
          <Tag size={32} className="mx-auto text-[#ddd] mb-3" />
          <p className="text-sm text-[#bbb]">Nenhuma promoção criada ainda.</p>
          <p className="text-xs text-[#ccc] mt-1">Escolha um item do cardápio e dê um desconto para atrair mais clientes!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map(p => {
            const item = menuItems.find(i => i.id === p.menu_item_id);
            const st = promoStatus(p);
            const busy = busyId === p.id;
            return (
              <div key={p.id} className={`bg-white rounded-2xl shadow-sm p-4 ${editing === p.id ? 'ring-2 ring-[#2D5016]/20' : ''}`}>
                <div className="flex items-start gap-3">
                  {(item?.image_url || p.image_url) && (
                    <img src={item?.image_url ?? p.image_url ?? ''} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#1a1a1a]">{p.title}</span>
                      {p.badge && <span className="text-[10px] font-black bg-orange-50 text-orange-500 px-1.5 py-0.5 rounded-full">{p.badge}</span>}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-[11px] text-[#999] mt-0.5">
                      {p.menu_item_id
                        ? (item ? <>No cardápio: <strong className="text-[#555]">{item.name}</strong></> : 'Item do cardápio')
                        : `${TYPE_LABEL[p.type]} · só divulgação`}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {p.promo_price != null && (
                        <>
                          {(item?.price ?? p.original_price) != null && (
                            <span className="text-xs text-[#bbb] line-through">{brl(Number(item?.price ?? p.original_price))}</span>
                          )}
                          <span className="text-sm font-black text-[#2D5016]">{brl(Number(p.promo_price))}</span>
                        </>
                      )}
                      {p.ends_at && (
                        <span className="text-[11px] text-[#999] flex items-center gap-0.5">
                          <Calendar size={10} /> até {new Date(p.ends_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                  <button onClick={() => handleToggle(p)} disabled={busy}
                    className={`flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 ${p.is_active ? 'bg-gray-100 text-[#555] hover:bg-gray-200' : 'bg-[#e8f5e0] text-[#2D5016] hover:bg-[#d8eecb]'}`}>
                    {p.is_active ? <><EyeOff size={14} /> Pausar</> : <><Eye size={14} /> Ativar</>}
                  </button>
                  <button onClick={() => openEdit(p)} disabled={busy}
                    className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-[#2D5016] text-white hover:bg-[#3d6b1e] transition-colors disabled:opacity-40">
                    <Pencil size={14} /> Editar
                  </button>
                  <button onClick={() => handleRemove(p.id)} disabled={busy} aria-label="Remover promoção"
                    className="w-9 h-9 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 transition-colors disabled:opacity-40 shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
