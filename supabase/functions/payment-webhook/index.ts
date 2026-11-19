import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Quando o pagamento é aprovado, o pedido sai de "aguardando pagamento"
// e entra na fila do estabelecimento como "pending" (recém-recebido).
// Pagamentos ainda pendentes mantêm o pedido invisível ao estabelecimento.
const statusMap: Record<string, string> = {
  approved:   'pending',
  pending:    'awaiting_payment',
  in_process: 'awaiting_payment',
  // Cartão recusado não cancela: o cliente pode tentar outro cartão ou Pix.
  rejected:   'awaiting_payment',
  cancelled:  'cancelled',
  refunded:   'cancelled',
  charged_back: 'cancelled',
};

type MpPayment = { status: string; external_reference?: string; transaction_amount?: number };

async function fetchPayment(id: string, token: string): Promise<MpPayment | null> {
  if (!token) return null;
  const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return r.ok ? await r.json() : null;
}

async function adminToken(db: SupabaseClient) {
  const { data } = await db.from('platform_secrets').select('value').eq('key', 'admin_mp_token').maybeSingle();
  return data?.value?.trim() ?? '';
}

async function restaurantToken(db: SupabaseClient, restaurantId: string) {
  const { data } = await db.from('restaurant_secrets').select('mp_access_token').eq('restaurant_id', restaurantId).maybeSingle();
  return data?.mp_access_token?.trim() ?? '';
}

Deno.serve(async (req) => {
  const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  try {
    const url   = new URL(req.url);
    let topic = url.searchParams.get('topic') ?? url.searchParams.get('type');
    let id    = url.searchParams.get('id') ?? url.searchParams.get('data.id');

    // Notificações no formato "webhook" mandam os dados no corpo.
    if (req.method === 'POST' && (!topic || !id)) {
      try {
        const body = await req.json();
        topic = topic ?? body?.type ?? body?.topic ?? null;
        id    = id ?? (body?.data?.id != null ? String(body.data.id) : null);
      } catch { /* corpo vazio */ }
    }

    const src = url.searchParams.get('src');  // 'order' | 'sub' (preferências novas)
    const rid = url.searchParams.get('rid');  // restaurante do pedido

    console.log('webhook received:', { topic, id, src, rid });

    if (topic !== 'payment') return new Response('ok', { status: 200 });
    if (!id || !/^\d+$/.test(id)) return new Response('no id', { status: 400 });

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Sempre consultamos o pagamento na API do MP — nada do que chega na
    // notificação é aceito sem essa confirmação.
    let payment: MpPayment | null = null;
    let paymentRestaurantId: string | null = null;

    if (src === 'sub') {
      payment = await fetchPayment(id, await adminToken(db));
    } else if (src === 'order' && rid) {
      payment = await fetchPayment(id, await restaurantToken(db, rid));
      paymentRestaurantId = rid;
    } else {
      // Preferências antigas (sem src/rid): tenta o token do admin e os dos
      // restaurantes com pedidos aguardando pagamento.
      payment = await fetchPayment(id, await adminToken(db));
      if (!payment) {
        const { data: candidates } = await db
          .from('orders')
          .select('restaurant_id')
          .eq('status', 'awaiting_payment')
          .order('created_at', { ascending: false })
          .limit(50);
        const seen = new Set<string>();
        for (const c of candidates ?? []) {
          if (seen.has(c.restaurant_id)) continue;
          seen.add(c.restaurant_id);
          payment = await fetchPayment(id, await restaurantToken(db, c.restaurant_id));
          if (payment) { paymentRestaurantId = c.restaurant_id; break; }
        }
      }
    }

    if (!payment) {
      console.error('Não foi possível obter o pagamento', id);
      return new Response('payment not accessible', { status: 200 });
    }

    const mpStatus    = payment.status;
    const externalRef = payment.external_reference ?? '';
    const paid        = Number(payment.transaction_amount ?? 0);
    console.log('payment status:', mpStatus, '| ref:', externalRef, '| amount:', paid);

    // ── Pagamento de ASSINATURA (external_reference começa com "sub_") ──
    if (externalRef.startsWith('sub_')) {
      if (paymentRestaurantId) {
        // Pagamento lido com token de restaurante não pode renovar assinatura.
        console.error('Referência de assinatura em conta de restaurante, ignorando');
        return new Response('ok', { status: 200 });
      }
      const restaurantId = externalRef.replace('sub_', '');
      if (mpStatus !== 'approved') return new Response('ok', { status: 200 });

      const { data: feeRow } = await db.from('app_settings').select('value').eq('key', 'monthly_fee').maybeSingle();
      const fee = Number(feeRow?.value ?? 0);
      if (paid + 0.01 < fee) {
        console.error(`Valor pago (${paid}) menor que a mensalidade (${fee}); não renovado`);
        return new Response('ok', { status: 200 });
      }

      const { data: rest } = await db
        .from('restaurants')
        .select('subscription_active_until, last_subscription_payment_id')
        .eq('id', restaurantId)
        .maybeSingle();
      if (!rest) return new Response('ok', { status: 200 });
      if (rest.last_subscription_payment_id === id) {
        console.log('Pagamento já processado:', id);
        return new Response('ok', { status: 200 });
      }

      const base = rest.subscription_active_until && new Date(rest.subscription_active_until) > new Date()
        ? new Date(rest.subscription_active_until)
        : new Date();
      base.setDate(base.getDate() + 30);

      const { error: subErr } = await db
        .from('restaurants')
        .update({
          subscription_status: 'active',
          subscription_active_until: base.toISOString(),
          last_subscription_payment_id: id,
        })
        .eq('id', restaurantId);
      if (subErr) console.error('Erro ao renovar assinatura:', subErr);
      else console.log('Assinatura renovada até:', base.toISOString());
      return new Response('ok', { status: 200 });
    }

    // ── Pagamento de PEDIDO ──
    const orderNumber = Number(externalRef);
    if (!Number.isInteger(orderNumber)) return new Response('ok', { status: 200 });

    const { data: order } = await db
      .from('orders')
      .select('id, restaurant_id, total, status, payment_id')
      .eq('order_number', orderNumber)
      .maybeSingle();
    if (!order) return new Response('ok', { status: 200 });

    // O pagamento tem que ter sido feito na conta do restaurante do pedido.
    if (!paymentRestaurantId || paymentRestaurantId !== order.restaurant_id) {
      console.error('Pagamento não pertence ao restaurante do pedido', { orderNumber });
      return new Response('ok', { status: 200 });
    }

    const newStatus = statusMap[mpStatus] ?? 'awaiting_payment';

    // Pix vencido/cancelado que não é mais o código atual do pedido (o cliente
    // gerou outro) não cancela o pedido.
    if (newStatus === 'cancelled' && order.payment_id && String(order.payment_id) !== id) {
      console.log('Cancelamento de pagamento antigo ignorado', { orderNumber, id });
      return new Response('ok', { status: 200 });
    }

    if (newStatus === 'pending') {
      if (paid + 0.01 < Number(order.total)) {
        console.error(`Valor pago (${paid}) menor que o pedido (${order.total})`);
        return new Response('ok', { status: 200 });
      }
      // Só promove pedidos que ainda aguardam pagamento (notificação repetida
      // não pode "voltar" um pedido que já está em preparo/entregue).
      if (order.status !== 'awaiting_payment') return new Response('ok', { status: 200 });
    } else if (newStatus === 'awaiting_payment' && order.status !== 'awaiting_payment') {
      return new Response('ok', { status: 200 });
    }

    // Tentativas que não mudam o pedido (em análise / recusado) só registram o
    // status, sem trocar qual é o pagamento atual do pedido.
    const changes = newStatus === 'awaiting_payment'
      ? { payment_status: mpStatus }
      : { status: newStatus, payment_status: mpStatus, payment_id: id };
    const { error } = await db
      .from('orders')
      .update(changes)
      .eq('id', order.id);
    if (error) console.error('Supabase update error:', error);
    else console.log('pedido', orderNumber, '→', newStatus);

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('webhook error:', err);
    return new Response('error', { status: 500 });
  }
});
