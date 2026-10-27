-- CIGÜEÑA · Cerrar la creación de perfiles desde el cliente (escalada de privilegios)
--
-- YA APLICADA EN PRODUCCIÓN el 2026-10-26 (~22:17 ART) desde el SQL Editor.
-- Se versiona acá para que el repo refleje el estado real. Es idempotente:
-- volver a correrla no cambia nada.
--
-- Problema verificado en producción:
--   * "Allow profile insert during signup" (anon, WITH CHECK true) permitía que un
--     visitante SIN login insertara perfiles con cualquier role/tenant/auth_user_id.
--   * "Users can insert own profile" (authenticated, auth.uid() = auth_user_id)
--     permitía que un usuario de Auth sin perfil se creara uno con role super_admin.
--
-- Por qué no afecta altas ni login:
--   * Todas las altas de perfiles se hacen desde Netlify Functions con service_role
--     (register-user, approve-user, sync-worker-roster), que no pasa por RLS.
--   * El frontend no inserta en profiles; el login solo lee (políticas SELECT intactas).
--   * No hay triggers sobre auth.users que creen perfiles (verificado).
--
-- Verificación: este bloque debe fallar con "permission denied for table profiles":
--   begin; set local role anon;
--   insert into public.profiles (full_name, email, role)
--   values ('PRUEBA ESCALADA', 'prueba-escalada@invalid.test', 'super_admin');
--   rollback;

begin;

drop policy if exists "Allow profile insert during signup" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

revoke insert on public.profiles from anon;

commit;

-- ROLLBACK (solo si algo falla; vuelve exactamente al estado anterior):
-- grant insert on public.profiles to anon;
-- create policy "Allow profile insert during signup" on public.profiles
--   for insert to anon with check (true);
-- create policy "Users can insert own profile" on public.profiles
--   for insert to authenticated with check (auth.uid() = auth_user_id);
