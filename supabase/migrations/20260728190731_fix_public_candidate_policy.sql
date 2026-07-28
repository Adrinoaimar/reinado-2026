grant usage on schema private to authenticated, service_role;

drop policy if exists "Candidatas activas visibles" on public.candidatas;
create policy "Candidatas activas visibles"
on public.candidatas for select
to anon, authenticated
using (activa = true);
