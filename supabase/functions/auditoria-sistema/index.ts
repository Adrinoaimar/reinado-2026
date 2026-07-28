import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.9";

Deno.serve(async (request: Request) => {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const auth = request.headers.get("Authorization");
  if (!url || !anon || !service || !auth) return new Response("No autorizado", { status: 401 });
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: userData } = await userClient.auth.getUser();
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: adminRow } = await admin.from("administradores").select("id").eq("id", userData.user?.id ?? "").eq("activo", true).maybeSingle();
  if (!adminRow) return new Response("No autorizado", { status: 403 });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ count: rejected }, { count: votes }, { count: available }] = await Promise.all([
    admin.from("intentos_seguridad").select("id", { head: true, count: "exact" }).eq("resultado", "rechazo").gte("creado_en", since),
    admin.from("votos").select("id", { head: true, count: "exact" }),
    admin.from("codigos_votacion").select("id", { head: true, count: "exact" }).eq("activo", true).eq("usado", false)
  ]);
  await admin.rpc("limpiar_intentos_antiguos");
  return new Response(JSON.stringify({ last24hRejected: rejected ?? 0, totalVotes: votes ?? 0, availableCodes: available ?? 0 }), { headers: { "Content-Type": "application/json" } });
});
