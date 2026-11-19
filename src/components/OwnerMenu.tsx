import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, User, Settings, CreditCard, LogOut, Store } from 'lucide-react';
import { useAuth } from '../helpers/useAuth';

/** Menu da conta do estabelecimento (avatar no canto do topo). */
export function OwnerMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  if (!user) return null;

  const item = 'flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#444] hover:bg-[#f7f5f0]';
  const links = [
    { to: '/meu-restaurante', label: 'Painel', icon: LayoutDashboard },
    { to: '/meus-dados', label: 'Meu perfil', icon: User },
    { to: '/configuracoes', label: 'Configurações', icon: Settings },
    { to: '/assinatura', label: 'Assinatura', icon: CreditCard },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Minha conta"
        aria-expanded={open}
        className="flex items-center gap-1 h-10 pl-1 pr-2 rounded-full bg-[#f1f5ec] hover:bg-[#e3ede0] text-[#2D5016]"
      >
        <span className="w-8 h-8 rounded-full bg-[#2D5016] text-white text-sm font-bold flex items-center justify-center uppercase">
          {user.name?.trim()?.[0] ?? <User size={15} />}
        </span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-gray-100 py-1.5 z-[60] animate-scale-in">
          <div className="px-4 py-2.5 border-b border-gray-100 mb-1">
            <p className="text-sm font-bold text-[#1a1a1a] truncate">{user.name ?? 'Minha conta'}</p>
            <p className="text-[11px] text-[#888] truncate">{user.email}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#2D5016] bg-[#e8f5e0] px-2 py-0.5 rounded-full">
              <Store size={11} /> Estabelecimento
            </p>
          </div>
          {links.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} className={item}>
              <Icon size={15} className="text-[#6BA534]" /> {label}
            </Link>
          ))}
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={async () => { setOpen(false); await logout(); navigate('/login'); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
          >
            <LogOut size={15} /> Sair
          </button>
        </div>
      )}
    </div>
  );
}
