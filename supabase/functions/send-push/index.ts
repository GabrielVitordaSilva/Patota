import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

// Envia o push de uma notificacao do app (chamada pelo trigger do banco) e
// entrega a chave publica VAPID ao navegador. As chaves sao geradas aqui na
// primeira execucao e ficam so em public.push_config (sem acesso de clientes).
// Deploy: supabase functions deploy send-push   (verify_jwt ligado)

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const SUBJECT = "https://patota.pages.dev";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

async function getKeys() {
  const { data } = await supabase.from("push_config").select("public_key, private_key, subject").eq("id", 1).maybeSingle();
  if (data) return data;

  const keys = webpush.generateVAPIDKeys();
  const row = { id: 1, public_key: keys.publicKey, private_key: keys.privateKey, subject: SUBJECT };
  const { error } = await supabase.from("push_config").insert(row);
  if (!error) return row;

  // Outra chamada criou ao mesmo tempo: usa a que ficou salva
  const { data: again, error: readError } = await supabase.from("push_config").select("public_key, private_key, subject").eq("id", 1).single();
  if (readError) throw readError;
  return again;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "metodo nao permitido" }, 405);

  let body: { action?: string; id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "corpo invalido" }, 400);
  }

  try {
    const keys = await getKeys();

    if (body.action === "public_key") {
      return json({ publicKey: keys.public_key });
    }

    if (!body.id || typeof body.id !== "string") return json({ error: "id obrigatorio" }, 400);

    // Reivindica a notificacao: so a primeira chamada envia (evita reenvio/abuso)
    const { data: n, error: claimError } = await supabase
      .from("notifications")
      .update({ push_enviado_em: new Date().toISOString() })
      .eq("id", body.id)
      .is("push_enviado_em", null)
      .select("member_id, titulo, mensagem, link")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!n) return json({ skipped: true });

    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("member_id", n.member_id);
    if (subsError) throw subsError;
    if (!subs || subs.length === 0) return json({ sent: 0 });

    webpush.setVapidDetails(keys.subject, keys.public_key, keys.private_key);
    const payload = JSON.stringify({ title: n.titulo, body: n.mensagem ?? "", url: n.link ?? "/" });

    let sent = 0;
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60 * 24, urgency: "normal" },
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Aparelho desinstalou ou revogou a permissao
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          console.error("falha no envio push", status, (e as Error).message);
        }
      }
    }));

    return json({ sent, total: subs.length });
  } catch (e) {
    console.error("send-push erro", (e as Error).message);
    return json({ error: "erro interno" }, 500);
  }
});
