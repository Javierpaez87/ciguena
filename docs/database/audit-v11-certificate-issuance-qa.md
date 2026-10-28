# QA Patch 2 — audited certificate issuance (V1.1)

Apply this patch to **QA only**, from repository `main`, against branch `qa-ciguena`.

## Scope
- One RPC issues an exam certificate and updates its assignment in a transaction, after validating authenticated ownership and consistency of the already-stored audit evidence.
- New certificate-to-attempt link records carry the explicit V1 evidence label (`v1_client_key_audited`).
- Ordinary client INSERT of certificates and legacy attempts is revoked; client updates that forge exam-grade fields or `certificate_issued` status are blocked.
- Historical certificates stay unchanged and may have no audit link. Other certificate types must be regression-tested before any rollout.

## Deployment order
1. GitHub QA `main`: deploy modified `WorkerTest.tsx` to Netlify QA.
2. In Supabase `qa-ciguena` execute the migration once. **There is a short transition window**: do not let workers submit between frontend deploy and SQL activation. SQL first would cause existing frontend to fail certificate issuance; coordinate closely.
3. Run the read-only QA verification script.
4. Use a NEW assigned training with a QA worker. Confirm 1 audited attempt, complete answer rows, 1 certificate and 1 link; confirm matching score, tenant, timestamps.
5. Test a failed exam (no certificate), repeat submission (no duplicate), and an already-issued assignment.
6. Test worker training progress updates and admin assignment workflows. Test any non-exam certificate issuance in the app separately: this patch intentionally constrains INSERT into `certificates` globally.
7. Never copy this SQL straight to Supabase production without checking schema drift and regression results.

## Security limitations
- The submitted test bank and correct answers still come from TypeScript on the client. The RPC checks consistency, not authoritative knowledge. V2 must move the official question bank and grading to the server.
- Expiry remains computed by existing catalog / tenant frontend configuration and is range-checked by the RPC, not independently recomputed; harden in V2.
- Assignment guard uses DB execution role; SQL owners and elevated operators can bypass it. Not absolute immutability.
- An audit attempt may be written before certificate finalization fails; the worker must contact support rather than retry the same attempt.
- Historic certificates remain unchanged and are not backlinked automatically.

## Rollback
Restore prior frontend and remove the new guard/privilege restrictions *as a coordinated QA rollback only*. Do not use a broad GRANT without restoring the corresponding scoped policies. Keep links as historical evidence; do not delete audit data. Review deployment sequencing with real traffic before production.
