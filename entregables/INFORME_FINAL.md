# Informe de entrega — Reinado 2026

## Estado

El código, la base de datos y las Edge Functions están construidos y verificados. La publicación de las dos aplicaciones en Cloudflare Pages y el correo final quedan pospuestos por indicación del propietario hasta revisar la inestabilidad del navegador de Codex durante OAuth. No se inició ninguna autenticación nueva.

## Arquitectura

- Monorepo pnpm + Turborepo.
- Next.js 16, React 19 y TypeScript estricto.
- Dos aplicaciones exportables:
  - `apps/registro`
  - `apps/votacion`
- Supabase PostgreSQL, Auth, Storage, Cron y Edge Functions.
- Destino previsto: Cloudflare Pages Free + Turnstile Free.

## Supabase

- Proyecto: `ignwxkpzpilecbkdzfpt`.
- URL: `https://ignwxkpzpilecbkdzfpt.supabase.co`.
- Tablas del sistema: `candidatas`, `votantes`, `codigos_votacion`, `votos`, `configuracion_votacion`, `administradores`, `intentos_seguridad`, `auditoria_admin`.
- Edge Functions activas:
  - `emitir-voto`
  - `generar-codigos`
  - `crear-admin-inicial`
  - `auditoria-sistema`
  - `resultados-publicos`
- Limpieza automática diaria de intentos de seguridad mediante `pg_cron`.
- La votación se entrega cerrada, con fechas nulas y resultados públicos desactivados.

## Seguridad

- Códigos con 130 bits aleatorios visibles una sola vez.
- Sólo se almacena SHA-256 del código normalizado con pepper.
- Consumo del código e inserción del voto dentro de una transacción con bloqueo de fila.
- Un voto por código y un voto por identidad mediante restricciones únicas.
- Turnstile, JWT, dominio opcional, fechas y rate limit validados en servidor.
- IP almacenada sólo como hash salado.
- Resultados públicos agregados por una Edge Function; nunca expone identidades ni hashes.
- RLS de mínimo privilegio.
- Credenciales y exportaciones sensibles excluidas de Git.

## Operación

```bash
pnpm install
pnpm test:all
pnpm test:e2e
pnpm deploy:all
pnpm verify:prod
```

## Pendiente por decisión del propietario

- No abrir OAuth ni ejecutar `wrangler login` por el momento.
- Cuando se autorice reanudar autenticaciones: configurar Turnstile, publicar ambos sitios en Cloudflare Pages y ejecutar QA de producción.
- Enviar el correo final únicamente después de que la producción quede verificada.

No se configuró facturación, plan de pago, dominio comprado, Twilio, Resend ni Cloudflare Stream.
