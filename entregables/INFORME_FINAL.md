# Informe de entrega — Reinado 2026

## Estado

Código, base de datos y Edge Functions construidos y verificados. El repositorio queda preparado para Cloudflare Pages Free. La publicación en `pages.dev` requiere que el propietario complete `wrangler login`; esta autenticación externa no puede sustituirse con código.

## Arquitectura

- Monorepo pnpm + Turborepo.
- Next.js 16, React 19, TypeScript estricto, Tailwind CSS y Framer Motion.
- Dos exports estáticos:
  - `apps/registro/out`
  - `apps/votacion/out`
- Supabase PostgreSQL, Auth, Storage y Edge Functions.
- Cloudflare Pages Free + Turnstile Free, sin dominio de pago.

## Supabase

- Proyecto reutilizado de forma aislada: `ignwxkpzpilecbkdzfpt`.
- URL: `https://ignwxkpzpilecbkdzfpt.supabase.co`.
- La migración no modifica ni revoca permisos de las tablas preexistentes.
- Tablas nuevas: `candidatas`, `votantes`, `codigos_votacion`, `votos`, `configuracion_votacion`, `administradores`, `intentos_seguridad`, `auditoria_admin`.
- Edge Functions activas:
  - `emitir-voto`
  - `generar-codigos`
  - `crear-admin-inicial`
  - `auditoria-sistema`
- La votación se entrega cerrada, con fechas nulas.

## Seguridad

- Códigos aleatorios de 128 bits, visibles una sola vez.
- Solo se almacena SHA-256 del código normalizado con pepper.
- Consumo e inserción del voto en una transacción con bloqueo.
- Un voto por código y un voto por sesión mediante restricciones únicas.
- RPC de voto accesible únicamente por `service_role`.
- Turnstile, JWT, dominio opcional, fechas y rate limit validados en servidor.
- IP almacenada solo como hash salado.
- RLS de mínimo privilegio.
- Credenciales administrativas guardadas únicamente en `entregables/CREDENCIALES_ADMIN.txt`, ignorado por Git.

## Operación

```bash
pnpm install
pnpm test:all
pnpm test:e2e
pnpm deploy:all
pnpm verify:prod
```

El comando integral es:

```bash
pnpm autopilot
```

## Acción externa pendiente

Ejecutar una sola vez:

```bash
pnpm exec wrangler login
```

Después, `pnpm deploy:all` creará o reutilizará los dos proyectos gratuitos y publicará los directorios `out`.

También deben configurarse, sin enviarlos por correo:

- `TURNSTILE_SECRET_KEY`
- `CODIGOS_HASH_PEPPER`
- `IP_HASH_SALT`
- `ADMIN_BOOTSTRAP_SECRET`

## Coste y límites

No se configuró facturación, plan de pago, dominio comprado, Twilio, Resend ni Cloudflare Stream. Si una cuota gratuita se agota, la operación afectada debe detenerse; los scripts no realizan upgrades.
