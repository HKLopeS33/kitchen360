import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import logo from '../assets/logo-icon.png';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Informe seu e-mail'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://kitchen360app.netlify.app/redefinir-senha',
      });
      if (error) throw new Error(error.message);
      setSent(true);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar e-mail');
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
          {sent ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-[#e8f5e0] flex items-center justify-center mx-auto">
                <Mail size={26} className="text-[#2D5016]" />
              </div>
              <h2 className="text-xl font-black text-[#1a1a1a]">E-mail enviado!</h2>
              <p className="text-sm text-[#666] leading-relaxed">
                Enviamos um link de redefinição para <strong className="text-[#2D5016]">{email}</strong>.
                Verifique sua caixa de entrada e spam.
              </p>
              <Link to="/login"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#2D5016] hover:underline mt-2">
                <ArrowLeft size={14} /> Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-black text-[#1a1a1a] mb-1 text-center">Esqueceu a senha?</h2>
              <p className="text-sm text-[#6BA534] font-semibold mb-6 text-center">
                Informe seu e-mail e enviaremos um link para redefinir
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#333] mb-1.5">E-mail cadastrado</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com" required
                    className="w-full border-2 border-[#e3ede0] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#6BA534] focus:ring-4 focus:ring-[#6BA534]/12 transition-all"
                  />
                </div>
                <Button type="submit" fullWidth loading={loading} size="lg">Enviar link de redefinição</Button>
              </form>
              <p className="text-center text-sm text-[#777] mt-5">
                Lembrou?{' '}
                <Link to="/login" className="text-[#2D5016] font-bold hover:underline">Entrar</Link>
              </p>
            </>
          )}
        </div>

        <Link to="/restaurantes" className="block text-center text-sm text-[#cfe9b8] hover:text-white font-medium mt-6 transition-colors">
          ← Continuar explorando sem entrar
        </Link>
      </div>
    </div>
  );
}
