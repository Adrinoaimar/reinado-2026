import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.9";

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response("Método no permitido", { status: 405 });
  const bootstrapSecret = Deno.env.get("ADMIN_BOOTSTRAP_SECRET");
  const supplied = request.headers.get("x-bootstrap-secret");
  if (!bootstrapSecret || !supplied || supplied !== bootstrapSecret) return new Response("No autorizado", { status: 401 });

  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return new Response("Sin configuración", { status: 503 });
  const body = await request.json() as { email?: unknown; password?: unknown; nombre?: unknown };
  if (typeof body.email !== "string" || typeof body.password !== "string" || body.password.length < 16 || typeof body.nombre !== "string") {
    return new Response("Datos inválidos", { status: 400 });
  }
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.admin.createUser({ email: body.email, password: body.password, email_confirm: true });
  if (error || !data.user) return new Response("No se pudo crear el usuario", { status: 400 });
  const { error: insertError } = await admin.from("administradores").insert({ id: data.user.id, nombre: body.nombre, rol: "superadmin", debe_cambiar_password: true });
  if (insertError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return new Response("No se pudo asignar el rol", { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true, userId: data.user.id }), { headers: { "Content-Type": "application/json" } });
});
