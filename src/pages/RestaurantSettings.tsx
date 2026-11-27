import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, Store, User, CreditCard, LifeBuoy, ExternalLink as OpenIcon,
} from 'lucide-react';
import { useAuth } from '../helpers/useAuth';
import { useMyRestaurant } from '../helpers/useRestaurants';
import { NotificationBell } from '../components/NotificationBell';
import { OwnerMenu } from '../components/OwnerMenu';
import { AlertSettings } from '../components/OrderAlerts';
import { PhoneAppCard } from '../components/PhoneAppCard';
import { MercadoPagoConnect } from '../components/MercadoPagoConnect';
import { loadAlertPrefs, saveAlertPrefs, type AlertPrefs } from '../helpers/orderAlerts';


function Section({ title, icon, children, right }: { title: string; icon: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm p-5 animate-fade-in-up">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-bold text-[#1a1a1a] flex items-center gap-2">{icon} {title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function RowLink({ to, icon, title, desc }: { to: string; icon: ReactNode; title: string; desc: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-1 py-3 border-b border-gray-50 last:border-0 hover:bg-[#f7f5f0] rounded-xl transition-colors">
      <span className="w-9 h-9 rounded-full bg-[#f1f5ec] text-[#2D5016] flex items-center justify-center shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-[#1a1a1a]">{title}</span>
        <span className="block text-xs text-[#888] truncate">{desc}</span>
      </span>
      <ChevronRight size={16} className="text-[#bbb] shrink-0" />
    </Link>
  );
}

/** Configurações do app para o estabelecimento. */
export function RestaurantSettings() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { restaurant, isLoading, refetch } = useMyRestaurant(user?.id ?? null);

  const [prefs, setPrefsState] = useState<AlertPrefs>(loadAlertPrefs);
  const setPrefs = (p: AlertPrefs) => { setPrefsState(p); saveAlertPrefs(p); };

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate('/login');
    else if (user.role === 'client') navigate('/restaurantes');
  }, [user, authLoading, navigate]);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl lg:max-w-3xl mx-auto safe-px h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/meu-restaurante" aria-label="Voltar ao painel" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-[#4a5544] hover:bg-[#f1f5ec]">
              <ArrowLeft size={20} />
            </Link>
            <span className="font-bold text-[#1a1a1a] truncate">Configurações</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell userId={user.id} />
            <OwnerMenu />
          </div>
        </div>
      </header>

      <main className="max-w-2xl lg:max-w-3xl mx-auto safe-px py-6 flex flex-col gap-5">
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-32" />)}</div>
        ) : !restaurant ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-sm text-[#555]">
            Cadastre seu estabelecimento primeiro.
            <Link to="/meu-restaurante" className="block mt-3 font-semibold text-[#2D5016] hover:underline">Ir para o painel</Link>
          </div>
        ) : (
          <>
            {/* ── Pagamentos ── */}
            <MercadoPagoConnect restaurant={restaurant} onChanged={refetch} />

            {/* ── Alertas ── */}
            <PhoneAppCard userId={user.id} audience="restaurant" />

            <AlertSettings prefs={prefs} setPrefs={setPrefs} />

            {/* ── Loja e conta ── */}
            <Section title="Loja e conta" icon={<Store size={18} className="text-[#6BA534]" />}>
              <div className="flex flex-col">
                <RowLink to="/configuracoes/estabelecimento" icon={<Store size={16} />} title="Dados do estabelecimento" desc="Nome, categoria, horário, endereço, foto e entrega" />
                <RowLink to={`/restaurantes/${restaurant.id}`} icon={<OpenIcon size={16} />} title="Ver minha loja" desc="Como os clientes veem seu cardápio" />
                <RowLink to="/meus-dados" icon={<User size={16} />} title="Meu perfil" desc="Seu nome, telefone e senha" />
                <RowLink to="/assinatura" icon={<CreditCard size={16} />} title="Assinatura" desc="Mensalidade e situação do acesso" />
                <RowLink to="/suporte" icon={<LifeBuoy size={16} />} title="Ajuda e suporte" desc="Fale com a equipe Floresta Já" />
              </div>
            </Section>
          </>
        )}
      </main>
    </div>
  );
}
