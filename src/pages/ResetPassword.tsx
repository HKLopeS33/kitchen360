import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import logo from '../assets/logo-icon.png';

export function ResetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // O Supabase redireciona para esta página com o token na URL (hash).
  // O SDK detecta automaticamente o evento PASSWORD_RECOVERY e configura a sessão.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return; }
    if (newPassword !== confirmPassword) { toast.error('As senhas não coincidem'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
      toast.success('Senha redefinida com sucesso! Faça login.');
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-6 py-8 overflow-hidden bg-gradient-to-br from-[#1f3d0f] via-[#2D5016] to-[#4a8526]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-80 h-80 rounded-full bg-[#6BA534]/25 blur-3xl" />
        <div className="absolute -bottom-40 -right-28 w-96 h-96 rounded-full bg-[#9fd66c]/20 blur-3xl" />
        <Leaf size={140} className="absolute -bottom-8 -left-10 text-white/5 rotate-[-18deg]" />
        <Leaf size={100} className="absolute top-10 right-16 text-white/5 rotate-[24deg]" />
      </div>

      <div className="relative w-full max-w-sm mx-auto text-center">
        <div className="flex flex-col items-center mb-6 animate-fade-in-up px-2">
          <img src={logo} alt="Floresta Já" className="w-28 h-28 sm:w-32 sm:h-32 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] mb-2" />
          <h1 className="text-2xl font-black text-white tracking-tight">Floresta Já</h1>
          <p className="text-sm text-[#cfe9b8] font-medium mt-0.5 text-center leading-snug">Sabores de Floresta - PE, na sua porta</p>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_24px_64px_rgba(15,30,8,0.35)] p-6 sm:p-8 text-left animate-scale-in border border-white/40">
          {!ready ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mx-auto">
                <Lock size={26} className="text-orange-400" />
              </div>
              <h2 className="text-xl font-black text-[#1a1a1a]">Link inválido ou expirado</h2>
              <p className="text-sm text-[#666] leading-relaxed">
                Este link pode ter expirado. Solicite um novo link de redefinição.
              </p>
              <Link to="/esqueci-senha"
                className="inline-block mt-2 text-sm font-bold text-[#2D5016] hover:underline">
                Reenviar link
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-black text-[#1a1a1a] mb-1 text-center">Nova senha</h2>
              <p className="text-sm text-[#6BA534] font-semibold mb-6 text-center">
                Escolha uma nova senha para sua conta
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#333] mb-1.5">Nova senha</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'} value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Mínimo de 6 caracteres" required
                      className="w-full border-2 border-[#e3ede0] rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-[#6BA534] focus:ring-4 focus:ring-[#6BA534]/12 transition-all"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#2D5016] transition-colors">
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#333] mb-1.5">Confirmar nova senha</label>
                  <input
                    type="password" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha" required
                    className="w-full border-2 border-[#e3ede0] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#6BA534] focus:ring-4 focus:ring-[#6BA534]/12 transition-all"
                  />
                </div>
                <Button type="submit" fullWidth loading={loading} size="lg">Redefinir senha</Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
