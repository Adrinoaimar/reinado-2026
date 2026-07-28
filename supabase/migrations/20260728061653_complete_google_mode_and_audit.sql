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
  v_modo public.modo_acceso;
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

  if p_ip_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('ok', false, 'code', 'CODIGO_INVALIDO');
  end if;

  select modo_acceso into v_modo
  from public.configuracion_votacion
  where id = 1;

  if not exists (
    select 1 from public.candidatas
    where id = p_candidata_id and activa = true
  ) then
    return jsonb_build_object('ok', false, 'code', 'CODIGO_INVALIDO');
  end if;

  if exists (select 1 from public.votos where votante_id = p_votante_id) then
    return jsonb_build_object('ok', false, 'code', 'CODIGO_INVALIDO');
  end if;

  if v_modo = 'google' then
    insert into public.votos (votante_id, codigo_id, candidata_id, ip_hash, user_agent)
    values (p_votante_id, null, p_candidata_id, p_ip_hash, left(coalesce(p_user_agent, ''), 500));
  else
    if p_codigo_hash !~ '^[a-f0-9]{64}$' then
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
  end if;

  return jsonb_build_object('ok', true, 'code', 'VOTO_REGISTRADO');
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'CODIGO_INVALIDO');
end;
$$;

comment on function public.emitir_voto_seguro is
'Solo service_role: registra un voto atómico. Consume un código en modos codigo/google_codigo y permite Google sin código.';
revoke all on function public.emitir_voto_seguro(uuid, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.emitir_voto_seguro(uuid, text, uuid, text, text) to service_role;

create or replace function private.auditar_cambio_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_entidad_id text;
  v_antes jsonb;
  v_despues jsonb;
begin
  if v_admin_id is null or not private.es_admin(v_admin_id) then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op <> 'INSERT' then
    v_antes := to_jsonb(old) - 'codigo_hash';
  end if;
  if tg_op <> 'DELETE' then
    v_despues := to_jsonb(new) - 'codigo_hash';
  end if;
  v_entidad_id := coalesce(v_despues ->> 'id', v_antes ->> 'id');

  insert into public.auditoria_admin (admin_id, accion, entidad, entidad_id, detalle)
  values (
    v_admin_id,
    lower(tg_op),
    tg_table_name,
    v_entidad_id,
    jsonb_build_object('antes', v_antes, 'despues', v_despues)
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists candidatas_auditoria_admin on public.candidatas;
create trigger candidatas_auditoria_admin
after insert or update or delete on public.candidatas
for each row execute function private.auditar_cambio_admin();

drop trigger if exists configuracion_auditoria_admin on public.configuracion_votacion;
create trigger configuracion_auditoria_admin
after insert or update or delete on public.configuracion_votacion
for each row execute function private.auditar_cambio_admin();

drop trigger if exists codigos_auditoria_admin on public.codigos_votacion;
create trigger codigos_auditoria_admin
after insert or update or delete on public.codigos_votacion
for each row execute function private.auditar_cambio_admin();
