import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Store } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../helpers/useAuth';
import { useMyRestaurant } from '../helpers/useRestaurants';
import { NotificationBell } from '../components/NotificationBell';
import { OwnerMenu } from '../components/OwnerMenu';
import { RestaurantDetailsForm, type RestaurantDetails } from '../components/RestaurantDetailsForm';

/** Configurações → Dados do estabelecimento. */
export function RestaurantStoreSettings() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { restaurant, isLoading, updateRestaurant } = useMyRestaurant(user?.id ?? null);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate('/login');
    else if (user.role === 'client') navigate('/restaurantes');
  }, [user, authLoading, navigate]);

  async function save(values: RestaurantDetails) {
    if (!values.name) { toast.error('Nome obrigatório'); return; }
    try {
      await updateRestaurant(values);
      toast.success('Dados atualizados!');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl lg:max-w-3xl mx-auto safe-px h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/configuracoes" aria-label="Voltar às configurações" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-[#4a5544] hover:bg-[#f1f5ec]">
              <ArrowLeft size={20} />
            </Link>
            <span className="font-bold text-[#1a1a1a] truncate">Dados do estabelecimento</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell userId={user.id} />
            <OwnerMenu />
          </div>
        </div>
      </header>

      <main className="max-w-2xl lg:max-w-3xl mx-auto safe-px py-6">
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-20" />)}</div>
        ) : !restaurant ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-sm text-[#555]">
            Cadastre seu estabelecimento primeiro.
            <Link to="/meu-restaurante" className="block mt-3 font-semibold text-[#2D5016] hover:underline">Ir para o painel</Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-6 animate-fade-in-up">
            <h2 className="font-bold text-[#1a1a1a] mb-1 flex items-center gap-2">
              <Store size={18} className="text-[#6BA534]" /> {restaurant.name}
            </h2>
            <p className="text-xs text-[#888] mb-5">É assim que seu estabelecimento aparece para os clientes.</p>
            <RestaurantDetailsForm restaurant={restaurant} onSubmit={save} submitLabel="Salvar alterações" />
          </div>
        )}
      </main>
    </div>
  );
}
