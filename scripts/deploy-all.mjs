import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) throw new Error(`Falló: ${command} ${args.join(" ")}`);
}

run("pnpm", ["build"]);
const projects = [
  { name: process.env.CF_REGISTRO_PROJECT ?? "reinado-registro", directory: join(root, "apps", "registro", "out") },
  { name: process.env.CF_VOTACION_PROJECT ?? "reinado-votacion", directory: join(root, "apps", "votacion", "out") }
];
for (const project of projects) {
  if (!existsSync(project.directory)) throw new Error(`No existe el build: ${project.directory}`);
  const create = spawnSync("pnpm", ["exec", "wrangler", "pages", "project", "create", project.name, "--production-branch", "main"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (create.status !== 0) console.log(`El proyecto ${project.name} probablemente ya existe; se continúa con el despliegue.`);
  run("pnpm", ["exec", "wrangler", "pages", "deploy", project.directory, "--project-name", project.name, "--branch", "main"]);
}
