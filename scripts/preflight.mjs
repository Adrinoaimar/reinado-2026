import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const checks = [
  ["Node.js", "node", ["--version"], true],
  ["pnpm", "pnpm", ["--version"], true],
  ["Git", "git", ["--version"], true],
  ["GitHub CLI", "gh", ["--version"], true],
  ["FFmpeg", "ffmpeg", ["-version"], true],
  ["Docker", "docker", ["--version"], false],
  ["Supabase CLI", "pnpm", ["exec", "supabase", "--version"], true],
  ["Wrangler", "pnpm", ["exec", "wrangler", "--version"], true]
];

const rows = [];
for (const [name, command, args, required] of checks) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: process.platform === "win32" });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim().split(/\r?\n/)[0] ?? "";
  rows.push({ name, required, ok: result.status === 0, detail: output || "No disponible" });
}

const gh = spawnSync("gh", ["auth", "status"], { cwd: root, encoding: "utf8", shell: process.platform === "win32" });
rows.push({ name: "Sesión GitHub", required: true, ok: gh.status === 0, detail: gh.status === 0 ? "Autorizada" : "Requiere gh auth login" });

const wrangler = spawnSync("pnpm", ["exec", "wrangler", "whoami"], { cwd: root, encoding: "utf8", shell: process.platform === "win32" });
const wranglerOutput = `${wrangler.stdout ?? ""}${wrangler.stderr ?? ""}`;
const cloudflareAuthenticated = wrangler.status === 0 && !/not authenticated|login/i.test(wranglerOutput);
rows.push({ name: "Sesión Cloudflare", required: false, ok: cloudflareAuthenticated, detail: cloudflareAuthenticated ? "Autorizada" : "Pendiente" });

const supabaseToken = Boolean(process.env.SUPABASE_ACCESS_TOKEN);
rows.push({ name: "Sesión Supabase", required: false, ok: supabaseToken, detail: supabaseToken ? "Token disponible" : "Pendiente" });

const deliverables = join(root, "entregables");
if (!existsSync(deliverables)) mkdirSync(deliverables, { recursive: true });
const report = [
  "# Informe de preflight",
  "",
  `Generado: ${new Date().toISOString()}`,
  "",
  "| Componente | Estado | Obligatorio | Detalle |",
  "|---|---:|---:|---|",
  ...rows.map((row) => `| ${row.name} | ${row.ok ? "OK" : "Pendiente"} | ${row.required ? "Sí" : "No"} | ${row.detail.replaceAll("|", "\\|")} |`),
  "",
  "Docker solo es necesario para ejecutar Supabase completo en local. Las pruebas estáticas, unitarias y los builds no dependen de Docker.",
  "Ningún paso configura facturación, compra dominios ni activa planes de pago."
].join("\n");
writeFileSync(join(deliverables, "PREFLIGHT.md"), report);
console.table(rows);

const missingRequired = rows.filter((row) => row.required && !row.ok);
if (missingRequired.length) {
  console.error(`Preflight incompleto: ${missingRequired.map((row) => row.name).join(", ")}`);
  process.exit(1);
}
