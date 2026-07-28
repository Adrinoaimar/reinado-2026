import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
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

const videoResult = spawnSync("ffmpeg", ["-y", "-i", input, "-vf", "scale=-2:min(720\\,ih)", "-c:v", "libx264", "-preset", "medium", "-crf", "27", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", video], { stdio: "inherit" });
if (videoResult.status !== 0) process.exit(videoResult.status ?? 1);
const posterResult = spawnSync("ffmpeg", ["-y", "-ss", "00:00:01", "-i", video, "-frames:v", "1", "-vf", "scale=1280:-2", poster], { stdio: "inherit" });
process.exit(posterResult.status ?? 1);
