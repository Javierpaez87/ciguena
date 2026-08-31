/*
  Configuración operativa por tenant para trainings asincrónicos.

  - deadline_mode / deadline_days: define el deadline sugerido al crear nuevas asignaciones.
  - certificate_validity_mode / certificate_validity_months: permite heredar la vigencia del
    catálogo o definir una política propia por empresa, sin modificar el training global.

  Las asignaciones existentes y certificados ya emitidos no se modifican retroactivamente.
*/

ALTER TABLE tenant_trainings
  ADD COLUMN IF NOT EXISTS deadline_mode text NOT NULL DEFAULT 'days_after_assignment',
  ADD COLUMN IF NOT EXISTS deadline_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS certificate_validity_mode text NOT NULL DEFAULT 'inherit',
  ADD COLUMN IF NOT EXISTS certificate_validity_months integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_trainings_deadline_mode_check'
  ) THEN
    ALTER TABLE tenant_trainings
      ADD CONSTRAINT tenant_trainings_deadline_mode_check
      CHECK (deadline_mode IN ('days_after_assignment', 'no_deadline'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_trainings_deadline_days_check'
  ) THEN
    ALTER TABLE tenant_trainings
      ADD CONSTRAINT tenant_trainings_deadline_days_check
      CHECK (deadline_days > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_trainings_certificate_validity_mode_check'
  ) THEN
    ALTER TABLE tenant_trainings
      ADD CONSTRAINT tenant_trainings_certificate_validity_mode_check
      CHECK (certificate_validity_mode IN ('inherit', 'fixed_months', 'no_expiry'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_trainings_certificate_validity_months_check'
  ) THEN
    ALTER TABLE tenant_trainings
      ADD CONSTRAINT tenant_trainings_certificate_validity_months_check
      CHECK (certificate_validity_months IS NULL OR certificate_validity_months > 0);
  END IF;
END $$;

COMMENT ON COLUMN tenant_trainings.deadline_mode IS
  'Política de deadline para nuevas asignaciones: days_after_assignment o no_deadline.';
COMMENT ON COLUMN tenant_trainings.deadline_days IS
  'Cantidad de días desde la asignación cuando deadline_mode = days_after_assignment.';
COMMENT ON COLUMN tenant_trainings.certificate_validity_mode IS
  'Política de vigencia: inherit, fixed_months o no_expiry.';
COMMENT ON COLUMN tenant_trainings.certificate_validity_months IS
  'Meses de vigencia cuando certificate_validity_mode = fixed_months.';
