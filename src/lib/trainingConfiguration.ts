
export type DeadlineMode = 'days_after_assignment' | 'no_deadline';
export type CertificateValidityMode = 'inherit' | 'fixed_months' | 'no_expiry';

export type TenantTrainingConfiguration = {
  deadline_mode?: string | null;
  deadline_days?: number | null;
  certificate_validity_mode?: string | null;
  certificate_validity_months?: number | null;
};

export const DEFAULT_DEADLINE_DAYS = 30;

export function normalizeDeadlineMode(value?: string | null): DeadlineMode {
  return value === 'no_deadline' ? 'no_deadline' : 'days_after_assignment';
}

export function normalizeCertificateValidityMode(
  value?: string | null
): CertificateValidityMode {
  if (value === 'fixed_months') return 'fixed_months';
  if (value === 'no_expiry') return 'no_expiry';
  return 'inherit';
}

export function getDeadlineDays(configuration?: TenantTrainingConfiguration | null) {
  const value = Number(configuration?.deadline_days ?? DEFAULT_DEADLINE_DAYS);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : DEFAULT_DEADLINE_DAYS;
}

export function calculateDefaultDueDateISODate(
  configuration?: TenantTrainingConfiguration | null,
  fromDate = new Date()
) {
  if (normalizeDeadlineMode(configuration?.deadline_mode) === 'no_deadline') {
    return '';
  }

  const dueDate = new Date(fromDate);
  dueDate.setDate(dueDate.getDate() + getDeadlineDays(configuration));
  return dueDate.toISOString().slice(0, 10);
}

export function getDeadlineSummary(configuration?: TenantTrainingConfiguration | null) {
  if (normalizeDeadlineMode(configuration?.deadline_mode) === 'no_deadline') {
    return 'Sin deadline';
  }

  const days = getDeadlineDays(configuration);
  return `${days} ${days === 1 ? 'día' : 'días'} desde la asignación`;
}

export function getEffectiveCertificateValidityMonths({
  configuration,
  training,
}: {
  configuration?: TenantTrainingConfiguration | null;
  training?: { validity_months?: number | null } | null;
}) {
  const mode = normalizeCertificateValidityMode(configuration?.certificate_validity_mode);

  if (mode === 'no_expiry') return null;

  if (mode === 'fixed_months') {
    const configuredMonths = Number(configuration?.certificate_validity_months ?? 0);
    return Number.isFinite(configuredMonths) && configuredMonths > 0
      ? Math.round(configuredMonths)
      : null;
  }

  return training?.validity_months ?? null;
}

export function getCertificateValiditySummary({
  configuration,
  training,
}: {
  configuration?: TenantTrainingConfiguration | null;
  training?: { validity_months?: number | null } | null;
}) {
  const mode = normalizeCertificateValidityMode(configuration?.certificate_validity_mode);
  const months = getEffectiveCertificateValidityMonths({ configuration, training });

  if (mode === 'no_expiry') return 'Sin vencimiento';

  if (mode === 'fixed_months') {
    if (!months) return 'Vigencia personalizada sin definir';
    return `${months} ${months === 1 ? 'mes' : 'meses'} desde la aprobación`;
  }

  if (!months) return 'Sin vencimiento (catálogo)';
  return `${months} ${months === 1 ? 'mes' : 'meses'} (hereda del catálogo)`;
}

export function calculateCertificateExpirationISO({
  configuration,
  training,
  fromDate = new Date(),
}: {
  configuration?: TenantTrainingConfiguration | null;
  training?: { validity_months?: number | null } | null;
  fromDate?: Date;
}) {
  const months = getEffectiveCertificateValidityMonths({ configuration, training });
  if (!months) return null;

  const expirationDate = new Date(fromDate);
  expirationDate.setMonth(expirationDate.getMonth() + months);
  return expirationDate.toISOString();
}
