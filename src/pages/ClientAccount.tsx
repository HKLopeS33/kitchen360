import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Leaf, MapPin, User, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../helpers/useAuth';
import { Button } from '../components/Button';

export function ClientAccount() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Informe seu nome'); return; }
    setLoading(true);
    try {
      await updateProfile({ name: name.trim(), address: address.trim() });
      toast.success('Dados atualizados!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/restaurantes');
  };

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl lg:max-w-3xl mx-auto safe-px py-4 flex items-center gap-3">
          <Link to="/restaurantes" className="text-[#555] hover:text-[#1a1a1a]">
            <ArrowLeft size={22} />
          </Link>
          <span className="font-bold text-[#1a1a1a] flex items-center gap-2">
            <Leaf size={18} className="text-[#6BA534]" /> Meus dados
          </span>
        </div>
      </header>

      <main className="max-w-2xl lg:max-w-3xl mx-auto safe-px py-6 space-y-5">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-5 space-y-4 animate-fade-in-up">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-[#333] mb-1.5">
              <User size={14} className="text-[#6BA534]" /> Nome
            </label>
            <input
              value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome completo"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-[#333] mb-1.5">
              <MapPin size={14} className="text-[#6BA534]" /> Endereço de entrega
            </label>
            <textarea
              value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua, número, bairro, complemento..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all resize-none"
            />
            <p className="text-xs text-[#aaa] mt-1">Esse endereço será preenchido automaticamente nos seus pedidos.</p>
          </div>
          <Button type="submit" fullWidth loading={loading}>Salvar alterações</Button>
        </form>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-white text-red-500 font-semibold px-6 py-3 rounded-xl shadow-sm hover:bg-red-50 hover:shadow-md active:scale-[0.98] transition-all animate-fade-in-up"
        >
          <LogOut size={16} /> Sair da conta
        </button>
      </main>
    </div>
  );
}
