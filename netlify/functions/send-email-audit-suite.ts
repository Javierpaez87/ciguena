import { createClient } from '@supabase/supabase-js';
import {
  getEmailSender,
  getTenantAppUrl,
  resolveTenantEmailBranding,
} from './_tenant-email-branding';
import { buildInvitationHtml } from './send-employee-invitations';
import {
  buildInternalEmailHtml,
  buildUserEmailHtml,
} from './register-user';
import { buildApprovalEmailHtml } from './approve-user';
import {
  buildNotificationEmailHtml,
  getSubject as getTrainingNotificationSubject,
  type NotificationType,
} from './send-training-notification-email';
import { buildLiveTrainingEmailHtml } from './create-google-meet-event';
import { buildCancellationEmailHtml } from './cancel-google-meet-event';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const fallbackAppUrl =
  process.env.CIGUENA_APP_URL ||
  process.env.CIGUENA_PLATFORM_URL ||
  process.env.APP_URL ||
  process.env.URL ||
  process.env.DEPLOY_PRIME_URL ||
  'https://ciguena.bondiapps.com';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const ALL_TEMPLATE_KEYS = [
  'invitation',
  'registration_auto',
  'registration_pending_worker',
  'registration_pending_admin',
  'registration_internal',
  'approval',
  'training_assignment',
  'training_reminder',
  'training_unassignment',
  'training_reassignment',
  'live_assigned',
  'live_cancelled',
] as const;

type TemplateKey = (typeof ALL_TEMPLATE_KEYS)[number];

type AuditEmail = {
  key: TemplateKey;
  label: string;
  subject: string;
  html: string;
};

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value: unknown) {
  return clean(value).toLowerCase();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isQaEnvironment(event: any) {
  if (clean(process.env.EMAIL_QA_TOOL_ENABLED).toLowerCase() === 'true') {
    return true;
  }

  const signals = [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.DEPLOY_URL,
    event?.headers?.origin,
    event?.headers?.host,
    event?.headers?.referer,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    signals.includes('spi-dev.bondiapps.com') ||
    signals.includes('ciguena-dev.netlify.app') ||
    signals.includes('localhost') ||
    signals.includes('127.0.0.1')
  );
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function buildDirectRegistrationUrl(baseUrl: string, email: string) {
  const url = new URL(baseUrl);
  url.searchParams.set('auth', 'register');
  url.searchParams.set('email', email);
  return url.toString();
}

function buildAuditEmails({
  tenantName,
  recipient,
  branding,
  appUrl,
}: {
  tenantName: string;
  recipient: string;
  branding: Awaited<ReturnType<typeof resolveTenantEmailBranding>>;
  appUrl: string;
}): AuditEmail[] {
  const fullName = 'Javier QA';
  const trainingTitle = 'Seguridad Operativa QA';
  const dueDate = addDays(new Date(), 30).toISOString();
  const start = addDays(new Date(), 7);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + 90 * 60 * 1000);
  const registerUrl = buildDirectRegistrationUrl(appUrl, recipient);
  const workerRoomUrl = `${appUrl}/?view=worker-live-room&liveTrainingId=qa-email-audit`;
  const isFullWhiteLabel = branding.isCustomBranding && !branding.showPoweredByBondiApps;

  const notification = (type: NotificationType, label: string): AuditEmail => ({
    key: `training_${type}` as TemplateKey,
    label,
    subject: getTrainingNotificationSubject(type, trainingTitle),
    html: buildNotificationEmailHtml({
      type,
      fullName,
      tenantName,
      trainingTitle,
      dueDate,
      loginUrl: `${appUrl}/`,
      branding,
    }),
  });

  return [
    {
      key: 'invitation',
      label: 'Invitación de trabajador',
      subject: isFullWhiteLabel
        ? `Creá tu cuenta en ${branding.brandName} Capacitaciones`
        : `Invitación a ${branding.brandName} - ${tenantName}`,
      html: buildInvitationHtml({
        greetingName: 'Javier',
        tenantName,
        registerUrl,
        branding,
      }),
    },
    {
      key: 'registration_auto',
      label: 'Registro autoaprobado por nómina',
      subject: `Tu cuenta de ${branding.brandName} ya está habilitada`,
      html: buildUserEmailHtml({
        fullName,
        requestedAdmin: false,
        tenantName,
        autoApproved: true,
        platformUrl: appUrl,
        branding,
      }),
    },
    {
      key: 'registration_pending_worker',
      label: 'Registro pendiente de trabajador',
      subject: `Recibimos tu solicitud de acceso a ${branding.brandName}`,
      html: buildUserEmailHtml({
        fullName,
        requestedAdmin: false,
        tenantName,
        autoApproved: false,
        platformUrl: appUrl,
        branding,
      }),
    },
    {
      key: 'registration_pending_admin',
      label: 'Registro pendiente de administrador',
      subject: `Recibimos tu solicitud de acceso a ${branding.brandName}`,
      html: buildUserEmailHtml({
        fullName,
        requestedAdmin: true,
        tenantName,
        autoApproved: false,
        platformUrl: appUrl,
        branding,
      }),
    },
    {
      key: 'registration_internal',
      label: 'Aviso interno por nuevo registro',
      subject: `Nuevo registro pendiente en ${branding.brandName}: ${fullName}`,
      html: buildInternalEmailHtml({
        fullName,
        email: recipient,
        phone: '+54 9 299 555 0101',
        requestedAdmin: true,
        tenantName,
        autoApproved: false,
        brandName: branding.brandName,
      }),
    },
    {
      key: 'approval',
      label: 'Cuenta aprobada',
      subject: `Tu cuenta de ${branding.brandName} fue aprobada`,
      html: buildApprovalEmailHtml({
        fullName,
        tenantName,
        platformUrl: appUrl,
        branding,
      }),
    },
    notification('assignment', 'Training asignado'),
    notification('reminder', 'Reminder de training pendiente'),
    notification('unassignment', 'Training desasignado'),
    notification('reassignment', 'Training reasignado'),
    {
      key: 'live_assigned',
      label: 'Capacitación en vivo asignada',
      subject: `Capacitación en vivo asignada: ${trainingTitle}`,
      html: buildLiveTrainingEmailHtml({
        fullName,
        training: {
          title: trainingTitle,
          description: 'Capacitación QA para auditar branding, copy, fechas y CTA.',
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          timezone: 'America/Argentina/Buenos_Aires',
          tenant_name: tenantName,
          creator_name: 'Admin QA',
          creator_email: 'admin.qa@example.com',
        },
        workerRoomUrl,
        branding,
      }),
    },
    {
      key: 'live_cancelled',
      label: 'Capacitación en vivo cancelada',
      subject: `Capacitación en vivo cancelada: ${trainingTitle}`,
      html: buildCancellationEmailHtml({
        fullName,
        training: {
          title: trainingTitle,
          description: 'Capacitación QA para auditar el email de cancelación.',
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          timezone: 'America/Argentina/Buenos_Aires',
        },
        branding,
      }),
    },
  ];
}

async function sendBatch({
  from,
  recipient,
  emails,
}: {
  from: string;
  recipient: string;
  emails: AuditEmail[];
}) {
  if (!resendApiKey) {
    return { ok: false as const, error: 'RESEND_API_KEY no configurada.' };
  }

  const response = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
      'x-batch-validation': 'permissive',
    },
    body: JSON.stringify(
      emails.map((email, index) => ({
        from,
        to: [recipient],
        subject: `[QA ${String(index + 1).padStart(2, '0')}/${String(emails.length).padStart(2, '0')}] ${email.subject}`,
        html: email.html,
      }))
    ),
  });

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false as const,
      error:
        responseBody?.message ||
        responseBody?.error?.message ||
        'No pudimos enviar la suite de auditoría.',
    };
  }

  return {
    ok: true as const,
    data: responseBody?.data ?? [],
    errors: responseBody?.errors ?? [],
  };
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Método no permitido.' });
  }

  if (!isQaEnvironment(event)) {
    return json(403, {
      error: 'La herramienta de auditoría de emails está deshabilitada fuera de QA.',
    });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: 'Faltan variables de entorno de Supabase.' });
  }

  let payload: any;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Solicitud inválida.' });
  }

  const tenantId = clean(payload.tenantId);
  const recipient = normalizeEmail(payload.recipient);
  const requestedKeys: TemplateKey[] = Array.isArray(payload.templateKeys)
    ? payload.templateKeys.filter((key: unknown): key is TemplateKey =>
        typeof key === 'string' && (ALL_TEMPLATE_KEYS as readonly string[]).includes(key)
      )
    : [...ALL_TEMPLATE_KEYS];

  if (!tenantId) {
    return json(400, { error: 'Seleccioná un tenant.' });
  }

  if (!recipient || !isEmail(recipient)) {
    return json(400, { error: 'Ingresá un email de prueba válido.' });
  }

  if (requestedKeys.length === 0) {
    return json(400, { error: 'Seleccioná al menos un template.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const authorizationHeader = clean(event.headers?.authorization || event.headers?.Authorization);
  const accessToken = authorizationHeader.toLowerCase().startsWith('bearer ')
    ? authorizationHeader.slice(7).trim()
    : '';

  if (!accessToken) {
    return json(401, { error: 'Sesión no autorizada.' });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
  const authUser = authData?.user;

  if (authError || !authUser) {
    return json(401, { error: 'La sesión no es válida o venció.' });
  }

  const { data: requesterProfile, error: requesterError } = await supabaseAdmin
    .from('profiles')
    .select('role, status')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  const role = clean(requesterProfile?.role).toLowerCase();
  const isSuperAdmin = role === 'super_admin' || role === 'superadmin';

  if (
    requesterError ||
    !requesterProfile ||
    clean(requesterProfile.status).toLowerCase() !== 'active' ||
    !isSuperAdmin
  ) {
    return json(403, { error: 'Solo Superadmin puede usar la auditoría de emails.' });
  }

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('id', tenantId)
    .maybeSingle();

  if (tenantError || !tenant) {
    return json(400, { error: 'No pudimos verificar el tenant seleccionado.' });
  }

  const branding = await resolveTenantEmailBranding(supabaseAdmin, tenant.id, tenant.name);
  const appUrl = getTenantAppUrl(branding, fallbackAppUrl);
  const from = getEmailSender(branding);
  const allEmails = buildAuditEmails({
    tenantName: tenant.name,
    recipient,
    branding,
    appUrl,
  });
  const selectedEmails = allEmails.filter((email) => requestedKeys.includes(email.key));

  const result = await sendBatch({
    from,
    recipient,
    emails: selectedEmails,
  });

  if (!result.ok) {
    return json(500, { error: result.error });
  }

  const providerErrors = Array.isArray(result.errors) ? result.errors : [];
  const responseData = Array.isArray(result.data) ? result.data : [];

  return json(200, {
    ok: true,
    tenant: { id: tenant.id, name: tenant.name },
    brandName: branding.brandName,
    from,
    recipient,
    sent: selectedEmails.length - providerErrors.length,
    failed: providerErrors.length,
    templates: selectedEmails.map((email, index) => ({
      key: email.key,
      label: email.label,
      subject: email.subject,
      providerId: responseData[index]?.id ?? null,
    })),
    providerErrors,
    note: 'La suite cubre emails generados por la app/Resend. Confirmación de email y recuperación de contraseña de Supabase Auth se auditan por separado.',
  });
};
