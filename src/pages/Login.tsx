import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../helpers/useAuth';
import { Button } from '../components/Button';

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
      navigate(user.role === 'restaurant_owner' ? '/meu-restaurante' : '/restaurantes', { replace: true });
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
    <div className="min-h-screen bg-[#f7f5f0] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link to="/restaurantes" className="flex items-center justify-center gap-2 text-[#2D5016] font-bold text-xl mb-8">
          <Leaf size={24} className="text-[#6BA534]" /> Cardápio Fitness
        </Link>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-black text-[#1a1a1a] mb-1">Entrar</h1>
          <p className="text-sm text-[#6BA534] mb-6">Floresta - PE</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#333] mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#333] mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#555]">
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <Button type="submit" fullWidth loading={loading} size="lg">Entrar</Button>
          </form>

          <p className="text-center text-sm text-[#777] mt-5">
            Não tem conta?{' '}
            <Link to="/register" className="text-[#2D5016] font-semibold hover:underline">Criar conta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
