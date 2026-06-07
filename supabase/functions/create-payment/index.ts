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

  const FALLBACK_MP_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? '';
  const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173';
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  try {
    const body = await req.json();
    const { orderId, orderNumber, restaurantId, items, total, paymentMethod, payerEmail, payerName } = body;

    console.log('create-payment called:', { orderId, orderNumber, restaurantId, paymentMethod, total, payerEmail });

    if (!orderId || !total || !paymentMethod) {
      return ok({ error: 'Dados incompletos', detail: 'orderId, total e paymentMethod são obrigatórios' });
    }

    // Modelo 3: cada restaurante usa seu próprio token MP, recebendo direto na própria conta.
    // Buscamos o token cadastrado pelo dono do restaurante (com service role, ignorando RLS).
    let mpToken = FALLBACK_MP_TOKEN;
    let usingOwnAccount = false;

    if (restaurantId && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: restaurant, error: restErr } = await supabase
        .from('restaurants')
        .select('mp_access_token, name')
        .eq('id', restaurantId)
        .maybeSingle();

      if (restErr) console.error('Erro ao buscar restaurante:', restErr);

      if (restaurant?.mp_access_token?.trim()) {
        mpToken = restaurant.mp_access_token.trim();
        usingOwnAccount = true;
        console.log(`Usando token próprio do restaurante "${restaurant.name}"`);
      } else {
        console.log('Restaurante sem token próprio configurado.');
        return ok({
          error: 'Pagamento online indisponível',
          detail: 'Este restaurante ainda não configurou o recebimento de pagamentos online. Entre em contato com o estabelecimento ou escolha pagar na entrega.',
        });
      }
    }

    if (!mpToken) {
      return ok({ error: 'Token de pagamento não configurado' });
    }

    // Itens no formato do Mercado Pago
    const mpItems = (items ?? []).map((i: { name: string; price: number; quantity: number }) => ({
      id: String(orderId).slice(0, 20),
      title: String(i.name).slice(0, 256),
      quantity: Number(i.quantity),
      unit_price: Number(Number(i.price).toFixed(2)),
      currency_id: 'BRL',
    }));

    const finalItems = mpItems.length > 0 ? mpItems : [{
      id: String(orderId).slice(0, 20),
      title: `Pedido #${orderNumber}`,
      quantity: 1,
      unit_price: Number(Number(total).toFixed(2)),
      currency_id: 'BRL',
    }];

    const safeEmail = (payerEmail && payerEmail.includes('@'))
      ? payerEmail
      : 'test_user_123456@testuser.com';

    const preference: Record<string, unknown> = {
      items: finalItems,
      payer: {
        name: payerName ?? 'Cliente',
        email: safeEmail,
      },
      back_urls: {
        success: `${APP_URL}/pedido-status?status=sucesso&order=${orderNumber}`,
        failure: `${APP_URL}/pedido-status?status=falha&order=${orderNumber}`,
        pending: `${APP_URL}/pedido-status?status=pendente&order=${orderNumber}`,
      },
      external_reference: String(orderNumber),
      notification_url: `${SUPABASE_URL}/functions/v1/payment-webhook`,
      statement_descriptor: 'CARDAPIO APP',
    };

    if (paymentMethod === 'pix') {
      preference.payment_methods = {
        excluded_payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }],
      };
    } else if (paymentMethod === 'credit_card') {
      preference.payment_methods = {
        excluded_payment_types: [{ id: 'bank_transfer' }, { id: 'ticket' }],
        installments: 12,
      };
    } else if (paymentMethod === 'debit_card') {
      preference.payment_methods = {
        excluded_payment_types: [{ id: 'bank_transfer' }, { id: 'credit_card' }, { id: 'ticket' }],
        installments: 1,
      };
    }

    console.log('Sending preference to MP (own account?', usingOwnAccount, '):', JSON.stringify(preference));

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': String(orderId),
      },
      body: JSON.stringify(preference),
    });

    const mpBody = await mpRes.text();
    console.log('MP response status:', mpRes.status);
    console.log('MP response body:', mpBody);

    if (!mpRes.ok) {
      return ok({
        error: usingOwnAccount
          ? 'O token de pagamento deste restaurante é inválido ou expirou. Peça ao estabelecimento para revisar o token na aba Dados.'
          : `Mercado Pago retornou ${mpRes.status}`,
        detail: mpBody,
      });
    }

    const pref = JSON.parse(mpBody);
    console.log('Preference created:', pref.id);

    return ok({
      preferenceId: pref.id,
      checkoutUrl: pref.init_point,
      sandboxUrl: pref.sandbox_init_point,
    });

  } catch (err) {
    console.error('Unhandled error:', err);
    return ok({ error: String(err) });
  }
});
