import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Quando o pagamento é aprovado, o pedido sai de "aguardando pagamento"
// e entra na fila do estabelecimento como "pending" (recém-recebido).
// Pagamentos ainda pendentes mantêm o pedido invisível ao estabelecimento.
const statusMap: Record<string, string> = {
  approved:   'pending',
  pending:    'awaiting_payment',
  in_process: 'awaiting_payment',
  rejected:   'cancelled',
  cancelled:  'cancelled',
  refunded:   'cancelled',
};

Deno.serve(async (req) => {
  const FALLBACK_MP_TOKEN    = Deno.env.get('MP_ACCESS_TOKEN') ?? '';
  const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  try {
    const url   = new URL(req.url);
    const topic = url.searchParams.get('topic') ?? url.searchParams.get('type');
    const id    = url.searchParams.get('id') ?? url.searchParams.get('data.id');

    console.log('webhook received:', { topic, id });

    if (topic !== 'payment') return new Response('ok', { status: 200 });
    if (!id) return new Response('no id', { status: 400 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // -------------------------------------------------------------
    // MODELO 3: cada restaurante tem sua própria conta/token do MP.
    // O pagamento foi criado na conta do restaurante, então a consulta
    // à API do MP precisa ser feita com o token DESSE restaurante —
    // um token genérico da plataforma não tem permissão para ver o pagamento.
    //
    // Para descobrir de qual restaurante é, primeiro tentamos consultar
    // o pagamento com o token de fallback (caso exista) só para pegar o
    // external_reference (= número do pedido). Se isso falhar, tentamos
    // localizar o pedido via payment_id já salvo, ou aceitamos que o
    // fluxo normal (preference -> external_reference) já nos dá o pedido.
    // -------------------------------------------------------------

    let payment: any = null;
    let usedToken = '';

    // 1ª tentativa: token de fallback da plataforma (se configurado)
    if (FALLBACK_MP_TOKEN) {
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { 'Authorization': `Bearer ${FALLBACK_MP_TOKEN}` },
      });
      if (r.ok) { payment = await r.json(); usedToken = FALLBACK_MP_TOKEN; }
    }

    // Se não conseguimos com o token de fallback, precisamos achar o
    // restaurante certo. Para isso, buscamos pedidos recentes ainda
    // aguardando pagamento e tentamos o token de cada restaurante até
    // um deles conseguir ler o pagamento (ele só pertence a UMA conta).
    if (!payment) {
      const { data: candidates } = await supabase
        .from('orders')
        .select('id, order_number, restaurant_id, restaurants!inner(mp_access_token)')
        .eq('status', 'awaiting_payment')
        .order('created_at', { ascending: false })
        .limit(50);

      const seen = new Set<string>();
      for (const o of (candidates ?? []) as any[]) {
        const token = o.restaurants?.mp_access_token?.trim();
        if (!token || seen.has(token)) continue;
        seen.add(token);
        const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (r.ok) {
          payment = await r.json();
          usedToken = token;
          break;
        }
      }
    }

    if (!payment) {
      console.error('Não foi possível obter o pagamento com nenhum token disponível');
      return new Response('payment not accessible', { status: 200 });
    }

    const mpStatus    = payment.status as string;
    const orderNumber = payment.external_reference;
    const newStatus   = statusMap[mpStatus] ?? 'pending';

    console.log('payment status:', mpStatus, '→ order status:', newStatus, '| order_number:', orderNumber, '| token used:', usedToken ? usedToken.slice(0, 12) + '...' : 'none');

    const { data: updatedRows, error } = await supabase
      .from('orders')
      .update({ status: newStatus, payment_status: mpStatus, payment_id: String(id) })
      .eq('order_number', Number(orderNumber))
      .select('id, order_number, status');

    if (error) console.error('Supabase update error:', error);
    console.log('updated orders:', updatedRows);

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('webhook error:', err);
    return new Response(String(err), { status: 500 });
  }
});
