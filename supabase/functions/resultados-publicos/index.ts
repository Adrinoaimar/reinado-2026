import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.9";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ resultados: [] }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ resultados: [] }, 503);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: config, error: configError } = await admin
    .from("configuracion_votacion")
    .select("mostrar_resultados")
    .eq("id", 1)
    .single();
  if (configError || !config?.mostrar_resultados) return json({ resultados: [] });

  const { data: candidates, error: candidatesError } = await admin
    .from("candidatas")
    .select("id,nombre_completo")
    .eq("activa", true)
    .order("orden");
  if (candidatesError) return json({ resultados: [] }, 500);

  const counts = await Promise.all(
    (candidates ?? []).map(async (candidate) => {
      const { count, error } = await admin
        .from("votos")
        .select("id", { count: "exact", head: true })
        .eq("candidata_id", candidate.id);
      if (error) throw error;
      return {
        candidata_id: candidate.id,
        nombre_completo: candidate.nombre_completo,
        votos: count ?? 0
      };
    })
  ).catch(() => null);
  if (!counts) return json({ resultados: [] }, 500);

  const total = counts.reduce((sum, result) => sum + result.votos, 0);
  const resultados = counts
    .map((result) => ({
      ...result,
      porcentaje: total === 0 ? 0 : Math.round((result.votos * 10_000) / total) / 100
    }))
    .sort((a, b) => b.votos - a.votos || a.nombre_completo.localeCompare(b.nombre_completo));
  return json({ resultados });
});
