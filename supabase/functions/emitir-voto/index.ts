import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.9";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

type VoteBody = { candidataId?: unknown; codigo?: unknown; turnstileToken?: unknown };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function normalizeCode(value: string): string {
  return value.normalize("NFKC").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, code: "ERROR", message: "Método no permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  const codePepper = Deno.env.get("CODIGOS_HASH_PEPPER");
  const ipSalt = Deno.env.get("IP_HASH_SALT");
  if (!supabaseUrl || !anonKey || !serviceKey || !turnstileSecret || !codePepper || !ipSalt) {
    return json({ ok: false, code: "ERROR", message: "El sistema no está configurado." }, 503);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json({ ok: false, code: "NO_AUTORIZADO", message: "Inicia una sesión válida." }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return json({ ok: false, code: "NO_AUTORIZADO", message: "La sesión no es válida." }, 401);
  }

  let body: VoteBody;
  try {
    body = await request.json() as VoteBody;
  } catch {
    return json({ ok: false, code: "ERROR", message: "Solicitud inválida." }, 400);
  }
  if (typeof body.candidataId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.candidataId) ||
      typeof body.codigo !== "string" || body.codigo.length > 64 ||
      typeof body.turnstileToken !== "string" || body.turnstileToken.length > 2048) {
    return json({ ok: false, code: "CODIGO_INVALIDO", message: "Revisa el código e inténtalo de nuevo." }, 400);
  }

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = await sha256(`${ipSalt}:${ip}`);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await admin.from("intentos_seguridad")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("accion", "emitir_voto")
    .eq("resultado", "rechazo")
    .gte("creado_en", windowStart);
  if ((count ?? 0) >= 8) {
    return json({ ok: false, code: "LIMITE_INTENTOS", message: "Demasiados intentos. Espera unos minutos." }, 429);
  }

  const turnstileResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: turnstileSecret, response: body.turnstileToken, remoteip: ip, idempotency_key: crypto.randomUUID() })
  });
  const turnstile = await turnstileResponse.json() as { success?: boolean };
  if (!turnstile.success) {
    await admin.from("intentos_seguridad").insert({ ip_hash: ipHash, accion: "emitir_voto", resultado: "rechazo" });
    return json({ ok: false, code: "CODIGO_INVALIDO", message: "No pudimos verificar que seas una persona. Inténtalo otra vez." }, 400);
  }

  const provider = userData.user.app_metadata?.provider;
  const isAnonymous = userData.user.is_anonymous === true;
  const { data: config } = await admin.from("configuracion_votacion")
    .select("modo_acceso, google_login_activo, dominio_correo_permitido")
    .eq("id", 1).single();
  if (config?.modo_acceso !== "codigo" && (isAnonymous || provider !== "google")) {
    return json({ ok: false, code: "NO_AUTORIZADO", message: "Este evento requiere iniciar sesión con Google." }, 401);
  }
  const email = userData.user.email ?? null;
  if (config?.dominio_correo_permitido && (!email || !email.toLowerCase().endsWith(`@${config.dominio_correo_permitido.toLowerCase()}`))) {
    return json({ ok: false, code: "NO_AUTORIZADO", message: "Tu cuenta no pertenece al dominio autorizado." }, 403);
  }

  await admin.from("votantes").upsert({
    id: userData.user.id,
    email,
    nombre: typeof userData.user.user_metadata?.full_name === "string" ? userData.user.user_metadata.full_name : null,
    metodo_acceso: isAnonymous ? "anonimo_codigo" : "google",
    ultimo_acceso: new Date().toISOString()
  });

  const requiresCode = config?.modo_acceso !== "google";
  const normalizedCode = normalizeCode(body.codigo);
  if (requiresCode && normalizedCode.length < 8) {
    return json({ ok: false, code: "CODIGO_INVALIDO", message: "El código no es válido, ya fue usado o venció." }, 400);
  }
  const codeHash = requiresCode
    ? await sha256(`${codePepper}:${normalizedCode}`)
    : "0".repeat(64);
  const { data: result, error } = await admin.rpc("emitir_voto_seguro", {
    p_votante_id: userData.user.id,
    p_codigo_hash: codeHash,
    p_candidata_id: body.candidataId,
    p_ip_hash: ipHash,
    p_user_agent: request.headers.get("user-agent") ?? ""
  });
  const ok = !error && result?.ok === true;
  await admin.from("intentos_seguridad").insert({ ip_hash: ipHash, accion: "emitir_voto", resultado: ok ? "exito" : "rechazo" });

  if (!ok) {
    const code = result?.code === "VOTACION_CERRADA" ? "VOTACION_CERRADA" : "CODIGO_INVALIDO";
    const message = code === "VOTACION_CERRADA" ? "La votación está cerrada." : "El código no es válido, ya fue usado o venció.";
    return json({ ok: false, code, message }, error ? 500 : 400);
  }
  return json({ ok: true, code: "VOTO_REGISTRADO", message: "Tu voto fue registrado. ¡Gracias por participar!" });
});
