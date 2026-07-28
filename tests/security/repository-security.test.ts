import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const migration = readFileSync(join(root, "supabase/migrations/20260728045323_initial_schema.sql"), "utf8");
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

  it("keeps sensitive deliverables out of Git", () => {
    expect(gitignore).toContain("entregables/CREDENCIALES_ADMIN.txt");
    expect(gitignore).toContain("entregables/codigos-*.csv");
  });
});
