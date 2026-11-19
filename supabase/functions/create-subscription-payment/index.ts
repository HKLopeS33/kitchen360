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

const PIX_MINUTES = 30;

// Data no formato que o MP aceita em date_of_expiration (horário de Brasília).
function brasiliaIso(d: Date) {
  const t = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return t.toISOString().replace('Z', '-03:00');
}

// Cria um pagamento Pix direto na API (sem página do Mercado Pago) e devolve
// o QR Code / copia-e-cola para o app mostrar.
// Dados extras para o antifraude do Mercado Pago (nome completo, telefone, item).
type Extra = {
  deviceId?: string;
  payer: { first_name?: string; last_name?: string };
  // deno-lint-ignore no-explicit-any
  additionalInfo: Record<string, any>;
};

function buildExtra(p: { fullName: string; phone: string; title: string; amount: number; createdAt?: string; deviceId?: string }): Extra {
  const parts = p.fullName.trim().split(/\s+/).filter(Boolean);
  const first = (parts[0] ?? 'Responsável').slice(0, 60);
  const last = parts.slice(1).join(' ').slice(0, 60) || undefined;
  let digits = p.phone.replace(/\D/g, '');
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
  const phone = digits.length >= 10 ? { area_code: digits.slice(0, 2), number: digits.slice(2) } : undefined;
  return {
    deviceId: p.deviceId && /^[\w.:-]{8,600}$/.test(p.deviceId) ? p.deviceId : undefined,
    payer: { first_name: first, ...(last ? { last_name: last } : {}) },
    additionalInfo: {
      items: [{ id: 'mensalidade', title: p.title.slice(0, 256), category_id: 'services', quantity: 1, unit_price: Number(p.amount.toFixed(2)) }],
      payer: {
        first_name: first,
        ...(last ? { last_name: last } : {}),
        ...(phone ? { phone } : {}),
        ...(p.createdAt ? { registration_date: p.createdAt } : {}),
      },
    },
  };
}

async function createPix(token: string, p: {
  amount: number; description: string; email: string; firstName: string;
  externalRef: string; notificationUrl: string; idempotencyKey: string; extra?: Extra;
}) {
  const res = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': p.idempotencyKey,
      ...(p.extra?.deviceId ? { 'X-meli-session-id': p.extra.deviceId } : {}),
    },
    body: JSON.stringify({
      transaction_amount: Number(p.amount.toFixed(2)),
      description: p.description.slice(0, 200),
      payment_method_id: 'pix',
      payer: { email: p.email, first_name: p.firstName.slice(0, 60), ...(p.extra?.payer ?? {}) },
      ...(p.extra ? { additional_info: p.extra.additionalInfo } : {}),
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
      ...(p.extra?.deviceId ? { 'X-meli-session-id': p.extra.deviceId } : {}),
    },
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

  const APP_URL          = Deno.env.get('APP_URL') ?? 'https://kitchen360app.netlify.app';
  const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SVC_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  try {
    const body = await req.json();
    const { restaurantId, paymentMethod, card, deviceId } = body;

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
    const { data: profile } = await supabase.from('profiles').select('role, name, phone').eq('id', user.id).maybeSingle();
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

    const extra = buildExtra({
      fullName: String(profile?.name || payerName),
      phone: String(profile?.phone ?? ''),
      title: `Mensalidade Floresta Já — ${restaurantName ?? 'Estabelecimento'}`,
      amount: monthlyFee,
      createdAt: user.created_at,
      deviceId: typeof deviceId === 'string' ? deviceId : undefined,
    });

    // Pix dentro do app: devolve QR Code / copia-e-cola em vez de link.
    if (paymentMethod === 'pix') {
      const pix = await createPix(adminToken, {
        amount: monthlyFee,
        description: `Mensalidade Floresta Já — ${restaurantName ?? 'Estabelecimento'}`,
        email: (payerEmail && payerEmail.includes('@')) ? payerEmail : 'pagador@florestaja.com',
        firstName: String(payerName ?? 'Responsável'),
        externalRef: `sub_${restaurantId}`,
        notificationUrl: `${SUPABASE_URL}/functions/v1/payment-webhook?src=sub`,
        idempotencyKey: `sub_${restaurantId}_pix_${Date.now()}`,
        extra,
      });
      if (!pix) return ok({ error: 'Não foi possível gerar o Pix. Verifique o token de pagamento do administrador.' });
      return ok({ pix, monthlyFee });
    }

    // Cartão dentro do app: cobra na hora e, se aprovado, já renova.
    if ((paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && card) {
      const result = await createCardPayment(adminToken, card as CardForm, {
        amount: monthlyFee,
        maxInstallments: 1,
        description: `Mensalidade Floresta Já — ${restaurantName ?? 'Estabelecimento'}`,
        email: (payerEmail && payerEmail.includes('@')) ? payerEmail : 'pagador@florestaja.com',
        externalRef: `sub_${restaurantId}`,
        notificationUrl: `${SUPABASE_URL}/functions/v1/payment-webhook?src=sub`,
        extra,
      });

      if (result.paymentId && result.status === 'approved' && result.amount + 0.01 >= monthlyFee) {
        const { data: rest } = await supabase
          .from('restaurants')
          .select('subscription_active_until, last_subscription_payment_id')
          .eq('id', restaurantId)
          .maybeSingle();
        if (rest && rest.last_subscription_payment_id !== result.paymentId) {
          const base = rest.subscription_active_until && new Date(rest.subscription_active_until) > new Date()
            ? new Date(rest.subscription_active_until)
            : new Date();
          base.setDate(base.getDate() + 30);
          const { error: subErr } = await supabase.from('restaurants').update({
            subscription_status: 'active',
            subscription_active_until: base.toISOString(),
            last_subscription_payment_id: result.paymentId,
          }).eq('id', restaurantId);
          if (subErr) console.error('Erro ao renovar assinatura:', subErr);
        }
      }
      return ok({ card: { status: result.status, statusDetail: result.statusDetail } });
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
