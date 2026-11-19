import { useEffect, useState } from 'react';
import { Copy, Check, RefreshCw, Loader2, Smartphone, QrCode } from 'lucide-react';
import { toast } from 'sonner';

export interface PixData {
  paymentId: string;
  status: string;
  qrCode: string;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: string | null;
  amount: number;
}

function formatPrice(p: number) { return `R$ ${Number(p).toFixed(2).replace('.', ',')}`; }

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // WebViews antigas: cópia pelo método clássico.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

function useCountdown(expiresAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt) return { expired: false, label: null as string | null };
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return { expired: true, label: '00:00' };
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { expired: false, label: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` };
}

/**
 * Pagamento Pix dentro do app: QR Code, copia-e-cola e contagem de validade.
 * A confirmação chega pelo webhook — quem usa este componente acompanha o
 * status e troca de tela quando o pagamento é aprovado.
 */
export function PixPayment({ pix, title, subtitle, onRenew, renewing }: {
  pix: PixData;
  title: string;
  subtitle?: string;
  onRenew: () => void;
  renewing?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { expired, label } = useCountdown(pix.expiresAt);

  const handleCopy = async () => {
    if (await copyText(pix.qrCode)) {
      setCopied(true);
      toast.success('Código Pix copiado');
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast.error('Não foi possível copiar. Selecione o código e copie manualmente.');
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl shadow-[0_2px_16px_rgba(20,40,10,0.08)] overflow-hidden animate-scale-in">
      <div className="px-5 pt-5 pb-4 text-center border-b border-[#eceee8]">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#6BA534]">{title}</p>
        <p className="mt-1 text-3xl font-black text-[#1f3a0f] tabular-nums">{formatPrice(pix.amount)}</p>
        {subtitle && <p className="mt-0.5 text-sm text-[#7a8274]">{subtitle}</p>}
      </div>

      {expired ? (
        <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center">
            <QrCode size={26} className="text-orange-500" />
          </div>
          <div>
            <p className="font-bold text-[#1a1a1a]">Este código Pix expirou</p>
            <p className="text-sm text-[#7a8274] mt-1">Gere um novo código para concluir o pagamento.</p>
          </div>
          <button onClick={onRenew} disabled={renewing}
            className="mt-1 h-11 px-5 rounded-full bg-[#2D5016] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
            {renewing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Gerar novo código
          </button>
        </div>
      ) : (
        <div className="px-5 py-5 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-[#4a5544]">
            <Loader2 size={15} className="animate-spin text-[#6BA534]" />
            Aguardando pagamento
            {label && <span className="font-bold tabular-nums text-[#1f3a0f]">· {label}</span>}
          </div>

          {pix.qrCodeBase64 && (
            <img
              src={`data:image/png;base64,${pix.qrCodeBase64}`}
              alt="QR Code Pix"
              className="w-56 h-56 rounded-2xl ring-1 ring-[#eceee8] p-2 bg-white"
            />
          )}

          <div className="w-full">
            <p className="text-xs font-semibold text-[#4a5544] mb-1.5">Pix copia e cola</p>
            <div className="w-full rounded-xl bg-[#f7f5f0] border border-[#eceee8] px-3 py-2.5 text-[11px] leading-snug text-[#4a5544] font-mono break-all max-h-20 overflow-y-auto select-all">
              {pix.qrCode}
            </div>
          </div>

          <button onClick={handleCopy}
            className={`w-full h-12 rounded-2xl font-bold flex items-center justify-center gap-2 ${copied ? 'bg-[#e8f5e0] text-[#2D5016]' : 'bg-[#2D5016] text-white hover:bg-[#3d6b1e]'}`}>
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Código copiado' : 'Copiar código Pix'}
          </button>

          <ol className="w-full text-[13px] text-[#6b7465] space-y-1.5">
            <li className="flex gap-2"><Smartphone size={15} className="shrink-0 mt-0.5 text-[#6BA534]" /> Abra o app do seu banco e escolha pagar com Pix.</li>
            <li className="flex gap-2"><QrCode size={15} className="shrink-0 mt-0.5 text-[#6BA534]" /> Escaneie o QR Code ou cole o código copiado.</li>
            <li className="flex gap-2"><Check size={15} className="shrink-0 mt-0.5 text-[#6BA534]" /> Volte aqui: a confirmação aparece sozinha.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
