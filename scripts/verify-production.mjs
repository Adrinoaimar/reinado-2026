import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const localEnv = join(root, ".env.local");

if (existsSync(localEnv)) {
  for (const line of readFileSync(localEnv, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

const targets = [
  ["Registro", process.env.REGISTRO_PRODUCTION_URL],
  ["Votación", process.env.VOTACION_PRODUCTION_URL],
];

let failed = false;

for (const [name, url] of targets) {
  if (!url) {
    console.error(`${name}: falta URL de producción.`);
    failed = true;
    continue;
  }

  const response = await fetch(url, { redirect: "follow" });
  const html = await response.text();
  const expected = name === "Registro" ? "Panel" : "Tu voto";
  const ok = response.ok && html.includes(expected);

  console.log(
    `${name}: ${response.status} ${ok ? "OK" : "respuesta inesperada"} — ${response.url}`,
  );
  failed ||= !ok;
}

if (failed) {
  process.exit(1);
}
