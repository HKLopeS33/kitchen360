import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../helpers/useAuth';
import { Button } from '../components/Button';
import logo from '../assets/logo-icon.png';

export function Login() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // Se já está logado, redireciona para o lugar certo
  useEffect(() => {
    if (!isLoading && user) {
      navigate(
        user.role === 'admin' ? '/admin'
          : user.role === 'restaurant_owner' ? '/meu-restaurante'
          : '/restaurantes',
        { replace: true }
      );
    }
  }, [user, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Bem-vindo de volta!');
      // O useEffect acima vai redirecionar quando o user carregar
    } catch (err: any) {
      toast.error(err.message || 'Erro ao entrar');
      setLoading(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen relative flex items-center justify-center px-6 py-8 overflow-hidden bg-gradient-to-br from-[#1f3d0f] via-[#2D5016] to-[#4a8526]">
      {/* Formas decorativas de fundo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-80 h-80 rounded-full bg-[#6BA534]/25 blur-3xl" />
        <div className="absolute -bottom-40 -right-28 w-96 h-96 rounded-full bg-[#9fd66c]/20 blur-3xl" />
        <div className="absolute top-1/3 right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
        <Leaf size={140} className="absolute -bottom-8 -left-10 text-white/5 rotate-[-18deg]" />
        <Leaf size={100} className="absolute top-10 right-16 text-white/5 rotate-[24deg]" />
      </div>

      <div className="relative w-full max-w-sm mx-auto text-center">
        {/* Identidade visual / logo */}
        <div className="flex flex-col items-center mb-6 animate-fade-in-up px-2">
          <img src={logo} alt="Floresta Já" className="w-28 h-28 sm:w-32 sm:h-32 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] mb-2" />
          <h1 className="text-2xl font-black text-white tracking-tight">Floresta Já</h1>
          <p className="text-sm text-[#cfe9b8] font-medium mt-0.5 text-center leading-snug">Sabores de Floresta - PE, na sua porta</p>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_24px_64px_rgba(15,30,8,0.35)] p-6 sm:p-8 text-left animate-scale-in border border-white/40">
          <h2 className="text-2xl font-black text-[#1a1a1a] mb-1">Bem-vindo de volta</h2>
          <p className="text-sm text-[#6BA534] font-semibold mb-6">Entre na sua conta para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#333] mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" required
                className="w-full border-2 border-[#e3ede0] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#6BA534] focus:ring-4 focus:ring-[#6BA534]/12 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#333] mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="w-full border-2 border-[#e3ede0] rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-[#6BA534] focus:ring-4 focus:ring-[#6BA534]/12 transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#2D5016] transition-colors">
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <Button type="submit" fullWidth loading={loading} size="lg">Entrar</Button>
          </form>

          <p className="text-center text-sm text-[#777] mt-5">
            Não tem conta?{' '}
            <Link to="/register" className="text-[#2D5016] font-bold hover:underline">Criar conta</Link>
          </p>
        </div>

        <Link to="/restaurantes" className="block text-center text-sm text-[#cfe9b8] hover:text-white font-medium mt-6 transition-colors">
          ← Continuar explorando sem entrar
        </Link>
      </div>
    </div>
  );
}
