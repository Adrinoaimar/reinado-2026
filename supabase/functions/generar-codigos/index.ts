import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.9";

function normalize(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function newCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(26));
  const text = [...bytes].map((byte) => alphabet[byte & 31]).join("");
  return `REY-${text.slice(0, 5)}-${text.slice(5, 10)}-${text.slice(10, 15)}-${text.slice(15, 20)}-${text.slice(20)}`;
}

Deno.serve(async (request: Request) => {
  const headers = { "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN_ADMIN") ?? "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Content-Type": "application/json" };
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const pepper = Deno.env.get("CODIGOS_HASH_PEPPER");
  const auth = request.headers.get("Authorization");
  if (!url || !anon || !service || !pepper || !auth) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers });

  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers });
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: adminRow } = await admin.from("administradores").select("id").eq("id", userData.user.id).eq("activo", true).maybeSingle();
  if (!adminRow) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403, headers });

  const body = await request.json() as { cantidad?: unknown; lote?: unknown; etiqueta?: unknown };
  if (!Number.isInteger(body.cantidad) || Number(body.cantidad) < 1 || Number(body.cantidad) > 1000 ||
      typeof body.lote !== "string" || body.lote.length < 2 || body.lote.length > 120 ||
      (body.etiqueta !== undefined && typeof body.etiqueta !== "string")) {
    return new Response(JSON.stringify({ error: "Datos inválidos" }), { status: 400, headers });
  }
  const codes = Array.from({ length: Number(body.cantidad) }, newCode);
  const rows = await Promise.all(codes.map(async (code) => ({
    codigo_hash: await sha256(`${pepper}:${normalize(code)}`),
    lote: body.lote,
    etiqueta: typeof body.etiqueta === "string" ? body.etiqueta : null
  })));
  const { error } = await admin.from("codigos_votacion").insert(rows);
  if (error) return new Response(JSON.stringify({ error: "No se pudo generar el lote" }), { status: 500, headers });
  return new Response(JSON.stringify({ codes }), { headers });
});
