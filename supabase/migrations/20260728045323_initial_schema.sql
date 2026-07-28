-- Reinado 2026: esquema inicial, seguridad y operación atómica del voto.
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.modo_acceso as enum ('codigo', 'google_codigo', 'google');
create type public.rol_admin as enum ('superadmin', 'editor');

create table public.candidatas (
  id uuid primary key default gen_random_uuid(),
  nombre_completo text not null check (char_length(nombre_completo) between 2 and 120),
  apodo_o_titulo text,
  edad integer check (edad is null or edad between 14 and 100),
  descripcion text not null default '',
  foto_principal_url text,
  galeria_urls text[] not null default '{}',
  video_url text,
  video_poster_url text,
  representa_a text not null default '',
  orden integer not null default 0 check (orden >= 0),
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (cardinality(galeria_urls) <= 12)
);

create table public.votantes (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nombre text,
  metodo_acceso text not null check (metodo_acceso in ('anonimo_codigo', 'google')),
  creado_en timestamptz not null default now(),
  ultimo_acceso timestamptz not null default now()
);

create table public.codigos_votacion (
  id uuid primary key default gen_random_uuid(),
  codigo_hash text not null unique check (codigo_hash ~ '^[a-f0-9]{64}$'),
  etiqueta text,
  lote text not null,
  activo boolean not null default true,
  usado boolean not null default false,
  usado_por uuid references public.votantes(id),
  usado_en timestamptz,
  vence_en timestamptz,
  creado_en timestamptz not null default now(),
  check ((usado = false and usado_por is null and usado_en is null) or
         (usado = true and usado_por is not null and usado_en is not null))
);

create table public.votos (
  id uuid primary key default gen_random_uuid(),
  votante_id uuid not null unique references public.votantes(id) on delete restrict,
  codigo_id uuid unique references public.codigos_votacion(id) on delete restrict,
  candidata_id uuid not null references public.candidatas(id) on delete restrict,
  ip_hash text not null check (char_length(ip_hash) = 64),
  user_agent text not null default '',
  creado_en timestamptz not null default now()
);

create table public.configuracion_votacion (
  id integer primary key default 1 check (id = 1),
  nombre_evento text not null default 'Reinado 2026',
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  mensaje_antes text not null default 'La votación abrirá muy pronto.',
  mensaje_despues text not null default 'Gracias por ser parte de esta celebración.',
  modo_acceso public.modo_acceso not null default 'codigo',
  google_login_activo boolean not null default false,
  dominio_correo_permitido text,
  mostrar_contador boolean not null default false,
  mostrar_resultados boolean not null default false,
  color_primario text not null default '#d6aa4b' check (color_primario ~ '^#[0-9a-fA-F]{6}$'),
  color_acento text not null default '#751f3f' check (color_acento ~ '^#[0-9a-fA-F]{6}$'),
  retencion_seguridad_dias integer not null default 30 check (retencion_seguridad_dias between 1 and 365),
  actualizado_en timestamptz not null default now(),
  check (fecha_inicio is null or fecha_fin is null or fecha_inicio < fecha_fin)
);

create table public.administradores (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol public.rol_admin not null default 'editor',
  activo boolean not null default true,
  debe_cambiar_password boolean not null default true,
  creado_en timestamptz not null default now()
);

create table public.intentos_seguridad (
  id bigint generated always as identity primary key,
  ip_hash text not null check (char_length(ip_hash) = 64),
  accion text not null check (accion in ('validar_codigo', 'emitir_voto', 'login_admin')),
  resultado text not null check (resultado in ('exito', 'rechazo')),
  creado_en timestamptz not null default now()
);

create table public.auditoria_admin (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.administradores(id),
  accion text not null,
  entidad text not null,
  entidad_id text,
  detalle jsonb not null default '{}',
  creado_en timestamptz not null default now()
);

create index candidatas_activas_orden_idx on public.candidatas (activa, orden);
create index codigos_lote_idx on public.codigos_votacion (lote, creado_en desc);
create index codigos_estado_idx on public.codigos_votacion (activo, usado, vence_en);
create index votos_candidata_idx on public.votos (candidata_id);
create index intentos_ip_accion_fecha_idx on public.intentos_seguridad (ip_hash, accion, creado_en desc);
create index auditoria_admin_fecha_idx on public.auditoria_admin (creado_en desc);

insert into public.configuracion_votacion (id) values (1) on conflict (id) do nothing;

create or replace function private.es_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.administradores a
    where a.id = p_user_id and a.activo = true
  );
$$;

revoke all on function private.es_admin(uuid) from public;
grant execute on function private.es_admin(uuid) to authenticated, service_role;

create or replace function private.es_superadmin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.administradores a
    where a.id = p_user_id and a.activo = true and a.rol = 'superadmin'
  );
$$;

revoke all on function private.es_superadmin(uuid) from public;
grant execute on function private.es_superadmin(uuid) to authenticated, service_role;

create or replace function public.esta_abierta_la_votacion()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    now() between fecha_inicio and fecha_fin,
    false
  )
  from public.configuracion_votacion
  where id = 1;
$$;

revoke all on function public.esta_abierta_la_votacion() from public;
grant execute on function public.esta_abierta_la_votacion() to anon, authenticated, service_role;

create or replace function private.touch_actualizado_en()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger candidatas_touch before update on public.candidatas
for each row execute function private.touch_actualizado_en();
create trigger configuracion_touch before update on public.configuracion_votacion
for each row execute function private.touch_actualizado_en();

create or replace function private.registrar_votante(
  p_votante_id uuid,
  p_email text,
  p_nombre text,
  p_metodo text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.votantes (id, email, nombre, metodo_acceso, ultimo_acceso)
  values (p_votante_id, p_email, p_nombre, p_metodo, now())
  on conflict (id) do update
  set email = excluded.email,
      nombre = excluded.nombre,
      metodo_acceso = excluded.metodo_acceso,
      ultimo_acceso = now();
$$;

revoke all on function private.registrar_votante(uuid, text, text, text) from public, anon, authenticated;
grant execute on function private.registrar_votante(uuid, text, text, text) to service_role;

create or replace function public.emitir_voto_seguro(
  p_votante_id uuid,
  p_codigo_hash text,
  p_candidata_id uuid,
  p_ip_hash text,
  p_user_agent text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo public.codigos_votacion%rowtype;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    return jsonb_build_object('ok', false, 'code', 'NO_AUTORIZADO');
  end if;

  if not exists (select 1 from auth.users where id = p_votante_id) then
    return jsonb_build_object('ok', false, 'code', 'NO_AUTORIZADO');
  end if;

  if not public.esta_abierta_la_votacion() then
    return jsonb_build_object('ok', false, 'code', 'VOTACION_CERRADA');
  end if;

  if p_codigo_hash !~ '^[a-f0-9]{64}$' or p_ip_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('ok', false, 'code', 'CODIGO_INVALIDO');
  end if;

  if not exists (
    select 1 from public.candidatas
    where id = p_candidata_id and activa = true
  ) then
    return jsonb_build_object('ok', false, 'code', 'CODIGO_INVALIDO');
  end if;

  if exists (select 1 from public.votos where votante_id = p_votante_id) then
    return jsonb_build_object('ok', false, 'code', 'CODIGO_INVALIDO');
  end if;

  select * into v_codigo
  from public.codigos_votacion
  where codigo_hash = p_codigo_hash
  for update;

  if not found or not v_codigo.activo or v_codigo.usado
     or (v_codigo.vence_en is not null and v_codigo.vence_en < now()) then
    return jsonb_build_object('ok', false, 'code', 'CODIGO_INVALIDO');
  end if;

  update public.codigos_votacion
  set usado = true, usado_por = p_votante_id, usado_en = now()
  where id = v_codigo.id;

  insert into public.votos (votante_id, codigo_id, candidata_id, ip_hash, user_agent)
  values (p_votante_id, v_codigo.id, p_candidata_id, p_ip_hash, left(coalesce(p_user_agent, ''), 500));

  return jsonb_build_object('ok', true, 'code', 'VOTO_REGISTRADO');
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'CODIGO_INVALIDO');
end;
$$;

comment on function public.emitir_voto_seguro is
'Solo service_role: consume un hash de código calculado por la Edge Function con SHA-256 + pepper e inserta el voto de forma atómica.';
revoke all on function public.emitir_voto_seguro(uuid, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.emitir_voto_seguro(uuid, text, uuid, text, text) to service_role;

create or replace function public.limpiar_intentos_antiguos()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count bigint;
  v_days integer;
begin
  select retencion_seguridad_dias into v_days
  from public.configuracion_votacion where id = 1;

  delete from public.intentos_seguridad
  where creado_en < now() - make_interval(days => coalesce(v_days, 30));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.limpiar_intentos_antiguos() from public, anon, authenticated;
grant execute on function public.limpiar_intentos_antiguos() to service_role;

alter table public.candidatas enable row level security;
alter table public.votantes enable row level security;
alter table public.codigos_votacion enable row level security;
alter table public.votos enable row level security;
alter table public.configuracion_votacion enable row level security;
alter table public.administradores enable row level security;
alter table public.intentos_seguridad enable row level security;
alter table public.auditoria_admin enable row level security;

create policy "Candidatas activas visibles"
on public.candidatas for select
to anon, authenticated
using (activa = true or (select private.es_admin()));

create policy "Admins gestionan candidatas"
on public.candidatas for all
to authenticated
using ((select private.es_admin()))
with check ((select private.es_admin()));

create policy "Votante ve su perfil"
on public.votantes for select
to authenticated
using ((select auth.uid()) = id);

create policy "Admins ven votantes"
on public.votantes for select
to authenticated
using ((select private.es_admin()));

create policy "Admins gestionan codigos"
on public.codigos_votacion for all
to authenticated
using ((select private.es_admin()))
with check ((select private.es_admin()));

create policy "Votante confirma su voto"
on public.votos for select
to authenticated
using ((select auth.uid()) = votante_id);

create policy "Admins ven votos"
on public.votos for select
to authenticated
using ((select private.es_admin()));

create policy "Configuracion visible"
on public.configuracion_votacion for select
to anon, authenticated
using (true);

create policy "Admins actualizan configuracion"
on public.configuracion_votacion for update
to authenticated
using ((select private.es_admin()))
with check ((select private.es_admin()));

create policy "Admin ve su rol"
on public.administradores for select
to authenticated
using ((select auth.uid()) = id or (select private.es_admin()));

create policy "Superadmin gestiona admins"
on public.administradores for all
to authenticated
using ((select private.es_superadmin()))
with check ((select private.es_superadmin()));

create policy "Admins ven intentos"
on public.intentos_seguridad for select
to authenticated
using ((select private.es_admin()));

create policy "Admins ven auditoria"
on public.auditoria_admin for select
to authenticated
using ((select private.es_admin()));

revoke all on public.candidatas, public.votantes, public.codigos_votacion, public.votos,
  public.configuracion_votacion, public.administradores, public.intentos_seguridad,
  public.auditoria_admin from anon, authenticated;
grant select on public.candidatas, public.configuracion_votacion to anon, authenticated;
grant select on public.votantes, public.votos, public.administradores, public.codigos_votacion,
  public.intentos_seguridad, public.auditoria_admin to authenticated;
grant insert, update, delete on public.candidatas, public.codigos_votacion to authenticated;
grant update on public.configuracion_votacion to authenticated;
grant insert, update, delete on public.administradores to authenticated;
grant usage, select on sequence public.intentos_seguridad_id_seq,
  public.auditoria_admin_id_seq to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('candidatas-fotos', 'candidatas-fotos', true, 6291456, array['image/jpeg','image/png','image/webp']),
  ('candidatas-videos', 'candidatas-videos', true, 12582912, array['video/mp4'])
on conflict (id) do nothing;

create policy "Multimedia publica de candidatas"
on storage.objects for select
to anon, authenticated
using (bucket_id in ('candidatas-fotos', 'candidatas-videos'));

create policy "Admins suben multimedia"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('candidatas-fotos', 'candidatas-videos')
  and (select private.es_admin())
);

create policy "Admins actualizan multimedia"
on storage.objects for update
to authenticated
using (
  bucket_id in ('candidatas-fotos', 'candidatas-videos')
  and (select private.es_admin())
)
with check (
  bucket_id in ('candidatas-fotos', 'candidatas-videos')
  and (select private.es_admin())
);

create policy "Admins eliminan multimedia"
on storage.objects for delete
to authenticated
using (
  bucket_id in ('candidatas-fotos', 'candidatas-videos')
  and (select private.es_admin())
);
