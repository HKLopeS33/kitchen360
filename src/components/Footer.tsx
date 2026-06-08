import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';

const LINKS: { to: string; label: string }[] = [
  { to: '/ajuda', label: 'Central de Ajuda' },
  { to: '/suporte', label: 'Fale Conosco' },
  { to: '/parcerias', label: 'Parcerias' },
  { to: '/trabalhe-conosco', label: 'Trabalhe Conosco' },
  { to: '/privacidade', label: 'Política de Privacidade' },
];

export function Footer() {
  return (
    <footer className="border-t border-[#e3ede0] bg-white/60 mt-10">
      <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-[#e8f5e0] flex items-center justify-center">
            <Leaf size={14} className="text-[#2D5016]" />
          </div>
          <span className="font-black text-sm text-[#2D5016] tracking-tight">Floresta Já</span>
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-2 mb-5">
          {LINKS.map(l => (
            <Link key={l.to} to={l.to} className="text-xs font-semibold text-[#777] hover:text-[#2D5016] transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="text-[11px] text-[#bbb] leading-relaxed">
          © {new Date().getFullYear()} Floresta Já · Sabores de Floresta - PE, na sua porta.
          <br />
          Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
