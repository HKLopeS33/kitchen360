import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Leaf, MapPin, User, LogOut, Mail, Phone, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../helpers/useAuth';
import { Button } from '../components/Button';

export function ClientAccount() {
  const { user, updateProfile, updatePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [loading, setLoading] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Informe seu nome'); return; }
    setLoading(true);
    try {
      await updateProfile({ name: name.trim(), address: address.trim(), phone: phone.trim() });
      toast.success('Dados atualizados!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return; }
    if (newPassword !== confirmPassword) { toast.error('As senhas não coincidem'); return; }
    setPwLoading(true);
    try {
      await updatePassword(newPassword);
      toast.success('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar senha');
    } finally {
      setPwLoading(false);
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
            <Leaf size={18} className="text-[#6BA534]" /> Meu perfil
          </span>
        </div>
      </header>

      <main className="max-w-2xl lg:max-w-3xl mx-auto safe-px py-6 space-y-5">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-5 space-y-4 animate-fade-in-up">
          <h2 className="font-bold text-[#1a1a1a] text-sm">Dados de contato</h2>

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
              <Mail size={14} className="text-[#6BA534]" /> E-mail
            </label>
            <input
              value={user?.email ?? ''} disabled
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 text-[#999] outline-none"
            />
            <p className="text-xs text-[#aaa] mt-1">O e-mail de acesso não pode ser alterado por aqui.</p>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-[#333] mb-1.5">
              <Phone size={14} className="text-[#6BA534]" /> Telefone / WhatsApp
            </label>
            <input
              value={phone} onChange={e => setPhone(e.target.value)} placeholder="(87) 99999-9999"
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

        <form onSubmit={handlePasswordSubmit} className="bg-white rounded-2xl shadow-sm p-5 space-y-4 animate-fade-in-up">
          <h2 className="font-bold text-[#1a1a1a] text-sm flex items-center gap-1.5">
            <Lock size={14} className="text-[#6BA534]" /> Alterar senha
          </h2>
          <div>
            <label className="text-sm font-semibold text-[#333] mb-1.5 block">Nova senha</label>
            <input
              type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="Mínimo de 6 caracteres"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#333] mb-1.5 block">Confirmar nova senha</label>
            <input
              type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all"
            />
          </div>
          <Button type="submit" fullWidth loading={pwLoading} variant="secondary">Alterar senha</Button>
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
