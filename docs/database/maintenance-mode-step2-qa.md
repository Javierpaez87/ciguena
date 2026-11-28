# Maintenance mode — QA, step 2

## Deployment
Requires Step 1 and the same QA database used by the deployed QA Netlify site. Disable maintenance before installation. Apply `supabase/migrations/20261127160000_platform_maintenance_backend_qa.sql` in **QA only**, then deploy the matching frontend/Netlify functions. Do not activate maintenance between applying SQL and deploying Step 2. No new environment variables. Existing `SUPABASE_URL` (or `VITE_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY` must target this same QA database; the URL must be the HTTPS Supabase project URL. The migration refuses to replace an unrelated database-configured PostgREST pre-request hook. Review any externally configured pre-request/pre-config hook before deployment. It sets `pgrst.db_pre_request` for the authenticator in the current database and reloads PostgREST config/schema.

## Scope
- PostgREST checks REST/RPC before execution, including SECURITY DEFINER RPCs. Ordinary requests receive HTTP 503 / PT503 while active. Status, public branding and superadmin-only toggle remain callable. A conventional account can read only its own profile under existing RLS to authenticate and see the existing access-denied screen.
- Restrictive RLS policies protect currently RLS-enabled public tables and Storage objects without granting any additional access. Existing role/tenant policies remain in force. Public bucket content can still be served; Supabase Auth sign-in/token refresh and password reset are not disabled at the infrastructure level (needed for authorized entry); public app registration endpoint is blocked. Direct Auth API sign-up settings are not changed.
- All 14 HTTP Netlify handlers are checked at entry. Public register/external support are unavailable. Existing authenticated endpoints require a valid JWT and active, non-deleted sentinel worker or superadmin during maintenance, plus their existing authorization. Three legacy approval/Meet endpoints require superadmin during maintenance (the frontend now supplies its JWT); this does not change their existing authorization behavior when maintenance is off. Direct service-role PostgREST calls are also blocked while active unless marked with the server-verified authorized actor header. Ordinary JWTs cannot use that header as a bypass. A service key is privileged infrastructure and must never be exposed to clients. The scheduled BondiSupport queue worker pauses at entry and between items, leaving queued work for normal retry after reopening.
- Shared transaction advisory locks in the PostgREST hook and exclusive lock in the toggle wait for previously admitted REST/RPC transactions before switching state. They do not hold a lock across a sequence of HTTP requests or cancel external emails, calendar operations, Storage transfers, or jobs already in flight. Let external work drain before schema changes. Privileged direct SQL, external jobs not present in the repository, old deployments with external-only side effects, public objects/cached data and Auth itself are not a global network kill switch. Verify any external schedules in the actual QA/PROD projects separately.
- Exam drafts save selected answers, option order and question index in same-tab sessionStorage for 48 hours, scoped to actual profile, assignment, test version and attempt. Ghost View is excluded. After reopening the platform, open the same training/test in the same tab to restore if the bank and next attempt still match. Closed tabs, unavailable storage, changed banks, or already-recorded attempts cannot be restored. The server remains authoritative; grading, attempt limits and the audit bank are unchanged. If the passing attempt was committed but the certificate was interrupted, reopening the test offers recovery via the existing idempotent issuance RPC without taking another attempt. An existing certificate is not modified.

## After deployment — QA smoke and regression checks
1. With maintenance OFF, verify public branding/login/registration, ordinary and sentinel dashboard, worker training/exam submission and certificate flow, admin actions, support and email endpoints using QA test accounts. Confirm existing functions still use the QA database. An empty `register-user` POST should return its ordinary 400 validation error, not 503.
2. Log a conventional worker into a separate tab. Open DevTools Network, record a successful authenticated REST read (e.g. training_assignments). Activate maintenance from Superadmin. After the banner appears, replay that same request via DevTools (do not share JWTs/headers); expect HTTP 503 and PT503 / MAINTENANCE_ACTIVE. This proves actual PostgREST hook is loaded, not just UI or RLS. Replay a read RPC or, using a test account and invalid inputs, verify protected exam RPC is also blocked before business validation. Do not perform destructive test operations.
3. The conventional worker must see maintenance/access denied; the worker's own profile bootstrap, public status and tenant branding must still work. Sign in via `/maintenance-access` with a sentinel and with superadmin; both retain normal access and roles. Ghost View remains blocked. Check a sentinel REST read works; verify ordinary account's forged actor header still receives 503. Superadmin can disable maintenance.
4. In browser console on the QA hostname, POST `{}` to `/.netlify/functions/register-user` and `/.netlify/functions/approve-user` without credentials; both should return HTTP 503 while active. This empty-body probe cannot create a user or approve anyone. Authorized requests to permitted Netlify endpoints must still pass their normal endpoint-specific permissions. Test support from a sentinel, and verify the scheduled sync returns `maintenance: paused` without changing pending jobs. After disabling, confirm the queue resumes at its next schedule.
5. Start a test with a conventional QA worker, select an answer, advance to another question, activate maintenance, wait for the blocked screen, then disable it. In the SAME tab open the same test: expect the same answers, option order and position, without an increment in audited attempts. Repeat a normal submission; verify one audited attempt, no duplicate certificate. For the passing-attempt/certificate gap, test on a disposable QA assignment by interrupting between the two RPCs (or verify an existing approved test without a certificate) and reopen; use `Recuperar certificado`. Confirm no extra attempt and only one certificate. Do not manipulate audited evidence or grade data to manufacture this case.
6. Test private Storage access and upload with a conventional QA account while active; expect denial. Verify public brand logo still renders and existing ordinary uploads work when off.
7. Inspect logs and maintenance events; verify QA/PROD separation and externally configured schedules before a separate production deployment. Do not use this as proof that all infrastructure is blocked until these checks pass.

Read-only SQL verification (QA SQL Editor):
```sql
select current_database(), enabled, updated_at from public.platform_maintenance;
select r.rolname, d.datname, c.setting
from pg_db_role_setting s
join pg_roles r on r.oid=s.setrole
left join pg_database d on d.oid=s.setdatabase
cross join lateral unnest(s.setconfig) c(setting)
where r.rolname='authenticator' and c.setting like 'pgrst.db_pre_request=%';
select schemaname, tablename, policyname, permissive
from pg_policies where policyname like 'maintenance_step2_%'
order by schemaname, tablename, policyname;
```

## Emergency recovery (QA SQL Editor)
If the UI is unavailable, first disable maintenance using the Step 1 recovery query, preserving an audit record. If the API remains unavailable because the new hook is incompatible, remove only the Step 2 database-specific hook after verifying it is configured as `public.enforce_platform_maintenance`:
```sql
do $$ begin
 execute format('ALTER ROLE authenticator IN DATABASE %I RESET pgrst.db_pre_request', current_database());
end $$;
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
```
Leave maintenance OFF if the hook is reset: this is emergency recovery, not an equivalent secure maintenance mode. Keep Step 1 tables and RPCs in place. Reinstall Step 2 only after resolving the cause.

## Local checks
`node --experimental-strip-types --test tests/platform-maintenance.test.mjs` (Node 22): isolated mocked service gate and draft tests; no real database or email. Full build and actual Supabase/Netlify behavior must be validated in QA.
