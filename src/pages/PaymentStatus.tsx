import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';

const config = {
  sucesso: {
    icon: <CheckCircle size={64} className="text-[#2D5016]" />,
    title: 'Pagamento aprovado!',
    desc: 'Seu pedido foi confirmado e o restaurante já está preparando.',
    bg: 'bg-[#e8f5e0]',
    color: 'text-[#2D5016]',
  },
  pendente: {
    icon: <Clock size={64} className="text-yellow-500" />,
    title: 'Pagamento pendente',
    desc: 'Seu pagamento está sendo processado. Assim que confirmado, o restaurante iniciará o preparo.',
    bg: 'bg-yellow-50',
    color: 'text-yellow-700',
  },
  falha: {
    icon: <XCircle size={64} className="text-red-500" />,
    title: 'Pagamento recusado',
    desc: 'Não foi possível processar seu pagamento. Tente novamente com outro método.',
    bg: 'bg-red-50',
    color: 'text-red-700',
  },
};

export function PaymentStatus() {
  const [params] = useSearchParams();
  const status = (params.get('status') ?? 'falha') as keyof typeof config;
  const orderNum = params.get('order');
  const cfg = config[status] ?? config.falha;

  return (
    <div className="min-h-screen bg-[#f7f5f0] flex items-center justify-center p-4">
      <div className={`w-full max-w-sm ${cfg.bg} rounded-3xl p-8 text-center shadow-sm`}>
        <div className="flex justify-center mb-4">{cfg.icon}</div>
        <h1 className={`text-2xl font-black mb-2 ${cfg.color}`}>{cfg.title}</h1>
        {orderNum && (
          <p className="text-sm font-semibold text-[#555] mb-2">Pedido #{orderNum}</p>
        )}
        <p className="text-sm text-[#666] mb-8">{cfg.desc}</p>
        <Link to="/restaurantes"
          className="flex items-center justify-center gap-2 bg-[#2D5016] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#3d6b1e] transition-colors">
          <ArrowLeft size={16} /> Voltar aos restaurantes
        </Link>
      </div>
    </div>
  );
}
