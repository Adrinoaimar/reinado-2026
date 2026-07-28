import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import "dotenv/config";

const root = process.cwd();
const localEnv = join(root, ".env.local");
if (existsSync(localEnv)) {
  const text = readFileSync(localEnv, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (match?.[1] && !process.env[match[1]]) process.env[match[1]] = match[2] ?? "";
  }
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32", env: process.env });
  if (result.status !== 0) throw new Error(`Falló: ${command} ${args.join(" ")}`);
}

const projectRef = process.env.SUPABASE_PROJECT_REF;
if (!process.env.SUPABASE_ACCESS_TOKEN || !projectRef) {
  console.error("Falta SUPABASE_ACCESS_TOKEN o SUPABASE_PROJECT_REF. Autoriza Supabase y completa una sola vez .env.local.");
  process.exit(2);
}

run("pnpm", ["exec", "supabase", "link", "--project-ref", projectRef]);
run("pnpm", ["exec", "supabase", "db", "push", "--linked", "--include-seed"]);
for (const name of ["emitir-voto", "generar-codigos", "crear-admin-inicial", "auditoria-sistema"]) {
  run("pnpm", ["exec", "supabase", "functions", "deploy", name, "--project-ref", projectRef]);
}
const secrets = ["TURNSTILE_SECRET_KEY", "CODIGOS_HASH_PEPPER", "IP_HASH_SALT"].filter((name) => process.env[name]);
if (secrets.length) {
  run("pnpm", ["exec", "supabase", "secrets", "set", "--project-ref", projectRef, ...secrets.map((name) => `${name}=${process.env[name]}`)]);
}
console.log("Infraestructura Supabase aplicada sin activar facturación.");
