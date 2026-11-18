import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, X, ChevronRight, Trash2 } from 'lucide-react';
import { useCart } from '../helpers/useCart';

function formatPrice(p: number) { return `R$ ${Number(p).toFixed(2).replace('.', ',')}`; }

/**
 * Botão compacto de carrinho (canto inferior direito) que mostra itens e total.
 * Ao tocar, abre uma gaveta com os itens, ajuste de quantidade e "Finalizar pedido".
 */
export function FloatingCart() {
  const { items, updateQty, clearCart, totalItems, totalPrice } = useCart();
  const [open, setOpen] = useState(false);

  // Fecha com Esc e trava o scroll da página enquanto a gaveta está aberta.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  if (totalItems === 0) return null;
  const sheetOpen = open && totalItems > 0;

  return (
    <>
      {/* Botão compacto */}
      {!sheetOpen && (
        <button
          onClick={() => setOpen(true)}
          aria-label={`Abrir carrinho: ${totalItems} ${totalItems === 1 ? 'item' : 'itens'}, ${formatPrice(totalPrice)}`}
          className="fixed z-40 right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] flex items-center gap-2.5 h-12 pl-1.5 pr-4 rounded-full bg-[#2D5016] text-white shadow-[0_8px_24px_rgba(45,80,22,0.35)] hover:bg-[#3d6b1e] animate-scale-in"
        >
          <span className="relative w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
            <ShoppingBag size={18} />
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#9fd36b] text-[#1f3a0f] text-[10px] font-black flex items-center justify-center ring-2 ring-[#2D5016]">
              {totalItems}
            </span>
          </span>
          <span className="text-sm font-bold tabular-nums">{formatPrice(totalPrice)}</span>
        </button>
      )}

      {/* Gaveta */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Seu carrinho">
          <button aria-label="Fechar carrinho" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/40 animate-fade-in cursor-default" />

          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-2xl bg-white rounded-t-3xl shadow-[0_-8px_32px_rgba(0,0,0,0.18)] flex flex-col max-h-[80vh] animate-fade-in-up pb-[env(safe-area-inset-bottom,0px)]">
            <div className="pt-2.5 flex justify-center"><span className="w-10 h-1 rounded-full bg-[#e3e8dd]" /></div>

            <div className="flex items-center justify-between px-5 pt-2 pb-3">
              <div>
                <h2 className="text-lg font-black text-[#1a1a1a]">Seu carrinho</h2>
                <p className="text-xs text-[#8a9483]">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { clearCart(); setOpen(false); }} className="h-9 px-3 rounded-full text-xs font-semibold text-[#b4453a] hover:bg-red-50 flex items-center gap-1">
                  <Trash2 size={14} /> Limpar
                </button>
                <button onClick={() => setOpen(false)} aria-label="Fechar" className="w-9 h-9 rounded-full bg-[#f1f5ec] text-[#4a5544] flex items-center justify-center">
                  <X size={17} />
                </button>
              </div>
            </div>

            <ul className="flex-1 overflow-y-auto px-5 divide-y divide-[#eceee8] border-y border-[#eceee8]">
              {items.map(({ item, quantity }) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#f1f5ec] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1a1a1a] truncate">{item.name}</p>
                    <p className="text-xs text-[#8a9483] tabular-nums">{formatPrice(Number(item.price) * quantity)}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-[#f1f5ec] rounded-full p-1 shrink-0">
                    <button onClick={() => updateQty(item.id, quantity - 1)} aria-label={`Diminuir ${item.name}`}
                      className="w-7 h-7 rounded-full bg-white text-[#2D5016] flex items-center justify-center shadow-sm">
                      {quantity === 1 ? <Trash2 size={13} /> : <Minus size={14} />}
                    </button>
                    <span className="w-6 text-center text-sm font-bold tabular-nums">{quantity}</span>
                    <button onClick={() => updateQty(item.id, quantity + 1)} aria-label={`Aumentar ${item.name}`}
                      className="w-7 h-7 rounded-full bg-[#2D5016] text-white flex items-center justify-center">
                      <Plus size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="px-5 pt-4 pb-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-[#6b7465]">Subtotal</span>
                <span className="text-xl font-black text-[#1f3a0f] tabular-nums">{formatPrice(totalPrice)}</span>
              </div>
              <Link to="/cart" onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 h-12 rounded-2xl bg-[#2D5016] text-white font-bold hover:bg-[#3d6b1e]">
                Finalizar pedido <ChevronRight size={18} />
              </Link>
              <button onClick={() => setOpen(false)} className="w-full h-10 text-sm font-semibold text-[#2D5016]">
                Continuar escolhendo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
