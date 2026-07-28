# Reinado 2026

Monorepo de costo cero para administrar candidatas y realizar una votación pública con un voto por código.

## Aplicaciones

- `apps/registro`: panel privado para candidatas, configuración, códigos, resultados y auditoría.
- `apps/votacion`: experiencia pública mobile-first con sesión anónima, perfiles y voto definitivo.
- `supabase`: migraciones, políticas RLS, pruebas SQL y Edge Functions.

## Inicio rápido

```bash
pnpm install
Copy-Item .env.example .env.local
pnpm setup:local
pnpm dev
```

Registro: `http://localhost:3000`  
Votación: `http://localhost:3001`

Sin variables de Supabase las interfaces funcionan en modo demostración seguro: la votación permanece cerrada y no se simula ningún voto real.

## Verificación

```bash
pnpm preflight
pnpm test:all
pnpm exec playwright install chromium
pnpm test:e2e
```

## Despliegue

1. Autoriza las CLI oficiales de Supabase y Cloudflare.
2. Completa `.env.local` sin subirlo a Git.
3. Ejecuta `pnpm autopilot`.

Los scripts se detienen si faltan secretos o sesiones; nunca activan facturación ni compran dominios.

## Seguridad

- Los códigos contienen 128 bits aleatorios y solo se almacena SHA-256 con pepper.
- `votos.votante_id` y `votos.codigo_id` son únicos.
- `emitir_voto_seguro` consume el código e inserta el voto en una transacción con bloqueo de fila.
- La Edge Function valida JWT, Turnstile, fecha, rate limit y entradas.
- Las IP se almacenan únicamente como hash salado.
- Todas las tablas públicas usan RLS de mínimo privilegio.

## Operación

La entrega inicial deja `fecha_inicio` y `fecha_fin` nulas, por lo que la votación está cerrada. El administrador debe definir la ventana desde el panel.
