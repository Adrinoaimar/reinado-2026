# Informe de entrega — Reinado 2026

## Estado

El sistema está desplegado en Cloudflare Pages y conectado al proyecto productivo de Supabase:

- Administración: `https://reinado-registro.pages.dev`
- Votación pública: `https://reinado-votacion.pages.dev`

La votación se entrega cerrada, sin candidatas publicadas, sin fechas y con resultados públicos desactivados. El administrador debe cargar los perfiles oficiales y decidir cuándo abrirla.

## Arquitectura

- Monorepo pnpm + Turborepo.
- Next.js 16, React 19 y TypeScript estricto.
- Exportaciones estáticas en Cloudflare Pages Free.
- Supabase PostgreSQL, Auth, Storage, Cron y Edge Functions.
- Cloudflare Turnstile Free restringido a `reinado-votacion.pages.dev`.

## Supabase

- Proyecto: `ignwxkpzpilecbkdzfpt`.
- URL: `https://ignwxkpzpilecbkdzfpt.supabase.co`.
- Edge Functions activas:
  - `emitir-voto`
  - `generar-codigos`
  - `crear-admin-inicial`
  - `auditoria-sistema`
  - `resultados-publicos`
- Inicio anónimo habilitado para el modo por código.
- URLs de Auth configuradas para los dos sitios de producción.
- Limpieza diaria de intentos de seguridad mediante `pg_cron`.
- Superadministrador creado; exige cambio de contraseña en el primer acceso.
- El secreto de bootstrap administrativo fue eliminado después del alta.

## Seguridad

- Códigos con 130 bits aleatorios visibles una sola vez.
- Sólo se almacena SHA-256 del código normalizado con pepper.
- Consumo del código e inserción del voto dentro de una transacción con bloqueo.
- Un voto por código y un voto por identidad mediante restricciones únicas.
- Turnstile, JWT, fechas, dominio opcional y rate limit validados en servidor.
- IP almacenada sólo como hash salado.
- Resultados públicos agregados en servidor.
- RLS de mínimo privilegio; la lectura pública de candidatas activas no ejecuta funciones administrativas.
- Credenciales y exportaciones sensibles excluidas de Git.

## Operación

```bash
pnpm install
pnpm test:all
pnpm test:e2e
pnpm deploy:all
pnpm verify:prod
```

## Acciones del administrador

1. Abrir `https://reinado-registro.pages.dev`.
2. Entrar con `entregables/CREDENCIALES_ADMIN.txt`.
3. Cambiar inmediatamente la contraseña temporal.
4. Cargar candidatas, fotos, portadas y videos oficiales.
5. Configurar fechas y modo de acceso.
6. Generar y distribuir los códigos antes de abrir la votación.

No se configuró facturación, dominio comprado ni servicios de pago.
