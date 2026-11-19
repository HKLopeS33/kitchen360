import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

/*
  Notificação no celular com o app fechado (Web Push).

  GET  → devolve a chave pública VAPID (o app usa para inscrever o aparelho).
  POST { notification_id } → chamado pelo banco quando nasce uma notificação:
        envia para todos os aparelhos do dono da notificação.

  As chaves VAPID são criadas na primeira chamada e ficam em
  platform_secrets (ninguém precisa copiar chave nenhuma).
  A verificação de JWT fica DESLIGADA: o banco chama sem login. É seguro
  porque a função só entrega notificações que já existem, uma única vez.
*/

const SUBJECT = 'https://kitchen360app.netlify.app';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

type Keys = { publicKey: string; privateKey: string };

async function vapidKeys(db: SupabaseClient): Promise<Keys> {
  const read = async () => {
    const { data } = await db.from('platform_secrets').select('value').eq('key', 'vapid_keys').maybeSingle();
    try { return data?.value ? JSON.parse(data.value) as Keys : null; } catch { return null; }
  };
  const existing = await read();
  if (existing?.publicKey && existing?.privateKey) return existing;
  // Primeira vez: cria e grava. Se duas chamadas criarem juntas, vale a primeira.
  const k = webpush.generateVAPIDKeys();
  await db.from('platform_secrets')
    .upsert({ key: 'vapid_keys', value: JSON.stringify(k) }, { onConflict: 'key', ignoreDuplicates: true });
  return (await read()) ?? k;
}

type Notif = { id: string; user_id: string; type: string; title: string; body: string | null; data: Record<string, any> | null };

function targetUrl(n: Notif) {
  const d = n.data ?? {};
  if (n.type === 'new_order') return '/meu-restaurante';
  if (n.type === 'order_status') return d.restaurant_id ? '/meu-restaurante' : d.order_id ? `/pedido/${d.order_id}` : '/meus-pedidos';
  if (n.type === 'promotion' && d.restaurant_id) return `/restaurantes/${d.restaurant_id}`;
  return '/';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });

  try {
    const keys = await vapidKeys(db);

    if (req.method === 'GET') return json({ publicKey: keys.publicKey });
    if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

    const { notification_id } = await req.json().catch(() => ({}));
    if (typeof notification_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(notification_id)) {
      return json({ error: 'notification_id inválido' }, 400);
    }

    // "Pega" a notificação uma única vez (chamadas repetidas não reenviam).
    const { data: n } = await db.from('notifications')
      .update({ pushed_at: new Date().toISOString() })
      .eq('id', notification_id)
      .is('pushed_at', null)
      .select('id, user_id, type, title, body, data')
      .maybeSingle();
    if (!n) return json({ sent: 0, skipped: true });

    const { data: subs } = await db.from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', n.user_id);
    if (!subs?.length) return json({ sent: 0 });

    webpush.setVapidDetails(SUBJECT, keys.publicKey, keys.privateKey);
    const notif = n as Notif;
    const payload = JSON.stringify({
      title: notif.title,
      body: notif.body ?? '',
      url: targetUrl(notif),
      tag: `notif-${notif.id}`,
      type: notif.type,
    });
    const urgent = notif.type === 'new_order';

    let sent = 0;
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: urgent ? 900 : 3600, urgency: urgent ? 'high' : 'normal' },
        );
        sent++;
        await db.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).eq('endpoint', s.endpoint);
      } catch (err: any) {
        // Aparelho desinscrito ou app desinstalado: remove.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        } else {
          console.error('push falhou', err?.statusCode, err?.body ?? err?.message);
        }
      }
    }));

    return json({ sent });
  } catch (err: any) {
    console.error(err);
    return json({ error: err?.message ?? 'Erro' }, 500);
  }
});
