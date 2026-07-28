# AGENTS.md

## Objetivo

Mantener un sistema de votación de costo cero, seguro y desplegable en GitHub, Supabase Free y Cloudflare Pages Free.

## Reglas innegociables

- Nunca subir secretos, credenciales administrativas ni exportaciones de códigos.
- No integrar servicios de pago, pruebas con cobro automático ni dominios de pago.
- El cliente nunca inserta votos directamente: siempre usa la Edge Function y la función SQL atómica.
- Toda tabla expuesta debe tener RLS.
- Mantener la votación cerrada si las fechas no son válidas.
- Antes de publicar: `pnpm test:all`, `pnpm test:e2e` y revisión de secretos.
- Google Auth permanece apagado cuando no existan credenciales válidas.
