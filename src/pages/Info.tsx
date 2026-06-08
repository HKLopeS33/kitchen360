import { Link, useLocation, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { INFO_PAGES } from '../lib/infoContent';
import logo from '../assets/logo-icon.png';

export function Info() {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\//, '');
  const content = INFO_PAGES[slug];

  if (!content) return <Navigate to="/restaurantes" replace />;

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <header className="bg-white/90 backdrop-blur-md border-b border-[#e3ede0] sticky top-0 z-10 shadow-[0_1px_12px_rgba(45,80,22,0.06)]">
        <div className="max-w-2xl lg:max-w-3xl mx-auto safe-px py-4 flex items-center gap-3">
          <Link to="/restaurantes" className="text-[#555] hover:text-[#2D5016] transition-colors">
            <ArrowLeft size={22} />
          </Link>
          <Link to="/restaurantes" className="flex items-center gap-2">
            <img src={logo} alt="" className="h-8 w-auto object-contain" />
            <span className="font-black text-base text-[#2D5016] tracking-tight">Floresta Já</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl lg:max-w-3xl mx-auto safe-px py-8 animate-fade-in-up">
        <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(20,40,10,0.07)] p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-black text-[#1a1a1a] tracking-tight">{content.title}</h1>
          <p className="text-sm text-[#6BA534] font-semibold mt-1 mb-2">{content.subtitle}</p>
          <div className="border-t border-[#f0f2ec] mt-4 pt-4">
            {content.body}
          </div>
        </div>

        <p className="text-center text-xs text-[#bbb] mt-6">
          Floresta Já · Sabores de Floresta - PE, na sua porta
        </p>
      </main>
    </div>
  );
}
