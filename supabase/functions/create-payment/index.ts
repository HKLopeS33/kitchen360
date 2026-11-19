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

const PIX_MINUTES = 30;

// Data no formato que o MP aceita em date_of_expiration (horário de Brasília).
function brasiliaIso(d: Date) {
  const t = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return t.toISOString().replace('Z', '-03:00');
}

// Cria um pagamento Pix direto na API (sem página do Mercado Pago) e devolve
// o QR Code / copia-e-cola para o app mostrar.
async function createPix(token: string, p: {
  amount: number; description: string; email: string; firstName: string;
  externalRef: string; notificationUrl: string; idempotencyKey: string;
}) {
  const res = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': p.idempotencyKey,
    },
    body: JSON.stringify({
      transaction_amount: Number(p.amount.toFixed(2)),
      description: p.description.slice(0, 200),
      payment_method_id: 'pix',
      payer: { email: p.email, first_name: p.firstName.slice(0, 60) },
      external_reference: p.externalRef,
      notification_url: p.notificationUrl,
      date_of_expiration: brasiliaIso(new Date(Date.now() + PIX_MINUTES * 60 * 1000)),
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error('MP pix error:', res.status, text.slice(0, 500));
    return null;
  }
  return toPix(JSON.parse(text));
}

// Pix já criado (reabrir a tela não gera outro código enquanto este vale).
async function getPix(token: string, paymentId: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const pix = toPix(await res.json());
  if (!pix || pix.status !== 'pending') return null;
  if (pix.expiresAt && new Date(pix.expiresAt).getTime() < Date.now() + 60_000) return null;
  return pix;
}

// deno-lint-ignore no-explicit-any
function toPix(pay: any) {
  const tx = pay?.point_of_interaction?.transaction_data ?? {};
  if (!tx.qr_code) return null;
  return {
    paymentId: String(pay.id),
    status: String(pay.status),
    qrCode: String(tx.qr_code),
    qrCodeBase64: tx.qr_code_base64 ? String(tx.qr_code_base64) : null,
    ticketUrl: tx.ticket_url ? String(tx.ticket_url) : null,
    expiresAt: pay.date_of_expiration ?? null,
    amount: Number(pay.transaction_amount),
  };
}


// Dados que o formulário de cartão do Mercado Pago (Card Payment Brick) entrega.
// O número do cartão nunca chega aqui: só um token de uso único.
type CardForm = {
  token?: string;
  issuer_id?: string | number;
  payment_method_id?: string;
  installments?: number;
  payer?: { email?: string; identification?: { type?: string; number?: string } };
};

async function createCardPayment(token: string, card: CardForm, p: {
  amount: number; maxInstallments: number; description: string; email: string;
  externalRef: string; notificationUrl: string;
}) {
  if (!card?.token || !card?.payment_method_id) {
    return { status: 'rejected', statusDetail: 'invalid_form', paymentId: null as string | null, amount: 0 };
  }
  const installments = Math.min(Math.max(Number(card.installments) || 1, 1), p.maxInstallments);
  const ident = card.payer?.identification;
  const res = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      // O token do cartão é de uso único: mesma chave = mesma tentativa.
      'X-Idempotency-Key': `card_${card.token}`,
    },
    body: JSON.stringify({
      transaction_amount: Number(p.amount.toFixed(2)),
      token: card.token,
      installments,
      payment_method_id: card.payment_method_id,
      ...(card.issuer_id ? { issuer_id: Number(card.issuer_id) } : {}),
      payer: {
        email: card.payer?.email || p.email,
        ...(ident?.type && ident?.number ? { identification: { type: ident.type, number: ident.number } } : {}),
      },
      description: p.description.slice(0, 200),
      external_reference: p.externalRef,
      notification_url: p.notificationUrl,
      statement_descriptor: 'FLORESTA JA',
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error('MP card error:', res.status, text.slice(0, 500));
    let detail = 'mp_error';
    try {
      const code = JSON.parse(text)?.cause?.[0]?.code;
      if (code) detail = `mp_${code}`;
    } catch { /* corpo inválido */ }
    return { status: 'rejected', statusDetail: detail, paymentId: null as string | null, amount: 0 };
  }
  const pay = JSON.parse(text);
  return {
    status: String(pay.status),
    statusDetail: String(pay.status_detail ?? ''),
    paymentId: String(pay.id) as string | null,
    amount: Number(pay.transaction_amount),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173';
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  try {
    const { orderId, paymentMethod, renew, card } = await req.json();
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
      .select('id, order_number, restaurant_id, client_id, items, total, status, payment_id')
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

    // "rid" diz ao webhook qual token usar para conferir o pagamento.
    const notificationUrl = `${SUPABASE_URL}/functions/v1/payment-webhook?src=order&rid=${order.restaurant_id}`;

    // ── Pix dentro do app ──
    if (paymentMethod === 'pix') {
      // Reabrir a tela devolve o mesmo código enquanto ele vale;
      // "renew" (ou código vencido) gera um novo.
      if (!renew && order.payment_id && /^\d+$/.test(String(order.payment_id))) {
        const current = await getPix(mpToken, String(order.payment_id));
        if (current) return ok({ pix: current });
      }
      const key = `${order.id}_pix_${Date.now()}`;
      const pix = await createPix(mpToken, {
        amount: Number(order.total),
        description: `Pedido #${order.order_number} — Floresta Já`,
        email: user.email ?? '',
        firstName: String(user.user_metadata?.name ?? 'Cliente'),
        externalRef: String(order.order_number),
        notificationUrl,
        idempotencyKey: key,
      });
      if (!pix) {
        return ok({ error: 'Não foi possível gerar o Pix. O token de pagamento deste restaurante pode estar inválido ou sem chave Pix cadastrada.' });
      }
      // Guarda qual é o Pix atual: o webhook ignora o cancelamento de códigos antigos.
      await supabase.from('orders').update({ payment_id: pix.paymentId }).eq('id', order.id);
      return ok({ pix });
    }

    // ── Cartão dentro do app ──
    if ((paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && card) {
      const result = await createCardPayment(mpToken, card as CardForm, {
        amount: Number(order.total),
        maxInstallments: paymentMethod === 'debit_card' ? 1 : 12,
        description: `Pedido #${order.order_number} — Floresta Já`,
        email: user.email ?? '',
        externalRef: String(order.order_number),
        notificationUrl,
      });

      if (result.paymentId && result.status === 'approved' && result.amount + 0.01 >= Number(order.total)) {
        // Resposta veio direto do MP com o token do restaurante: pode liberar já.
        await supabase.from('orders')
          .update({ status: 'pending', payment_status: 'approved', payment_id: result.paymentId })
          .eq('id', order.id)
          .eq('status', 'awaiting_payment');
      } else if (result.paymentId && (result.status === 'in_process' || result.status === 'pending')) {
        // Em análise: a confirmação chega pelo webhook.
        await supabase.from('orders')
          .update({ payment_status: result.status, payment_id: result.paymentId })
          .eq('id', order.id)
          .eq('status', 'awaiting_payment');
      }
      return ok({ card: { status: result.status, statusDetail: result.statusDetail } });
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
      notification_url: notificationUrl,
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
