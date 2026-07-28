import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const localEnv = join(root, ".env.local");
if (existsSync(localEnv)) {
  for (const line of readFileSync(localEnv, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (match?.[1] && !process.env[match[1]]) {
      process.env[match[1]] = match[2]?.replace(/^"|"$/g, "") ?? "";
    }
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env
  });
  if (result.status !== 0) throw new Error(`Falló: ${command} ${args.join(" ")}`);
}

for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY"]) {
  if (!process.env[name]) throw new Error(`Falta ${name} para compilar producción.`);
}

run("pnpm", ["build"]);
const projects = [
  { name: process.env.CF_REGISTRO_PROJECT ?? "reinado-registro", directory: join(root, "apps", "registro", "out") },
  { name: process.env.CF_VOTACION_PROJECT ?? "reinado-votacion", directory: join(root, "apps", "votacion", "out") }
];
const projectList = spawnSync("pnpm", ["exec", "wrangler", "pages", "project", "list", "--json"], {
  cwd: root,
  encoding: "utf8",
  shell: process.platform === "win32",
  env: process.env
});
if (projectList.status !== 0) throw new Error("No se pudo consultar Cloudflare Pages.");
const existingProjects = JSON.parse(projectList.stdout);

for (const project of projects) {
  if (!existsSync(project.directory)) throw new Error(`No existe el build: ${project.directory}`);
  if (!existingProjects.some((item) => item["Project Name"] === project.name)) {
    run("pnpm", ["exec", "wrangler", "pages", "project", "create", project.name, "--production-branch", "main"]);
  }
  run("pnpm", ["exec", "wrangler", "pages", "deploy", project.directory, "--project-name", project.name, "--branch", "main"]);
}
