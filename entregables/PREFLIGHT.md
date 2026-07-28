# Informe de preflight

Generado: 2026-07-28T05:51:47.211Z

| Componente | Estado | Obligatorio | Detalle |
|---|---:|---:|---|
| Node.js | OK | Sí | v24.15.0 |
| pnpm | OK | Sí | 11.9.0 |
| Git | OK | Sí | git version 2.53.0.windows.3 |
| GitHub CLI | OK | Sí | gh version 2.96.0 (2026-07-02) |
| FFmpeg | OK | Sí | ffmpeg version 8.1.1-full_build-www.gyan.dev Copyright (c) 2000-2026 the FFmpeg developers |
| Docker | Pendiente | No | "docker" no se reconoce como un comando interno o externo, |
| Supabase CLI | OK | Sí | 2.110.0 |
| Wrangler | OK | Sí | 4.114.0 |
| Sesión GitHub | OK | Sí | Autorizada |
| Sesión Cloudflare | OK | No | Autorizada |
| Sesión Supabase | Pendiente | No | Pendiente |

Docker solo es necesario para ejecutar Supabase completo en local. Las pruebas estáticas, unitarias y los builds no dependen de Docker.
Ningún paso configura facturación, compra dominios ni activa planes de pago.