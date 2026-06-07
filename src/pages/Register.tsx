import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Eye, EyeOff, User, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../helpers/useAuth';
import { Button } from '../components/Button';
import type { UserRole } from '../lib/supabase';

export function Register() {
  const { register, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);

  // Quando o perfil carregar após o cadastro, redireciona para o lugar certo
  useEffect(() => {
    if (!isLoading && user && pendingRole) {
      navigate(pendingRole === 'restaurant_owner' ? '/meu-restaurante' : '/restaurantes');
    }
  }, [user, isLoading, pendingRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Senha deve ter pelo menos 6 caracteres'); return; }
    setLoading(true);
    try {
      await register(name, email, password, role, role === 'client' ? address.trim() : undefined);
      setPendingRole(role);
      toast.success('Conta criada com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar conta');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5f0] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-2 text-[#2D5016] font-bold text-xl mb-8 animate-fade-in-up">
          <Leaf size={24} className="text-[#6BA534]" /> Floresta Já
        </Link>

        <div className="bg-white rounded-2xl shadow-lg p-8 animate-scale-in">
          <h1 className="text-2xl font-black text-[#1a1a1a] mb-1">Criar Conta</h1>
          <p className="text-sm text-[#6BA534] mb-6">Floresta - PE</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de conta */}
            <div>
              <label className="block text-sm font-semibold text-[#333] mb-2">Tipo de conta</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('client')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                    role === 'client'
                      ? 'border-[#2D5016] bg-[#e8f5e0] text-[#2D5016] glow-brand'
                      : 'border-gray-200 text-[#777] hover:border-[#bcd9a4]'
                  }`}
                >
                  <User size={20} />
                  Cliente
                </button>
                <button
                  type="button"
                  onClick={() => setRole('restaurant_owner')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                    role === 'restaurant_owner'
                      ? 'border-[#2D5016] bg-[#e8f5e0] text-[#2D5016] glow-brand'
                      : 'border-gray-200 text-[#777] hover:border-[#bcd9a4]'
                  }`}
                >
                  <UtensilsCrossed size={20} />
                  Restaurante
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#333] mb-1.5">
                {role === 'restaurant_owner' ? 'Seu nome' : 'Nome'}
              </label>
              <input
                value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome completo" required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all"
              />
            </div>
            {role === 'client' && (
              <div>
                <label className="block text-sm font-semibold text-[#333] mb-1.5">Endereço de entrega</label>
                <input
                  value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua, número, bairro..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all"
                />
                <p className="text-xs text-[#aaa] mt-1">Será usado automaticamente nos seus pedidos. Você pode alterá-lo depois.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-[#333] mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#333] mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres" required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#555]">
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <Button type="submit" fullWidth loading={loading} size="lg">
              {role === 'restaurant_owner' ? 'Cadastrar como Restaurante' : 'Criar Conta'}
            </Button>
          </form>

          <p className="text-center text-sm text-[#777] mt-5">
            Já tem conta?{' '}
            <Link to="/login" className="text-[#2D5016] font-semibold hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
