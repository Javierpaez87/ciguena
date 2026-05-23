import React from 'react';
import type { AssignmentStatus, CertificateStatus, TenantStatus, UserStatus, TrainingStatus } from '../../types';

type AnyStatus = AssignmentStatus | CertificateStatus | TenantStatus | UserStatus | TrainingStatus | string;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  not_started: { label: 'No iniciado', className: 'badge badge-neutral' },
  in_progress: { label: 'En curso', className: 'badge badge-info' },
  pending_test: { label: 'Pendiente test', className: 'badge badge-warning' },
  passed: { label: 'Aprobado', className: 'badge badge-success' },
  failed: { label: 'Reprobado', className: 'badge badge-danger' },
  completed: { label: 'Completado', className: 'badge badge-success' },
  certificate_issued: { label: 'Certificado emitido', className: 'badge badge-success' },
  expired: { label: 'Vencido', className: 'badge badge-danger' },
  valid: { label: 'Vigente', className: 'badge badge-success' },
  expiring_soon: { label: 'Próx. a vencer', className: 'badge badge-warning' },
  active: { label: 'Activo', className: 'badge badge-success' },
  inactive: { label: 'Inactivo', className: 'badge badge-neutral' },
};

export default function StatusBadge({ status }: { status: AnyStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'badge badge-neutral' };
  return <span className={config.className}>{config.label}</span>;
}
