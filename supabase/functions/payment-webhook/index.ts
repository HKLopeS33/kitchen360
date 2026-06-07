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
  const MP_ACCESS_TOKEN     = Deno.env.get('MP_ACCESS_TOKEN') ?? '';
  const SUPABASE_URL        = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  try {
    const url   = new URL(req.url);
    const topic = url.searchParams.get('topic') ?? url.searchParams.get('type');
    const id    = url.searchParams.get('id') ?? url.searchParams.get('data.id');

    console.log('webhook received:', { topic, id });

    if (topic !== 'payment') return new Response('ok', { status: 200 });
    if (!id) return new Response('no id', { status: 400 });

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
    });

    if (!mpRes.ok) return new Response('MP error', { status: 502 });

    const payment     = await mpRes.json();
    const mpStatus    = payment.status as string;
    const orderNumber = payment.external_reference;
    const newStatus   = statusMap[mpStatus] ?? 'pending';

    console.log('payment status:', mpStatus, '→ order status:', newStatus);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, payment_status: mpStatus, payment_id: String(id) })
      .eq('order_number', Number(orderNumber));

    if (error) console.error('Supabase update error:', error);

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('webhook error:', err);
    return new Response(String(err), { status: 500 });
  }
});
