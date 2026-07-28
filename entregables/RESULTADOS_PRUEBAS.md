# Resultados de pruebas

Fecha: 2026-07-28

## Resultado

| Comprobación | Resultado |
|---|---|
| TypeScript estricto (6 paquetes) | Aprobado |
| ESLint (2 aplicaciones) | Aprobado; 1 recomendación no bloqueante sobre imágenes remotas |
| Vitest unitario y seguridad | 7/7 aprobadas |
| Build Next.js estático | 2/2 aprobados |
| Playwright móvil y escritorio | 4/4 aprobadas |
| Inspección visual en navegador real | Aprobada |
| Supabase: RLS en tablas de Reinado | Aprobado |
| Supabase: voto directo desde `anon` | Rechazado correctamente |
| Supabase: voto mediante `service_role` | Permitido correctamente |
| Estado sin fechas | Cerrado correctamente |
| Supabase Security Advisor | Sin hallazgos sobre tablas de Reinado |

## Cobertura de seguridad

- Restricción única por votante y por código.
- Bloqueo de fila `FOR UPDATE` en el consumo del código.
- RPC de voto revocada para `anon` y `authenticated`.
- Turnstile validado en la Edge Function.
- Rate limit por hash salado de IP.
- Código normalizado y hash SHA-256 con pepper.
- Todas las tablas de Reinado con RLS.
- Credenciales y exportaciones excluidas de Git.

## Limitación de QA local

Docker no está instalado, así que no se ejecutó una instancia completa de Supabase local. La migración sí fue aplicada y comprobada en el proyecto Supabase conectado.
