update public.configuracion_votacion
set google_login_activo = true
where modo_acceso in ('google', 'google_codigo') and google_login_activo = false;

alter table public.configuracion_votacion
  drop constraint if exists configuracion_google_coherente;
alter table public.configuracion_votacion
  add constraint configuracion_google_coherente
  check (modo_acceso = 'codigo' or google_login_activo = true);

create extension if not exists pg_cron;

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname = 'reinado-limpiar-intentos'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'reinado-limpiar-intentos',
    '15 3 * * *',
    'select public.limpiar_intentos_antiguos();'
  );
end;
$$;
