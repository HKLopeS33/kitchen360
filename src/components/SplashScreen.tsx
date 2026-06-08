import { useEffect, useState } from 'react';
import logo from '../assets/logo-icon.png';

/**
 * Splash de abertura exibido brevemente ao carregar o app (web e Android),
 * reforçando a identidade visual com a logo sobre o verde da marca —
 * similar à splash nativa do APK, mas controlada via React/CSS.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 900);
    const hideTimer = setTimeout(() => setVisible(false), 1250);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 transition-opacity duration-350 ${fading ? 'opacity-0' : 'opacity-100'}`}
      style={{
        background: 'radial-gradient(circle at 30% 20%, #3d6b1e, #1f3a0f 70%)',
      }}
    >
      <div className="w-28 h-28 rounded-[2rem] bg-[#eafbe0] shadow-[0_8px_32px_rgba(0,0,0,0.25)] flex items-center justify-center animate-scale-in">
        <img src={logo} alt="" className="w-20 h-20 object-contain" />
      </div>
      <div className="text-center animate-fade-in-up" style={{ animationDelay: '120ms' }}>
        <h1 className="text-3xl font-black text-white tracking-tight">Floresta Já</h1>
        <p className="text-sm text-[#bfe0a0] font-semibold mt-1">Sabores de Floresta - PE, na sua porta</p>
      </div>
    </div>
  );
}
