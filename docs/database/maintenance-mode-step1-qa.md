# Maintenance mode — QA, step 1

Apply `supabase/migrations/20261127150000_platform_maintenance_qa.sql` before deploying this frontend. The migration defaults to disabled and is safe to re-run without resetting the existing state. Verify that the profile sentinel and trash migrations are already applied. No environment variables or Netlify redirects need changing (`public/_redirects` already has the SPA fallback).

## Scope
- Global per Supabase database/environment, not per tenant. Branding is resolved using the existing hostname/tenant mechanism.
- Global active superadmin can toggle; active, non-deleted worker sentinels can enter. Current sentinel classification explicitly excludes admins. Do not change that policy in this step.
- Access route: `/maintenance-access`. No link on public screen. A conventional account can authenticate with Supabase but cannot enter the app on this route. Backend authorization of the status/toggle and direct profile authority fields is enforced; operational API/RPC/Netlify restrictions are **not** implemented in this step.
- Already authenticated authorized users can stay in the app. Ghost View is blocked during maintenance; exit to return to Superadmin.
- All public SPA routes, including password reset and external support follow-up, are gated. An active exam or support page can unmount on activation; in-flight writes, drafts, and automatic jobs are NOT protected yet. Do not use step 1 alone to protect a live production migration.
- The gate checks status on load, auth identity changes, focus and every 15 seconds. If the status RPC fails, the UI fails closed until a successful check. Deploy SQL before the frontend.

## QA smoke tests
1. Confirm normal landing, login, registration and existing dashboards when disabled.
2. As Superadmin, activate from header and verify the confirmation and visible banner.
3. From an incognito window, check `/`, `/reset-password`, `/soporte/seguimiento`, and `/?auth=register` on the QA and branded tenant hostname; all must show maintenance with the corresponding branding.
4. Open a pre-existing conventional worker/admin session; within 15 seconds or on window focus it should show maintenance. Try `/maintenance-access` with ordinary credentials; it must deny entry. Sign out.
5. In a separate incognito window, open `/maintenance-access`, sign in as an active worker sentinel, verify tenant restriction, dashboard, and banner. Repeat as Superadmin. Confirm a disabled/deleted user is denied and Ghost View cannot be used during maintenance.
6. Verify a normal authenticated account cannot execute `set_platform_maintenance` through Supabase RPC or update its own authorization attributes. Confirm trusted onboarding updates still work.
7. Disable from Superadmin, check the public landing restores without redeploy and verify ordinary sessions and logins. The special route remains restricted when maintenance is off.
8. From SQL Editor, inspect `select * from public.platform_maintenance;` and `select * from public.platform_maintenance_events order by id desc;` to verify state, actor and timestamps.
9. Confirm QA and PROD use different databases before considering production rollout.

## Emergency recovery (QA SQL Editor only)
If the UI is unavailable, a database operator can disable maintenance directly; this records an emergency audit event with null actor (database operator, not a profile):

```sql
begin;
with changed as (
  update public.platform_maintenance
  set enabled=false, updated_at=now(), updated_by=null
  where singleton and enabled
  returning enabled
)
insert into public.platform_maintenance_events(enabled,actor_profile_id)
select enabled,null from changed;
commit;
```

Do not drop the status RPC while this frontend is deployed (the gate intentionally fails closed).
