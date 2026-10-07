import { createClient } from "npm:@supabase/supabase-js@2";

// Exclui um membro por completo (login no Auth + historico, por cascata).
// So admins podem chamar; o proprio admin nao pode se excluir.
// Usa a API de administracao do Auth com a service role, que nunca vai para o navegador.
// Deploy: supabase functions deploy delete-member   (verify_jwt ligado)

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Apaga os arquivos do membro nos buckets privados (melhor esforco)
async function removeFiles(memberId: string) {
  for (const bucket of ["comprovantes", "avatars"]) {
    try {
      const { data: files } = await supabase.storage.from(bucket).list(memberId, { limit: 1000 });
      const paths = (files ?? []).filter((f) => f.id).map((f) => `${memberId}/${f.name}`);
      if (paths.length > 0) await supabase.storage.from(bucket).remove(paths);
    } catch (e) {
      console.error("falha ao limpar arquivos", bucket, (e as Error).message);
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Não autenticado" }, 401);

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const caller = userData?.user;
  if (userError || !caller) return json({ error: "Sessão inválida" }, 401);

  const { data: isAdmin } = await supabase.from("admins").select("member_id").eq("member_id", caller.id).maybeSingle();
  if (!isAdmin) return json({ error: "Apenas admins podem excluir membros" }, 403);

  let targetId = "";
  try {
    const body = await req.json();
    targetId = String(body?.target_id ?? "");
  } catch {
    return json({ error: "Corpo inválido" }, 400);
  }
  if (!UUID.test(targetId)) return json({ error: "Membro inválido" }, 400);
  if (targetId === caller.id) return json({ error: "Você não pode excluir o próprio usuário" }, 400);

  const { data: member } = await supabase.from("members").select("id").eq("id", targetId).maybeSingle();
  if (!member) return json({ error: "Membro não encontrado" }, 404);

  const { error: deleteError } = await supabase.auth.admin.deleteUser(targetId);
  if (deleteError) {
    console.error("falha ao excluir usuario", deleteError.message);
    return json({ error: `Não foi possível excluir: ${deleteError.message}` }, 500);
  }

  await removeFiles(targetId);
  return json({ ok: true });
});
