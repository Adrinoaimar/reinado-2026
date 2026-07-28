import { spawnSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";

const inputArg = process.argv[2];
if (!inputArg) {
  console.error("Uso: pnpm compress:media <video>");
  process.exit(1);
}
const input = resolve(inputArg);
const outputDir = resolve(process.argv[3] ?? "entregables/media-comprimida");
mkdirSync(outputDir, { recursive: true });
const stem = basename(input, extname(input));
const video = join(outputDir, `${stem}-720p.mp4`);
const poster = join(outputDir, `${stem}-poster.webp`);
const maxVideoBytes = 12 * 1024 * 1024;

let videoResult = spawnSync("ffmpeg", ["-y", "-i", input, "-vf", "scale=-2:min(720\\,ih)", "-c:v", "libx264", "-preset", "medium", "-crf", "27", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", video], { stdio: "inherit" });
if (videoResult.status !== 0) process.exit(videoResult.status ?? 1);
if (statSync(video).size > maxVideoBytes) {
  console.warn("El primer resultado supera 12 MB; aplicando una segunda compresión.");
  videoResult = spawnSync("ffmpeg", ["-y", "-i", input, "-vf", "scale=-2:min(540\\,ih)", "-c:v", "libx264", "-preset", "slow", "-crf", "32", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", video], { stdio: "inherit" });
  if (videoResult.status !== 0) process.exit(videoResult.status ?? 1);
}
if (statSync(video).size > maxVideoBytes) {
  console.error("No fue posible reducir el video a 12 MB. Recorta su duración y vuelve a intentarlo.");
  process.exit(1);
}
const posterResult = spawnSync("ffmpeg", ["-y", "-ss", "00:00:01", "-i", video, "-frames:v", "1", "-vf", "scale=1280:-2", poster], { stdio: "inherit" });
process.exit(posterResult.status ?? 1);
