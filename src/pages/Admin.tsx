import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/Button';
import { useAuth } from '../helpers/useAuth';
import { useDishes } from '../helpers/useDishes';
import { useOrders, type OrderStatus } from '../helpers/useOrders';
import { type Dish, type DishCategory, CATEGORY_LABELS } from '../data/dishes';

type Tab = 'dishes' | 'orders';

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'preparing', label: 'Preparando' },
  { value: 'on_the_way', label: 'A caminho' },
  { value: 'delivered', label: 'Entregue' },
];

const EMPTY_DISH: Omit<Dish, 'id'> = {
  name: '', description: '', category: 'lunch', image_url: '',
  price: 0, calories: 0, protein: 0, carbs: 0, fat: 0, available: true,
};

export function Admin() {
  const { user, isLoading } = useAuth();
  const { dishes, createDish, updateDish, deleteDish } = useDishes();
  const { getAllOrders, updateStatus } = useOrders();
  const [tab, setTab] = useState<Tab>('dishes');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_DISH);

  if (isLoading) return null;
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;

  const orders = getAllOrders().sort((a, b) => b.id - a.id);

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return; }
    if (editId !== null) {
      updateDish(editId, form);
      toast.success('Prato atualizado!');
    } else {
      createDish(form);
      toast.success('Prato criado!');
    }
    setShowForm(false); setEditId(null); setForm(EMPTY_DISH);
  };

  const handleEdit = (d: Dish) => {
    const { id, ...rest } = d;
    setForm(rest); setEditId(id); setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (!confirm('Remover este prato?')) return;
    deleteDish(id); toast.success('Prato removido');
  };

  const field = (key: keyof typeof form, type = 'text') => ({
    value: form[key] as string | number,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: type === 'number' ? +e.target.value : e.target.value })),
    className: 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10',
  });

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-[#1a1a1a] mb-8">Painel Admin</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {(['dishes', 'orders'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-[#2D5016] text-white' : 'bg-white text-[#555] hover:bg-[#e8f5e0]'}`}>
              {t === 'dishes' ? '🍽️ Pratos' : '📦 Pedidos'}
            </button>
          ))}
        </div>

        {tab === 'dishes' && (
          <>
            <div className="flex justify-end mb-4">
              <Button onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_DISH); }} size="sm">
                <Plus size={16} /> Novo Prato
              </Button>
            </div>

            {showForm && (
              <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                <h2 className="font-bold text-[#1a1a1a] mb-4">{editId ? 'Editar Prato' : 'Novo Prato'}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[#555] mb-1">Nome</label>
                    <input {...field('name')} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[#555] mb-1">Descrição</label>
                    <input {...field('description')} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[#555] mb-1">URL da Imagem</label>
                    <input {...field('image_url')} placeholder="https://..." />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#555] mb-1">Categoria</label>
                    <select {...field('category')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 bg-white">
                      {(['breakfast','lunch','dinner','snack'] as DishCategory[]).map(c => (
                        <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#555] mb-1">Preço (R$)</label>
                    <input type="number" step="0.01" {...field('price', 'number')} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#555] mb-1">Calorias (kcal)</label>
                    <input type="number" {...field('calories', 'number')} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#555] mb-1">Proteína (g)</label>
                    <input type="number" {...field('protein', 'number')} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#555] mb-1">Carbs (g)</label>
                    <input type="number" {...field('carbs', 'number')} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#555] mb-1">Gordura (g)</label>
                    <input type="number" {...field('fat', 'number')} />
                  </div>
                </div>
                <div className="flex gap-2 mt-5 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditId(null); }}>
                    <X size={15} /> Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Check size={15} /> Salvar
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#f7f5f0] text-[#555] text-xs font-semibold">
                  <tr>
                    <th className="text-left px-4 py-3">Prato</th>
                    <th className="text-left px-4 py-3">Categoria</th>
                    <th className="text-right px-4 py-3">Preço</th>
                    <th className="text-right px-4 py-3">Kcal</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dishes.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-[#1a1a1a]">{d.name}</td>
                      <td className="px-4 py-3 text-[#666]">{CATEGORY_LABELS[d.category]}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#2D5016]">R$ {d.price.toFixed(2).replace('.', ',')}</td>
                      <td className="px-4 py-3 text-right text-[#888]">{d.calories}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => updateDish(d.id, { available: !d.available })}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${d.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {d.available ? 'Disponível' : 'Inativo'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => handleEdit(d)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-400 hover:text-blue-600 transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(d.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-300 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 && <p className="text-center text-[#888] py-10">Nenhum pedido ainda.</p>}
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-[#1a1a1a]">Pedido #{order.id.toString().slice(-6)}</p>
                    <p className="text-xs text-[#888]">{new Date(order.created_at).toLocaleDateString('pt-BR')} · R$ {order.total.toFixed(2).replace('.', ',')}</p>
                    <p className="text-xs text-[#666] mt-1">📍 {order.delivery_address} · {order.delivery_date} às {order.delivery_time}</p>
                  </div>
                  <select
                    value={order.status}
                    onChange={e => { updateStatus(order.id, e.target.value as OrderStatus); toast.success('Status atualizado'); }}
                    className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#2D5016] bg-white font-semibold"
                  >
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1 border-t border-gray-100 pt-3">
                  {order.items.map((item, i) => (
                    <p key={i} className="text-sm text-[#555]">{item.quantity}× {item.dish_name} — R$ {(item.unit_price * item.quantity).toFixed(2).replace('.', ',')}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
