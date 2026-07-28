import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const migration = readFileSync(join(root, "supabase/migrations/20260728045323_initial_schema.sql"), "utf8");
const googleModeMigration = readFileSync(
  join(root, "supabase/migrations/20260728061653_complete_google_mode_and_audit.sql"),
  "utf8"
);
const edge = readFileSync(join(root, "supabase/functions/emitir-voto/index.ts"), "utf8");
const codeGeneratorEdge = readFileSync(join(root, "supabase/functions/generar-codigos/index.ts"), "utf8");
const publicResultsEdge = readFileSync(join(root, "supabase/functions/resultados-publicos/index.ts"), "utf8");
const retentionMigration = readFileSync(
  join(root, "supabase/migrations/20260728160105_public_results_and_retention_job.sql"),
  "utf8"
);
const publicPolicyMigration = readFileSync(
  join(root, "supabase/migrations/20260728190731_fix_public_candidate_policy.sql"),
  "utf8"
);
const supabaseConfig = readFileSync(join(root, "supabase/config.toml"), "utf8");
const votingUi = readFileSync(join(root, "apps/votacion/components/voting-experience.tsx"), "utf8");
const gitignore = readFileSync(join(root, ".gitignore"), "utf8");

describe("security invariants", () => {
  it("enforces unique voter and code constraints", () => {
    expect(migration).toMatch(/votante_id uuid not null unique/);
    expect(migration).toMatch(/codigo_id uuid unique/);
  });

  it("uses row locks and server-only RPC grants", () => {
    expect(migration).toContain("for update;");
    expect(migration).toContain("revoke all on function public.emitir_voto_seguro");
    expect(migration).toContain("grant execute on function public.emitir_voto_seguro");
    expect(migration).not.toMatch(/grant execute on function public\.emitir_voto_seguro\([^;]+\)\s+to authenticated;/);
  });

  it("validates Turnstile server-side and hashes the IP", () => {
    expect(edge).toContain("turnstile/v0/siteverify");
    expect(edge).toContain("IP_HASH_SALT");
    expect(edge).toContain("crypto.subtle.digest");
  });

  it("supports Google-only voting without weakening code modes", () => {
    expect(googleModeMigration).toContain("if v_modo = 'google' then");
    expect(googleModeMigration).toContain("where codigo_hash = p_codigo_hash");
    expect(googleModeMigration).toContain("for update;");
    expect(edge).toContain('const requiresCode = config?.modo_acceso !== "google"');
    expect(edge).toContain('"0".repeat(64)');
  });

  it("audits administrator changes without storing code hashes", () => {
    expect(googleModeMigration).toContain("private.auditar_cambio_admin");
    expect(googleModeMigration).toContain("- 'codigo_hash'");
    expect(googleModeMigration.match(/execute function private\.auditar_cambio_admin\(\)/g)).toHaveLength(3);
  });

  it("keeps sensitive deliverables out of Git", () => {
    expect(gitignore).toContain("entregables/CREDENCIALES_ADMIN.txt");
    expect(gitignore).toContain("entregables/codigos-*.csv");
  });

  it("generates at least 128 bits of visible code entropy", () => {
    expect(codeGeneratorEdge).toContain("new Uint8Array(26)");
    expect(codeGeneratorEdge).toContain("byte & 31");
    expect(codeGeneratorEdge).not.toContain("slice(0, 12)");
  });

  it("publishes only aggregate results from a server-side boundary", () => {
    expect(publicResultsEdge).toContain('select("mostrar_resultados")');
    expect(publicResultsEdge).toContain('select("id", { count: "exact", head: true })');
    expect(publicResultsEdge).not.toContain("votante_id");
    expect(publicResultsEdge).not.toContain("codigo_hash");
    expect(retentionMigration).not.toContain("security definer");
  });

  it("schedules automatic retention through supported pg_cron functions", () => {
    expect(retentionMigration).toContain("cron.schedule");
    expect(retentionMigration).toContain("cron.unschedule");
    expect(retentionMigration).toContain("reinado-limpiar-intentos");
    expect(retentionMigration).toContain("limpiar_intentos_antiguos");
  });

  it("requires an explicit Turnstile callback before voting", () => {
    expect(votingUi).toContain("data-callback");
    expect(votingUi).toContain("turnstileToken");
    expect(votingUi).toContain("!turnstileToken");
  });

  it("keeps public candidate reads independent from administrator privileges", () => {
    expect(publicPolicyMigration).toContain("using (activa = true)");
    expect(publicPolicyMigration).not.toContain("es_admin()");
    expect(publicPolicyMigration).toContain("grant usage on schema private to authenticated, service_role");
  });

  it("enables anonymous sessions only on the production-aware auth configuration", () => {
    expect(supabaseConfig).toContain("enable_anonymous_sign_ins = true");
    expect(supabaseConfig).toContain('site_url = "https://reinado-votacion.pages.dev"');
    expect(supabaseConfig).toContain('"https://reinado-registro.pages.dev/**"');
  });
});
