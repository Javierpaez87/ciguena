-- Cigüeña V1: soft-delete workers, retaining records and historical evidence.
alter table public.profiles add column if not exists deleted_at timestamptz;
alter table public.employee_directory add column if not exists deleted_at timestamptz;

-- Tenant-scoped tombstones persist across imports and registrations.
create table if not exists public.worker_trash_identities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email_normalized text,
  dni_normalized text,
  profile_id uuid,
  directory_id uuid,
  created_at timestamptz not null default now(),
  check (email_normalized is not null or dni_normalized is not null)
);
create index if not exists worker_trash_tenant_email on public.worker_trash_identities(tenant_id,email_normalized);
create index if not exists worker_trash_tenant_dni on public.worker_trash_identities(tenant_id,dni_normalized);
alter table public.worker_trash_identities enable row level security;
-- No client select policy: only the server service role or privileged definer functions can read tombstones.

create or replace function public.set_worker_trashed(
 p_tenant_id uuid, p_profile_id uuid, p_directory_id uuid, p_restore boolean default false
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_profile public.profiles%rowtype;
  v_directory public.employee_directory%rowtype;
  v_email text;
  v_dni text;
begin
  select role into v_role from public.profiles
   where auth_user_id = auth.uid() and tenant_id = p_tenant_id and status = 'active' and deleted_at is null;
  if coalesce(lower(v_role),'') not in ('admin','superadmin','super_admin','owner') then
    raise exception 'No tenés permiso para gestionar la papelera';
  end if;
  if p_profile_id is null and p_directory_id is null then
    raise exception 'Se requiere un identificador de usuario';
  end if;
  if p_profile_id is not null then
    select * into v_profile from public.profiles where id = p_profile_id and tenant_id = p_tenant_id for update;
    if not found then raise exception 'Perfil inexistente en esta organización'; end if;
    if lower(coalesce(v_profile.role,'')) in ('admin','superadmin','super_admin','owner') then
      raise exception 'No se pueden eliminar administradores desde esta papelera';
    end if;
  end if;
  if p_directory_id is not null then
    select * into v_directory from public.employee_directory where id = p_directory_id and tenant_id = p_tenant_id for update;
    if not found then raise exception 'Registro de nómina inexistente'; end if;
    if p_profile_id is not null and v_directory.profile_id is not null and v_directory.profile_id <> p_profile_id then
      raise exception 'La nómina pertenece a otro perfil';
    end if;
  end if;
  if p_restore then
    delete from public.worker_trash_identities where tenant_id = p_tenant_id
      and ((p_profile_id is not null and profile_id = p_profile_id)
        or (p_directory_id is not null and directory_id = p_directory_id));
    if p_profile_id is not null then
      update public.profiles set deleted_at = null, status = 'inactive' where id = p_profile_id and tenant_id = p_tenant_id;
    end if;
    if p_directory_id is not null then
      update public.employee_directory set deleted_at = null, status = 'inactive' where id = p_directory_id and tenant_id = p_tenant_id;
    end if;
  else
    v_email := nullif(lower(trim(coalesce(v_profile.email,v_directory.email,''))), '');
    v_dni := nullif(regexp_replace(coalesce(v_profile.dni,v_directory.dni,''),'[^0-9]','','g'),'');
    if v_email is null and v_dni is null then raise exception 'El usuario necesita email o DNI para impedir su reincorporación'; end if;
    insert into public.worker_trash_identities(tenant_id,email_normalized,dni_normalized,profile_id,directory_id)
    values(p_tenant_id,v_email,v_dni,p_profile_id,p_directory_id);
    if p_profile_id is not null then
      update public.profiles set deleted_at = now(), status = 'inactive' where id = p_profile_id and tenant_id = p_tenant_id;
    end if;
    if p_directory_id is not null then
      update public.employee_directory set deleted_at = now(), status = 'inactive' where id = p_directory_id and tenant_id = p_tenant_id;
    end if;
  end if;
end;
$$;
revoke all on function public.set_worker_trashed(uuid,uuid,uuid,boolean) from public;
grant execute on function public.set_worker_trashed(uuid,uuid,uuid,boolean) to authenticated;

-- Backstop against roster insert/update from *any* import path.
create or replace function public.prevent_trashed_roster_entry() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.deleted_at is null and exists(
   select 1 from public.worker_trash_identities t where t.tenant_id = new.tenant_id
   and ((t.email_normalized is not null and t.email_normalized = lower(trim(coalesce(new.email,''))))
        or (t.dni_normalized is not null and t.dni_normalized = regexp_replace(coalesce(new.dni,''),'[^0-9]','','g')))
 ) then
   raise exception 'USUARIO_EN_PAPELERA: restaure el usuario desde Administración antes de incorporarlo';
 end if;
 return new;
end;
$$;
drop trigger if exists worker_trash_block_roster on public.employee_directory;
create trigger worker_trash_block_roster before insert or update on public.employee_directory
for each row execute function public.prevent_trashed_roster_entry();
