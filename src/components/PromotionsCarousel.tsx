import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Tag, ChevronRight } from 'lucide-react';
import { useActivePromotions } from '../helpers/usePromotions';

const TYPE_COLORS: Record<string, string> = {
  promo:    'bg-orange-400',
  combo:    'bg-purple-500',
  desconto: 'bg-[#2D5016]',
};

const BG_GRADIENTS = [
  'from-[#2D5016] to-[#4a8526]',
  'from-[#1a3d6b] to-[#2d6abf]',
  'from-[#6b1a1a] to-[#bf2d2d]',
  'from-[#5c3d00] to-[#b37a00]',
  'from-[#1a3b4d] to-[#2d7a8f]',
];

export function PromotionsCarousel() {
  const { promotions, isLoading } = useActivePromotions();
  const scrollRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="mb-4">
        <div className="h-5 w-36 bg-gray-200 rounded-lg mb-3 animate-pulse" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2].map(i => <div key={i} className="w-52 h-28 rounded-2xl bg-gray-200 animate-pulse shrink-0" />)}
        </div>
      </div>
    );
  }

  if (promotions.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="font-black text-[#1a1a1a] text-base flex items-center gap-1.5">
          <Tag size={16} className="text-[#6BA534]" /> Promoções da semana
        </h2>
        <span className="text-xs text-[#999]">{promotions.length} oferta{promotions.length !== 1 ? 's' : ''}</span>
      </div>

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {promotions.map((p, idx) => {
          const grad = BG_GRADIENTS[idx % BG_GRADIENTS.length];
          const badgeBg = TYPE_COLORS[p.type] ?? 'bg-[#2D5016]';

          return (
            <Link
              key={p.id}
              to={`/restaurantes/${p.restaurant_id}`}
              className={`shrink-0 snap-start w-52 rounded-2xl bg-gradient-to-br ${grad} p-3.5 flex flex-col justify-between relative overflow-hidden`}
              style={{ minHeight: '110px' }}
            >
              {/* Badge tipo */}
              <span className={`self-start text-[10px] font-black text-white px-2 py-0.5 rounded-full ${badgeBg} uppercase tracking-wide`}>
                {p.type === 'combo' ? 'Combo' : p.type === 'desconto' ? 'Desconto' : 'Promo'}
              </span>

              {/* Conteúdo */}
              <div className="mt-2">
                {p.badge && (
                  <p className="text-[22px] font-black text-white leading-none">{p.badge}</p>
                )}
                <p className="text-sm font-bold text-white/90 leading-tight mt-0.5 line-clamp-2">{p.title}</p>
                {p.promo_price && (
                  <div className="flex items-center gap-1.5 mt-1">
                    {p.original_price && (
                      <span className="text-[11px] text-white/50 line-through">
                        R$ {Number(p.original_price).toFixed(2).replace('.', ',')}
                      </span>
                    )}
                    <span className="text-sm font-black text-white">
                      R$ {Number(p.promo_price).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}
              </div>

              {/* Rodapé restaurante */}
              <div className="flex items-center justify-between mt-2">
                <p className="text-[11px] text-white/60 truncate">{p.restaurant_name}</p>
                <ChevronRight size={14} className="text-white/60 shrink-0" />
              </div>

              {/* Detalhe decorativo */}
              <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/5" />
              <div className="absolute -right-2 bottom-4 w-10 h-10 rounded-full bg-white/5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
