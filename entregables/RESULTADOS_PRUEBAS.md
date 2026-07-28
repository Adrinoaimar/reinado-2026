# Resultados de pruebas

Fecha: 2026-07-28

## Resultado

| Comprobación | Resultado |
|---|---|
| TypeScript estricto (6 paquetes) | Aprobado |
| ESLint (6 paquetes) | Aprobado |
| Vitest unitario y seguridad | 15/15 aprobadas |
| Build Next.js | 2/2 aprobados |
| Playwright móvil y escritorio | 4/4 aprobadas |
| Cloudflare Pages | Dos despliegues de producción activos |
| URLs estables | HTTP 200 |
| Votación en navegador de producción | Aprobada, consola limpia |
| Administración en navegador de producción | Aprobada |
| Supabase REST público | HTTP 200 |
| Supabase Auth anónimo | Sesión creada correctamente |
| Acceso superadministrador | Aprobado; cambio de contraseña obligatorio |
| Edge Function `emitir-voto` | Configurada; ya no devuelve 503 |
| Edge Function `resultados-publicos` | HTTP 200; oculta resultados desactivados |
| Restricción de coherencia para modos Google | Verificada |
| Limpieza diaria con `pg_cron` | Verificada |
| Supabase Security Advisor | Sin alertas sobre tablas de Reinado |

## Cobertura de seguridad

- Restricción única por votante y por código.
- Bloqueo `FOR UPDATE` durante el consumo del código.
- RPC de voto revocada para `anon` y `authenticated`.
- Turnstile y rate limit validados en la Edge Function.
- Código visible con 130 bits de entropía y hash SHA-256 con pepper.
- Resultados públicos agregados en servidor.
- RLS habilitada en todas las tablas de Reinado.
- Política pública de candidatas separada de las funciones administrativas.
- Bootstrap administrativo eliminado después de crear el superadministrador.
- Credenciales, exportaciones y artefactos locales excluidos de Git.

## Observaciones

- Durante la propagación inicial hubo una respuesta 522 aislada. Después, la URL estable y la URL única respondieron HTTP 200 en seis comprobaciones consecutivas y la inspección final de navegador fue correcta.
- La producción se entrega sin candidatas ficticias. El panel muestra el flujo para cargar los perfiles oficiales.
- El asesor de seguridad informó una política ausente en `public.noelia_admin_invitations`, tabla ajena a Reinado, que no se modificó.
- Docker no está instalado; las migraciones se comprobaron directamente en Supabase.
