import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const envPath = join(root, ".env.local");
if (!existsSync(envPath)) {
  const example = readFileSync(join(root, ".env.example"), "utf8");
  const contents = example
    .replace("CODIGOS_HASH_PEPPER=", `CODIGOS_HASH_PEPPER=${randomBytes(32).toString("hex")}`)
    .replace("IP_HASH_SALT=", `IP_HASH_SALT=${randomBytes(32).toString("hex")}`);
  writeFileSync(envPath, contents);
  console.log("Creado .env.local con salts locales seguros; el archivo está ignorado por Git.");
}

const admin = spawnSync("node", ["scripts/generate-admin.mjs"], { cwd: root, stdio: "inherit" });
if (admin.status !== 0) process.exit(admin.status ?? 1);

const docker = spawnSync("docker", ["--version"], { encoding: "utf8", shell: process.platform === "win32" });
if (docker.status !== 0) {
  console.log("Docker no está disponible: se omite Supabase local. El entorno frontend queda preparado.");
  process.exit(0);
}
const start = spawnSync("pnpm", ["exec", "supabase", "start"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
process.exit(start.status ?? 1);
