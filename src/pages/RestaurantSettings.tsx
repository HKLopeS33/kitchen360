import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Wallet, CheckCircle2, AlertCircle, Eye, EyeOff, ExternalLink, ChevronRight,
  Store, User, CreditCard, LifeBuoy, ShieldCheck, ExternalLink as OpenIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../helpers/useAuth';
import { useMyRestaurant } from '../helpers/useRestaurants';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { NotificationBell } from '../components/NotificationBell';
import { OwnerMenu } from '../components/OwnerMenu';
import { AlertSettings } from '../components/OrderAlerts';
import { loadAlertPrefs, saveAlertPrefs, type AlertPrefs } from '../helpers/orderAlerts';

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/10 transition-all font-mono';

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
  const { restaurant, isLoading, updateRestaurant } = useMyRestaurant(user?.id ?? null);

  const [publicKey, setPublicKey] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [mpConfigured, setMpConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefsState] = useState<AlertPrefs>(loadAlertPrefs);
  const setPrefs = (p: AlertPrefs) => { setPrefsState(p); saveAlertPrefs(p); };

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate('/login');
    else if (user.role === 'client') navigate('/restaurantes');
  }, [user, authLoading, navigate]);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { setPublicKey(restaurant?.mp_public_key ?? ''); }, [restaurant?.mp_public_key]);

  useEffect(() => {
    if (!restaurant?.id) return;
    supabase.rpc('restaurant_mp_token_configured', { p_restaurant_id: restaurant.id })
      .then(({ data }) => setMpConfigured(data === true));
  }, [restaurant?.id]);

  const cardReady = !!restaurant?.mp_public_key?.trim();

  async function savePayments(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurant) return;
    const key = publicKey.trim();
    const tok = token.trim();
    if (tok && !/^APP_USR-/.test(tok)) { toast.error('O Access Token de produção começa com APP_USR-'); return; }
    if (key && !/^APP_USR-/.test(key)) { toast.error('A Public Key de produção começa com APP_USR-'); return; }
    setSaving(true);
    try {
      if (key !== (restaurant.mp_public_key ?? '')) await updateRestaurant({ mp_public_key: key || null });
      if (tok) {
        const { error } = await supabase.rpc('set_restaurant_mp_token', { p_restaurant_id: restaurant.id, p_token: tok });
        if (error) throw new Error(`O token não foi salvo: ${error.message}`);
        setToken('');
        setShowToken(false);
        setMpConfigured(true);
      }
      toast.success('Pagamentos atualizados!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

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
            <Section
              title="Pagamentos online"
              icon={<Wallet size={18} className="text-[#6BA534]" />}
              right={mpConfigured ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-[#2D5016] bg-[#e8f5e0] px-2.5 py-1 rounded-full">
                  <CheckCircle2 size={13} /> Conectado
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
                  <AlertCircle size={13} /> Pendente
                </span>
              )}
            >
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className={`rounded-xl px-3 py-2.5 border ${mpConfigured ? 'border-[#cfe3bd] bg-[#f3f9ec]' : 'border-gray-200'}`}>
                  <p className="text-xs font-bold text-[#1a1a1a]">Pix</p>
                  <p className="text-[11px] text-[#888]">{mpConfigured ? 'Recebendo' : 'Precisa do Access Token'}</p>
                </div>
                <div className={`rounded-xl px-3 py-2.5 border ${mpConfigured && cardReady ? 'border-[#cfe3bd] bg-[#f3f9ec]' : 'border-gray-200'}`}>
                  <p className="text-xs font-bold text-[#1a1a1a]">Cartão de crédito</p>
                  <p className="text-[11px] text-[#888]">{mpConfigured && cardReady ? 'Recebendo' : 'Precisa das duas chaves'}</p>
                </div>
              </div>

              <form onSubmit={savePayments} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#333] mb-1">Access Token de produção</label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      autoComplete="off"
                      placeholder={mpConfigured ? 'Token salvo. Cole um novo só para trocar' : 'APP_USR-...'}
                      className={`${inputCls} pr-10`}
                    />
                    <button type="button" onClick={() => setShowToken(s => !s)} aria-label={showToken ? 'Ocultar' : 'Mostrar'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#555]">
                      {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-[#999] flex items-center gap-1">
                    <ShieldCheck size={12} className="text-[#6BA534]" /> Fica guardado com segurança e nunca é exibido de volta.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#333] mb-1">Public Key de produção</label>
                  <input value={publicKey} onChange={e => setPublicKey(e.target.value)} autoComplete="off"
                    placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={inputCls} />
                  <p className="mt-1 text-[11px] text-[#999]">Necessária para o pagamento com cartão dentro do app.</p>
                </div>
                <Button type="submit" fullWidth loading={saving}>Salvar chaves</Button>
              </form>

              <details className="mt-4 group">
                <summary className="cursor-pointer text-xs font-semibold text-[#2D5016] list-none flex items-center gap-1">
                  <ChevronRight size={14} className="transition-transform group-open:rotate-90" /> Onde encontro essas chaves?
                </summary>
                <ol className="mt-2 text-xs text-[#777] list-decimal list-inside space-y-1 pl-1">
                  <li>Entre na sua conta do Mercado Pago (CPF ou CNPJ).</li>
                  <li>Abra o painel de desenvolvedores e crie uma aplicação de "Pagamentos online".</li>
                  <li>Em <strong>Credenciais de produção</strong>, copie o <strong>Access Token</strong> e a <strong>Public Key</strong> (começam com <code>APP_USR-</code>).</li>
                  <li>Cole aqui e salve.</li>
                </ol>
                <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#2D5016] hover:underline">
                  <ExternalLink size={13} /> Abrir painel do Mercado Pago
                </a>
              </details>
            </Section>

            {/* ── Alertas ── */}
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
