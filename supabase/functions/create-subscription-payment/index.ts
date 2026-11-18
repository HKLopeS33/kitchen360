import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const APP_URL          = Deno.env.get('APP_URL') ?? 'https://kitchen360app.netlify.app';
  const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SVC_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  try {
    const body = await req.json();
    const { restaurantId, paymentMethod } = body;

    if (!restaurantId) return ok({ error: 'restaurantId obrigatório' });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SVC_KEY);

    // Só o dono do estabelecimento (ou admin) gera a cobrança dele.
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: auth } = await supabase.auth.getUser(jwt);
    const user = auth?.user;
    if (!user) return ok({ error: 'Faça login para pagar' });

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name, owner_id')
      .eq('id', restaurantId)
      .maybeSingle();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!restaurant || (restaurant.owner_id !== user.id && profile?.role !== 'admin')) {
      return ok({ error: 'Estabelecimento não encontrado' });
    }
    const restaurantName = restaurant.name;
    const payerEmail = user.email;
    const payerName = user.user_metadata?.name ?? 'Responsável';

    // 1) Token MP do admin (tabela privada) + valor da mensalidade
    const [{ data: secret }, { data: feeRow }] = await Promise.all([
      supabase.from('platform_secrets').select('value').eq('key', 'admin_mp_token').maybeSingle(),
      supabase.from('app_settings').select('value').eq('key', 'monthly_fee').maybeSingle(),
    ]);
    const adminToken = secret?.value?.trim();
    const monthlyFee = Number(feeRow?.value ?? 49.90);

    if (!adminToken) {
      return ok({ error: 'O administrador ainda não configurou o token de pagamento. Entre em contato.' });
    }

    // 2) Cria preferência de pagamento no MP com o token do admin
    const preference: Record<string, unknown> = {
      items: [{
        id: `sub_${restaurantId}`,
        title: `Mensalidade Floresta Já — ${restaurantName ?? 'Estabelecimento'}`,
        quantity: 1,
        unit_price: Number(monthlyFee.toFixed(2)),
        currency_id: 'BRL',
      }],
      payer: {
        name: payerName ?? 'Responsável',
        email: (payerEmail && payerEmail.includes('@')) ? payerEmail : 'pagador@florestaja.com',
      },
      back_urls: {
        success: `${APP_URL}/assinatura-status?result=sucesso&rid=${restaurantId}`,
        failure: `${APP_URL}/assinatura-status?result=falha&rid=${restaurantId}`,
        pending: `${APP_URL}/assinatura-status?result=pendente&rid=${restaurantId}`,
      },
      // Prefixo "sub_" diferencia pagamentos de assinatura dos pedidos no webhook
      external_reference: `sub_${restaurantId}`,
      notification_url: `${SUPABASE_URL}/functions/v1/payment-webhook?src=sub`,
      statement_descriptor: 'FLORESTA JA',
    };

    if (paymentMethod === 'pix') {
      preference.payment_methods = {
        excluded_payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }],
      };
    } else if (paymentMethod === 'credit_card') {
      preference.payment_methods = {
        excluded_payment_types: [{ id: 'bank_transfer' }, { id: 'ticket' }],
        installments: 1,
      };
    } else if (paymentMethod === 'debit_card') {
      preference.payment_methods = {
        excluded_payment_types: [{ id: 'bank_transfer' }, { id: 'credit_card' }, { id: 'ticket' }],
        installments: 1,
      };
    }

    const mpRes  = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `sub_${restaurantId}_${Date.now()}`,
      },
      body: JSON.stringify(preference),
    });

    const mpBody = await mpRes.text();
    console.log('MP subscription response:', mpRes.status);

    if (!mpRes.ok) {
      console.error('MP error body:', mpBody.slice(0, 500));
      return ok({ error: 'Erro ao criar pagamento: token inválido ou expirado' });
    }

    const pref = JSON.parse(mpBody);
    return ok({
      preferenceId: pref.id,
      checkoutUrl:  pref.init_point,
      sandboxUrl:   pref.sandbox_init_point,
      monthlyFee,
    });

  } catch (err) {
    console.error('create-subscription-payment error:', err);
    return ok({ error: 'Erro ao criar pagamento' });
  }
});
