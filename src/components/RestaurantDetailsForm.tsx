import React, { useEffect, useState, type ReactNode } from 'react';
import { Clock, MapPin, Phone } from 'lucide-react';
import { Button } from './Button';
import { ImageUpload } from './ImageUpload';
import { CATEGORIES, type Category } from '../lib/categories';
import type { Restaurant } from '../lib/supabase';

export type RestaurantDetails = {
  name: string; description: string; phone: string; address: string;
  open_time: string; close_time: string; image_url: string | null;
  category: Category; free_shipping: boolean; promo_text: string | null;
  delivery_time_min: number; delivery_time_max: number;
};

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

const EMPTY = {
  name: '', description: '', phone: '', address: '',
  open_time: '08:00', close_time: '18:00', image_url: '',
  category: 'restaurante' as Category,
  free_shipping: false, promo_text: '', delivery_time_min: 30, delivery_time_max: 50,
};

/** Formulário com os dados do estabelecimento (cadastro e edição). */
export function RestaurantDetailsForm({ restaurant, onSubmit, submitLabel, submitDisabled, children }: {
  restaurant: Restaurant | null;
  onSubmit: (values: RestaurantDetails) => Promise<void>;
  submitLabel: string;
  submitDisabled?: boolean;
  /** Conteúdo extra antes do botão (ex.: aceite dos termos). */
  children?: ReactNode;
}) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!restaurant) return;
    setForm({
      name: restaurant.name ?? '',
      description: restaurant.description ?? '',
      phone: restaurant.phone ?? '',
      address: restaurant.address ?? '',
      open_time: (restaurant.open_time ?? '08:00').slice(0, 5),
      close_time: (restaurant.close_time ?? '18:00').slice(0, 5),
      image_url: restaurant.image_url ?? '',
      category: (restaurant.category as Category) ?? 'restaurante',
      free_shipping: restaurant.free_shipping ?? false,
      promo_text: restaurant.promo_text ?? '',
      delivery_time_min: restaurant.delivery_time_min ?? 30,
      delivery_time_max: restaurant.delivery_time_max ?? 50,
    });
  }, [restaurant]);

  const field = (key: 'name' | 'description') => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value })),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        name: form.name.trim(), description: form.description.trim(),
        phone: form.phone.trim(), address: form.address.trim(),
        open_time: form.open_time, close_time: form.close_time,
        image_url: form.image_url || null, category: form.category,
        free_shipping: form.free_shipping, promo_text: form.promo_text.trim() || null,
        delivery_time_min: Number(form.delivery_time_min) || 30,
        delivery_time_max: Number(form.delivery_time_max) || 50,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      {children}

      <Button type="submit" fullWidth loading={saving} size="lg" disabled={submitDisabled}>{submitLabel}</Button>
    </form>
  );
}
