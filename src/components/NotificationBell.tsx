import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, CheckCheck, ShoppingBag, Tag, Info, Circle } from 'lucide-react';
import { useNotifications, type AppNotification } from '../helpers/useNotifications';

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const TYPE_ICON: Record<AppNotification['type'], React.ReactNode> = {
  new_order:    <ShoppingBag size={14} className="text-[#2D5016]" />,
  order_status: <ShoppingBag size={14} className="text-blue-500" />,
  promotion:    <Tag size={14} className="text-orange-500" />,
  system:       <Info size={14} className="text-[#999]" />,
};

interface Props {
  userId: string | null;
}

export function NotificationBell({ userId }: Props) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(userId);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = async (n: AppNotification) => {
    if (!n.read) await markRead(n.id);
    setOpen(false);
    if (n.type === 'new_order' && n.data?.order_id) navigate('/meu-restaurante');
    if (n.type === 'order_status' && n.data?.order_id) navigate(`/pedido/${n.data.order_id}`);
    if (n.type === 'promotion' && n.data?.restaurant_id) navigate(`/restaurantes/${n.data.restaurant_id}`);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-[#2D5016] hover:bg-[#3d6b1e] transition-colors shadow-sm"
        aria-label="Notificações"
      >
        <Bell size={18} className="text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(320px,calc(100vw-24px))] max-h-[70vh] bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden z-[60] flex flex-col animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-[#1a1a1a] text-sm">Notificações</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[11px] text-[#6BA534] font-semibold hover:text-[#2D5016] flex items-center gap-1">
                  <CheckCheck size={12} /> Marcar todas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-[#bbb] hover:text-[#666]">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-sm text-[#bbb]">
                <Bell size={28} className="mx-auto mb-2 opacity-30" />
                Sem notificações ainda
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-[#f7f5f0] transition-colors border-b border-gray-50 last:border-0 ${!n.read ? 'bg-[#f0f8e8]' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${!n.read ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                    {TYPE_ICON[n.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight ${!n.read ? 'font-bold text-[#1a1a1a]' : 'font-medium text-[#444]'}`}>{n.title}</p>
                    {n.body && <p className="text-[11px] text-[#888] mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-[#bbb] mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && <Circle size={7} className="text-[#6BA534] fill-[#6BA534] mt-1.5 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
