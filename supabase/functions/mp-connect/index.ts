import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/*
  "Conectar com Mercado Pago" (OAuth do modo marketplace).

  POST { action: 'start' }               → link de autorização do Mercado Pago
  POST { action: 'finish', code, state } → troca o código pelo token da loja
  POST { action: 'disconnect' }          → remove a conexão

  Segredos da função (Edge Functions → Secrets):
    MP_CLIENT_ID      = App ID da aplicação do Floresta Já no Mercado Pago
    MP_CLIENT_SECRET  = Client Secret da mesma aplicação
    APP_URL           = endereço do site (ex.: https://kitchen360app.netlify.app)
  O endereço de retorno cadastrado na aplicação do Mercado Pago precisa ser
    {APP_URL}/mercadopago/retorno
*/

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const ok = (body: unknown) => new Response(JSON.stringify(body), { headers: { ...cors, 'Content-Type': 'application/json' } });

const STATE_TTL_MS = 20 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const CLIENT_ID = Deno.env.get('MP_CLIENT_ID') ?? '';
  const CLIENT_SECRET = Deno.env.get('MP_CLIENT_SECRET') ?? '';
  const APP_URL = (Deno.env.get('APP_URL') ?? 'https://kitchen360app.netlify.app').replace(/\/$/, '');
  const REDIRECT_URI = `${APP_URL}/mercadopago/retorno`;

  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });

  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return ok({ error: 'A conexão com o Mercado Pago ainda não foi configurada pelo administrador.' });
    }

    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: auth } = await db.auth.getUser(jwt);
    const user = auth?.user;
    if (!user) return ok({ error: 'Faça login para continuar.' });

    const { data: restaurant } = await db.from('restaurants').select('id').eq('owner_id', user.id).maybeSingle();
    if (!restaurant) return ok({ error: 'Cadastre seu estabelecimento antes de conectar o Mercado Pago.' });

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    // ── Início: gera o link de autorização ──
    if (action === 'start') {
      const state = crypto.randomUUID();
      await db.from('mp_oauth_states').delete().lt('created_at', new Date(Date.now() - STATE_TTL_MS).toISOString());
      const { error } = await db.from('mp_oauth_states').insert({ state, restaurant_id: restaurant.id, user_id: user.id });
      if (error) throw error;
      const url = new URL('https://auth.mercadopago.com.br/authorization');
      url.searchParams.set('client_id', CLIENT_ID);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('platform_id', 'mp');
      url.searchParams.set('state', state);
      url.searchParams.set('redirect_uri', REDIRECT_URI);
      return ok({ url: url.toString() });
    }

    // ── Retorno: troca o código pelo token da loja ──
    if (action === 'finish') {
      const code = typeof body.code === 'string' ? body.code : '';
      const state = typeof body.state === 'string' ? body.state : '';
      if (!code || !state) return ok({ error: 'Retorno do Mercado Pago incompleto. Tente conectar de novo.' });

      const { data: st } = await db.from('mp_oauth_states').select('restaurant_id, user_id, created_at').eq('state', state).maybeSingle();
      await db.from('mp_oauth_states').delete().eq('state', state);
      if (!st || st.user_id !== user.id || st.restaurant_id !== restaurant.id
          || Date.now() - new Date(st.created_at).getTime() > STATE_TTL_MS) {
        return ok({ error: 'Este link de conexão expirou ou não é seu. Tente conectar de novo.' });
      }

      const res = await fetch('https://api.mercadopago.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        console.error('MP oauth error:', res.status, text.slice(0, 400));
        return ok({ error: 'O Mercado Pago não confirmou a conexão. Tente de novo.' });
      }
      const t = JSON.parse(text) as {
        access_token: string; refresh_token?: string; public_key?: string; user_id?: number | string;
        expires_in?: number; live_mode?: boolean;
      };
      if (!t.access_token) return ok({ error: 'O Mercado Pago não devolveu a autorização. Tente de novo.' });

      const expiresAt = new Date(Date.now() + (Number(t.expires_in) || 15552000) * 1000).toISOString();
      const { error: e1 } = await db.from('restaurant_secrets').upsert({
        restaurant_id: restaurant.id,
        mp_access_token: t.access_token,
        mp_refresh_token: t.refresh_token ?? null,
        mp_user_id: t.user_id != null ? String(t.user_id) : null,
        mp_token_expires_at: expiresAt,
        mp_connected_via: 'oauth',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'restaurant_id' });
      if (e1) throw e1;

      const { error: e2 } = await db.from('restaurants').update({
        mp_public_key: t.public_key ?? null,
        mp_oauth_connected: true,
        mp_connected_at: new Date().toISOString(),
      }).eq('id', restaurant.id);
      if (e2) throw e2;

      return ok({ connected: true, liveMode: t.live_mode ?? null });
    }

    // ── Desconectar ──
    if (action === 'disconnect') {
      await db.from('restaurant_secrets').delete().eq('restaurant_id', restaurant.id);
      await db.from('restaurants').update({ mp_public_key: null, mp_oauth_connected: false, mp_connected_at: null }).eq('id', restaurant.id);
      return ok({ connected: false });
    }

    return ok({ error: 'Ação inválida' });
  } catch (err: any) {
    console.error(err);
    return ok({ error: 'Erro ao conectar com o Mercado Pago. Tente de novo.' });
  }
});
