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

// Dados extras que o antifraude do Mercado Pago usa para aprovar mais
// pagamentos: itens, nome completo, telefone e endereço de entrega.
type Extra = {
  payer: { first_name?: string; last_name?: string };
  // deno-lint-ignore no-explicit-any
  additionalInfo: Record<string, any>;
  deviceId?: string;
};

function buildExtra(p: {
  items: OrderItem[]; fullName: string; phone: string; address: string;
  city: string; state: string; createdAt?: string; deviceId?: string;
}): Extra {
  const parts = p.fullName.trim().split(/\s+/).filter(Boolean);
  const first = (parts[0] ?? 'Cliente').slice(0, 60);
  const last = parts.slice(1).join(' ').slice(0, 60) || undefined;
  let digits = p.phone.replace(/\D/g, '');
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
  const phone = digits.length >= 10 ? { area_code: digits.slice(0, 2), number: digits.slice(2) } : undefined;
  const street = p.address.trim().slice(0, 200);
  const address = street ? { street_name: street } : undefined;
  return {
    payer: { first_name: first, ...(last ? { last_name: last } : {}) },
    deviceId: p.deviceId && /^[\w.:-]{8,600}$/.test(p.deviceId) ? p.deviceId : undefined,
    additionalInfo: {
      items: p.items.map(i => ({
        id: String(i.id).slice(0, 50),
        title: String(i.name).slice(0, 256),
        category_id: 'food',
        quantity: Number(i.quantity),
        unit_price: Number(Number(i.price).toFixed(2)),
      })),
      payer: {
        first_name: first,
        ...(last ? { last_name: last } : {}),
        ...(phone ? { phone } : {}),
        ...(address ? { address } : {}),
      },
      ...(street ? {
        shipments: {
          receiver_address: { street_name: street, city_name: p.city, state_name: p.state },
        },
      } : {}),
    },
  };
}

function mpHeaders(token: string, idempotencyKey: string, deviceId?: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Idempotency-Key': idempotencyKey,
    ...(deviceId ? { 'X-meli-session-id': deviceId } : {}),
  };
}

// Data no formato que o MP aceita em date_of_expiration (horário de Brasília).
function brasiliaIso(d: Date) {
  const t = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return t.toISOString().replace('Z', '-03:00');
}

// Cria um pagamento Pix direto na API (sem página do Mercado Pago) e devolve
// o QR Code / copia-e-cola para o app mostrar.
async function createPix(token: string, p: {
  amount: number; description: string; email: string; firstName: string;
  externalRef: string; notificationUrl: string; idempotencyKey: string; extra?: Extra;
  applicationFee?: number | null;
}) {
  const res = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: mpHeaders(token, p.idempotencyKey, p.extra?.deviceId),
    body: JSON.stringify({
      transaction_amount: Number(p.amount.toFixed(2)),
      description: p.description.slice(0, 200),
      payment_method_id: 'pix',
      payer: { email: p.email, first_name: p.firstName.slice(0, 60), ...(p.extra?.payer ?? {}) },
      ...(p.extra ? { additional_info: p.extra.additionalInfo } : {}),
      external_reference: p.externalRef,
      notification_url: p.notificationUrl,
      date_of_expiration: brasiliaIso(new Date(Date.now() + PIX_MINUTES * 60 * 1000)),
      ...(p.applicationFee ? { application_fee: p.applicationFee } : {}),
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
  externalRef: string; notificationUrl: string; extra?: Extra;
  applicationFee?: number | null;
}) {
  if (!card?.token || !card?.payment_method_id) {
    return { status: 'rejected', statusDetail: 'invalid_form', paymentId: null as string | null, amount: 0 };
  }
  const installments = Math.min(Math.max(Number(card.installments) || 1, 1), p.maxInstallments);
  const ident = card.payer?.identification;
  const res = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    // O token do cartão é de uso único: mesma chave = mesma tentativa.
    headers: mpHeaders(token, `card_${card.token}`, p.extra?.deviceId),
    body: JSON.stringify({
      transaction_amount: Number(p.amount.toFixed(2)),
      token: card.token,
      installments,
      payment_method_id: card.payment_method_id,
      ...(card.issuer_id ? { issuer_id: Number(card.issuer_id) } : {}),
      payer: {
        email: card.payer?.email || p.email,
        ...(p.extra?.payer ?? {}),
        ...(ident?.type && ident?.number ? { identification: { type: ident.type, number: ident.number } } : {}),
      },
      description: p.description.slice(0, 200),
      external_reference: p.externalRef,
      notification_url: p.notificationUrl,
      statement_descriptor: 'FLORESTA JA',
      ...(p.extra ? { additional_info: p.extra.additionalInfo } : {}),
      ...(p.applicationFee ? { application_fee: p.applicationFee } : {}),
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

// ── Comissão do app (split do Mercado Pago) ──
// Só vale para lojas conectadas pelo botão "Conectar com Mercado Pago" (OAuth):
// nesse modo o MP separa a comissão e manda direto para a conta do app.
type Secret = {
  mp_access_token: string | null; mp_refresh_token: string | null;
  mp_token_expires_at: string | null; mp_connected_via: string | null;
};

async function commissionPercent(db: ReturnType<typeof createClient>) {
  const { data } = await db.from('app_settings').select('value').eq('key', 'commission_percent').maybeSingle();
  const pct = Number(data?.value);
  return Number.isFinite(pct) && pct >= 0 && pct <= 20 ? pct : 2.5;
}

function feeFor(total: number, pct: number) {
  const fee = Math.round(total * pct) / 100;
  // Nunca maior que o pedido; abaixo de 1 centavo não cobra.
  return fee >= 0.01 && fee < total ? Number(fee.toFixed(2)) : null;
}

/** Renova o token OAuth da loja quando faltam menos de 15 dias para vencer. */
async function freshToken(db: ReturnType<typeof createClient>, restaurantId: string, s: Secret) {
  const token = s.mp_access_token?.trim() ?? '';
  if (s.mp_connected_via !== 'oauth' || !s.mp_refresh_token || !s.mp_token_expires_at) return token;
  if (new Date(s.mp_token_expires_at).getTime() - Date.now() > 15 * 24 * 3600 * 1000) return token;
  const CLIENT_ID = Deno.env.get('MP_CLIENT_ID') ?? '';
  const CLIENT_SECRET = Deno.env.get('MP_CLIENT_SECRET') ?? '';
  if (!CLIENT_ID || !CLIENT_SECRET) return token;
  try {
    const r = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: s.mp_refresh_token }),
    });
    if (!r.ok) { console.error('refresh token falhou', r.status); return token; }
    const t = await r.json();
    if (!t?.access_token) return token;
    await db.from('restaurant_secrets').update({
      mp_access_token: t.access_token,
      mp_refresh_token: t.refresh_token ?? s.mp_refresh_token,
      mp_token_expires_at: new Date(Date.now() + (Number(t.expires_in) || 15552000) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('restaurant_id', restaurantId);
    return String(t.access_token);
  } catch (e) {
    console.error('refresh token erro', e);
    return token;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173';
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  try {
    const { orderId, paymentMethod, renew, card, deviceId } = await req.json();
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
      .select('id, order_number, restaurant_id, client_id, client_name, delivery_address, items, total, status, payment_id')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr) console.error('Erro ao buscar pedido:', orderErr);
    if (!order || order.client_id !== user.id) return ok({ error: 'Pedido não encontrado' });
    if (order.status !== 'awaiting_payment') return ok({ error: 'Este pedido não está aguardando pagamento' });
    if (!(Number(order.total) > 0)) return ok({ error: 'Pedido sem valor' });

    const { data: secret } = await supabase
      .from('restaurant_secrets')
      .select('mp_access_token, mp_refresh_token, mp_token_expires_at, mp_connected_via')
      .eq('restaurant_id', order.restaurant_id)
      .maybeSingle();

    const mpToken = secret ? await freshToken(supabase, order.restaurant_id, secret as Secret) : '';
    // Comissão do app: só no modo conectado (OAuth).
    const applicationFee = (secret as Secret | null)?.mp_connected_via === 'oauth'
      ? feeFor(Number(order.total), await commissionPercent(supabase))
      : null;
    if (!mpToken) {
      return ok({
        error: 'Pagamento online indisponível',
        detail: 'Este restaurante ainda não configurou o recebimento de pagamentos online. Entre em contato com o estabelecimento.',
      });
    }

    const [{ data: profile }, { data: rest }] = await Promise.all([
      supabase.from('profiles').select('name, phone').eq('id', user.id).maybeSingle(),
      supabase.from('restaurants').select('city, state').eq('id', order.restaurant_id).maybeSingle(),
    ]);
    const extra = buildExtra({
      items: (order.items ?? []) as OrderItem[],
      fullName: String(profile?.name || order.client_name || user.user_metadata?.name || 'Cliente'),
      phone: String(profile?.phone ?? ''),
      address: String(order.delivery_address ?? ''),
      city: String(rest?.city ?? 'Floresta'),
      state: String(rest?.state ?? 'PE'),
      createdAt: user.created_at,
      deviceId: typeof deviceId === 'string' ? deviceId : undefined,
    });

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
        extra,
        applicationFee,
      });
      if (!pix) {
        return ok({ error: 'Não foi possível gerar o Pix. A conta Mercado Pago deste estabelecimento pode estar desconectada ou sem chave Pix cadastrada.' });
      }
      // Guarda qual é o Pix atual: o webhook ignora o cancelamento de códigos antigos.
      await supabase.from('orders').update({ payment_id: pix.paymentId, platform_fee: applicationFee }).eq('id', order.id);
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
        extra,
        applicationFee,
      });

      if (result.paymentId && result.status === 'approved' && result.amount + 0.01 >= Number(order.total)) {
        // Resposta veio direto do MP com o token do restaurante: pode liberar já.
        await supabase.from('orders')
          .update({ status: 'pending', payment_status: 'approved', payment_id: result.paymentId, platform_fee: applicationFee })
          .eq('id', order.id)
          .eq('status', 'awaiting_payment');
      } else if (result.paymentId && (result.status === 'in_process' || result.status === 'pending')) {
        // Em análise: a confirmação chega pelo webhook.
        await supabase.from('orders')
          .update({ payment_status: result.status, payment_id: result.paymentId, platform_fee: applicationFee })
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
      ...(applicationFee ? { marketplace_fee: applicationFee } : {}),
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
        error: 'O token de pagamento deste restaurante é inválido ou expirou. Peça ao estabelecimento para reconectar o Mercado Pago em Configurações.',
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
