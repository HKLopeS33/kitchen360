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
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-[#1f3d0f] via-[#2D5016] to-[#4a8526]">
      {/* Formas decorativas de fundo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-24 w-80 h-80 rounded-full bg-[#6BA534]/25 blur-3xl" />
        <div className="absolute -bottom-40 -left-28 w-96 h-96 rounded-full bg-[#9fd66c]/20 blur-3xl" />
        <Leaf size={140} className="absolute -bottom-8 -right-10 text-white/5 rotate-[18deg]" />
        <Leaf size={100} className="absolute top-10 left-16 text-white/5 rotate-[-24deg]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 animate-fade-in-up">
          <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
            <Leaf size={40} className="text-[#bfe8a0]" strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Floresta Já</h1>
          <p className="text-sm text-[#cfe9b8] font-medium mt-0.5">Crie sua conta e peça já</p>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_24px_64px_rgba(15,30,8,0.35)] p-8 animate-scale-in border border-white/40">
          <h2 className="text-2xl font-black text-[#1a1a1a] mb-1">Criar conta</h2>
          <p className="text-sm text-[#6BA534] font-semibold mb-6">Floresta - PE</p>

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
                className="w-full border-2 border-[#e3ede0] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#6BA534] focus:ring-4 focus:ring-[#6BA534]/12 transition-all"
              />
            </div>
            {role === 'client' && (
              <div>
                <label className="block text-sm font-semibold text-[#333] mb-1.5">Endereço de entrega</label>
                <input
                  value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua, número, bairro..."
                  className="w-full border-2 border-[#e3ede0] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#6BA534] focus:ring-4 focus:ring-[#6BA534]/12 transition-all"
                />
                <p className="text-xs text-[#aaa] mt-1">Será usado automaticamente nos seus pedidos. Você pode alterá-lo depois.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-[#333] mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required
                className="w-full border-2 border-[#e3ede0] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#6BA534] focus:ring-4 focus:ring-[#6BA534]/12 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#333] mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres" required
                  className="w-full border-2 border-[#e3ede0] rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-[#6BA534] focus:ring-4 focus:ring-[#6BA534]/12 transition-all"
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

        <Link to="/restaurantes" className="block text-center text-sm text-[#cfe9b8] hover:text-white font-medium mt-6 transition-colors">
          ← Continuar explorando sem entrar
        </Link>
      </div>
    </div>
  );
}
