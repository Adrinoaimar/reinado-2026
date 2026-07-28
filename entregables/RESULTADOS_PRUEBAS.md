# Resultados de pruebas

Fecha: 2026-07-28

## Resultado

| Comprobación | Resultado |
|---|---|
| TypeScript estricto (6 paquetes) | Aprobado |
| ESLint (6 paquetes) | Aprobado |
| Vitest unitario y seguridad | 13/13 aprobadas |
| Build Next.js | 2/2 aprobados |
| Playwright móvil y escritorio | 4/4 aprobadas |
| Inspección visual con Playwright CLI | Aprobada, consola limpia |
| Edge Function `resultados-publicos` | HTTP 200; sin filas mientras está desactivada |
| Restricción de coherencia para modos Google | Verificada en producción |
| Limpieza diaria con `pg_cron` | Verificada en producción |
| Índices de claves foráneas del proyecto | Aplicados y verificados |
| Supabase Security Advisor | Sin alertas sobre tablas de Reinado |

## Cobertura de seguridad

- Restricción única por votante y por código.
- Bloqueo `FOR UPDATE` durante el consumo del código.
- RPC de voto revocada para `anon` y `authenticated`.
- Turnstile validado en la Edge Function.
- Rate limit por hash salado de IP.
- Código visible con 130 bits de entropía y hash SHA-256 con pepper.
- Resultados públicos agregados en servidor.
- Todas las tablas de Reinado con RLS.
- Credenciales, exportaciones y artefactos locales excluidos de Git.

## Observaciones

- El asesor de seguridad informó una política ausente en `public.noelia_admin_invitations`, tabla ajena a Reinado, que no se modificó.
- Los avisos de índices sin uso son esperables en una instalación nueva; no se eliminaron.
- Docker no está instalado, por lo que las migraciones se comprobaron directamente en el proyecto Supabase conectado.
- El despliegue y QA de Cloudflare quedan pendientes hasta que el propietario reactive las autenticaciones.
