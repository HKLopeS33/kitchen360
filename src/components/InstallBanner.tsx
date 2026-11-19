import { useState } from 'react';
import { Download, X, Share, PlusSquare, MoreVertical } from 'lucide-react';
import { isMobile, useInstallPrompt } from '../helpers/pwaInstall';

const KEY = 'install-banner-dismissed';
const HIDE_FOR_MS = 7 * 24 * 60 * 60 * 1000;

function dismissedRecently() {
  try { return Date.now() - Number(localStorage.getItem(KEY) || 0) < HIDE_FOR_MS; } catch { return false; }
}

/** Convite para instalar o app no celular (some depois de instalado ou dispensado). */
export function InstallBanner() {
  const { canInstall, installed, ios, install } = useInstallPrompt();
  const [hidden, setHidden] = useState(dismissedRecently);
  const [showHow, setShowHow] = useState(false);

  if (installed || hidden || !isMobile()) return null;

  const dismiss = () => {
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignora */ }
    setHidden(true);
  };

  return (
    <div className="rounded-2xl bg-[#2D5016] text-white p-4 shadow-[0_6px_20px_rgba(20,40,10,0.18)] animate-fade-in-up">
      <div className="flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" className="w-11 h-11 rounded-xl shrink-0 bg-white" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Instale o Floresta Já</p>
          <p className="text-xs text-white/80">Abra direto da tela inicial e receba avisos dos pedidos.</p>
        </div>
        <button onClick={dismiss} aria-label="Dispensar" className="self-start -mr-1 -mt-1 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10">
          <X size={16} />
        </button>
      </div>

      {canInstall ? (
        <button onClick={() => void install()} className="mt-3 w-full h-10 rounded-full bg-white text-[#2D5016] text-sm font-bold flex items-center justify-center gap-1.5">
          <Download size={15} /> Instalar app
        </button>
      ) : showHow ? (
        <ol className="mt-3 text-xs text-white/90 space-y-1.5 bg-white/10 rounded-xl p-3">
          {ios ? (
            <>
              <li className="flex items-center gap-1.5">1. Toque em <Share size={14} /> <strong>Compartilhar</strong> no Safari</li>
              <li className="flex items-center gap-1.5">2. Escolha <PlusSquare size={14} /> <strong>Adicionar à Tela de Início</strong></li>
            </>
          ) : (
            <>
              <li className="flex items-center gap-1.5">1. Toque no menu <MoreVertical size={14} /> do navegador</li>
              <li>2. Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong></li>
            </>
          )}
        </ol>
      ) : (
        <button onClick={() => setShowHow(true)} className="mt-3 w-full h-10 rounded-full bg-white text-[#2D5016] text-sm font-bold">
          Como instalar
        </button>
      )}
    </div>
  );
}
