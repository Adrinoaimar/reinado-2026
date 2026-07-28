create index if not exists auditoria_admin_admin_id_idx
  on public.auditoria_admin (admin_id);

create index if not exists codigos_votacion_usado_por_idx
  on public.codigos_votacion (usado_por)
  where usado_por is not null;
