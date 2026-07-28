import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";

const targetDir = join(process.cwd(), "entregables");
const target = join(targetDir, "CREDENCIALES_ADMIN.txt");
if (existsSync(target)) {
  console.log("Las credenciales administrativas ya existen; no se reemplazaron.");
  process.exit(0);
}
mkdirSync(targetDir, { recursive: true });
const password = `${randomBytes(12).toString("base64url")}!aA7`;
const email = "admin@reinado.local";
writeFileSync(target, [
  "REINADO 2026 — CREDENCIALES ADMINISTRATIVAS",
  "",
  `Correo: ${email}`,
  `Contraseña temporal: ${password}`,
  "",
  "Esta contraseña debe cambiarse después del primer acceso.",
  "No enviar por correo ni subir a Git."
].join("\n"), { mode: 0o600 });
console.log("Credenciales administrativas generadas localmente en entregables/CREDENCIALES_ADMIN.txt.");
