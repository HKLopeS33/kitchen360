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

type OrderItem = { id: string; name: string; price: number; quantity: number };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173';
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  try {
    const { orderId, paymentMethod } = await req.json();
    if (!orderId || !paymentMethod) {
      return ok({ error: 'Dados incompletos', detail: 'orderId e paymentMethod são obrigatórios' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Quem está pagando: precisa ser o dono do pedido.
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: auth } = await supabase.auth.getUser(jwt);
    const user = auth?.user;
    if (!user) return ok({ error: 'Faça login para pagar' });

    // Valores vêm do pedido salvo no banco (o trigger recalcula os preços
    // a partir do cardápio) — nunca do que o navegador mandou.
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, order_number, restaurant_id, client_id, items, total, status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr) console.error('Erro ao buscar pedido:', orderErr);
    if (!order || order.client_id !== user.id) return ok({ error: 'Pedido não encontrado' });
    if (order.status !== 'awaiting_payment') return ok({ error: 'Este pedido não está aguardando pagamento' });
    if (!(Number(order.total) > 0)) return ok({ error: 'Pedido sem valor' });

    const { data: secret } = await supabase
      .from('restaurant_secrets')
      .select('mp_access_token')
      .eq('restaurant_id', order.restaurant_id)
      .maybeSingle();

    const mpToken = secret?.mp_access_token?.trim();
    if (!mpToken) {
      return ok({
        error: 'Pagamento online indisponível',
        detail: 'Este restaurante ainda não configurou o recebimento de pagamentos online. Entre em contato com o estabelecimento.',
      });
    }

    const mpItems = (order.items as OrderItem[]).map(i => ({
      id: String(i.id).slice(0, 20),
      title: String(i.name).slice(0, 256),
      quantity: Number(i.quantity),
      unit_price: Number(Number(i.price).toFixed(2)),
      currency_id: 'BRL',
    }));

    const back = (status: string) =>
      `${APP_URL}/pedido-status?status=${status}&order=${order.order_number}&orderId=${order.id}`;

    const preference: Record<string, unknown> = {
      items: mpItems,
      payer: { name: user.user_metadata?.name ?? 'Cliente', email: user.email },
      back_urls: { success: back('sucesso'), failure: back('falha'), pending: back('pendente') },
      external_reference: String(order.order_number),
      // "rid" diz ao webhook qual token usar para conferir o pagamento.
      notification_url: `${SUPABASE_URL}/functions/v1/payment-webhook?src=order&rid=${order.restaurant_id}`,
      statement_descriptor: 'FLORESTA JA',
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

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${order.id}_${paymentMethod}`,
      },
      body: JSON.stringify(preference),
    });

    const mpBody = await mpRes.text();
    console.log('MP preference status:', mpRes.status, '| pedido:', order.order_number);

    if (!mpRes.ok) {
      console.error('MP error body:', mpBody.slice(0, 500));
      return ok({
        error: 'O token de pagamento deste restaurante é inválido ou expirou. Peça ao estabelecimento para revisar o token na aba Dados.',
      });
    }

    const pref = JSON.parse(mpBody);
    return ok({
      preferenceId: pref.id,
      checkoutUrl: pref.init_point,
      sandboxUrl: pref.sandbox_init_point,
    });
  } catch (err) {
    console.error('Unhandled error:', err);
    return ok({ error: 'Erro ao criar pagamento' });
  }
});
