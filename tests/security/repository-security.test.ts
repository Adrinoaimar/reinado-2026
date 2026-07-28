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
});
