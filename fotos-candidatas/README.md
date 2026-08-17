# Fotos de candidatas — staging local

Esta carpeta NO se sube a git (ver `.gitignore`). Es solo zona de trabajo local
antes de subir cada foto desde el panel admin (`apps/registro`, sección Candidatas),
que las sube al bucket de Supabase Storage `candidatas-fotos`.

## Uso

1. Coloca en cada subcarpeta los archivos de esa candidata:
   - `principal.jpg|png|webp` → foto principal (máx. 6 MB)
   - `galeria-1.jpg`, `galeria-2.jpg`, ... → hasta 12 fotos de galería
   - `video-poster.jpg|png|webp` → portada del video (opcional)
2. Abre el panel admin (`pnpm dev`, app `registro`, http://localhost:3000).
3. Edita cada candidata (ya están cargadas por `supabase/seed.sql` / creadas en producción)
   y sube los archivos desde esa carpeta en los campos correspondientes.
4. El panel sube directo al Storage — no hace falta commitear las imágenes.

## Candidatas (orden = orden en la boleta)

| # | Carpeta | Nombre completo |
|---|---------|------------------|
| 1 | 01-ingrid-romero-chiroque | Ingrid Nathaniel Romero Chiroque |
| 2 | 02-astrid-gaona-tavara | Astrid Lariza Gaona Tavara |
| 3 | 03-fabiana-avila-obrea | Fabiana Yadira Avila Obrea |
| 4 | 04-consuelo-flores-villalobos | Consuelo Virginia Flores Villalobos |
| 5 | 05-patricia-navarro-adanaque | Patricia Lisbeth Navarro Adanaque |
| 6 | 06-viviana-alache-alache | Viviana Magdalena Alache Alache |
| 7 | 07-wendy-dominguez-aguilar | Wendy Casthell Dominguez Aguilar |
| 8 | 08-cielo-azabache-olivares | Cielo Nicol Azabache Olivares |
| 9 | 09-luana-cueva-valdez | Luana Mayte Cueva Valdez |
| 10 | 10-daniela-atoche-lazo | Daniela Yamilet Atoche Lazo |
