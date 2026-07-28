import type { NextConfig } from "next";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  transpilePackages: ["@reinado/ui", "@reinado/types", "@reinado/validation", "@reinado/supabase-client"],
  turbopack: {
    root: resolve(dirname(fileURLToPath(import.meta.url)), "../..")
  }
};

export default nextConfig;
