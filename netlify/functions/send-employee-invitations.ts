import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import {
  getCtaTextColor,
  getEmailSender,
  getTenantAppUrl,
  renderEmailBrandHeader,
  renderEmailFooter,
  resolveTenantEmailBranding,
  type TenantEmailBranding,
} from './_tenant-email-branding';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const appUrl =
  process.env.CIGUENA_PLATFORM_URL ||
  process.env.APP_URL ||
  process.env.URL ||
  'https://ciguena-product.netlify.app';

const MAX_BATCH_SIZE = 100;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
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

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildDirectRegistrationUrl(baseUrl: string, email: string) {
  const url = new URL(baseUrl);
  url.searchParams.set('auth', 'register');
  url.searchParams.set('email', normalizeEmail(email));
  return url.toString();
}

type DirectoryRow = {
  id: string;
  tenant_id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  status?: string | null;
  profile_id?: string | null;
};

type SkipReason =
  | 'not_found'
  | 'registered'
  | 'inactive'
  | 'already_invited'
  | 'not_eligible';

type InvitationResult = {
  email: string;
  status: 'accepted' | 'failed' | 'skipped';
  reason?: SkipReason;
  message?: string;
  providerId?: string;
};

type ResendBatchResponse = {
  data?: Array<{ id?: string }>;
  errors?: Array<{ index?: number; message?: string }>;
  message?: string;
  error?: { message?: string };
};

function toGreetingName(value: string) {
  const firstToken = clean(value).split(/\s+/).filter(Boolean)[0] || '';
  if (!firstToken) return '';

  return firstToken
    .toLocaleLowerCase('es-AR')
    .replace(/(^|[-'’])([a-záéíóúüñ])/g, (_match, separator, letter) =>
      `${separator}${letter.toLocaleUpperCase('es-AR')}`
    );
}

function getGreetingName(row: DirectoryRow) {
  return (
    toGreetingName(clean(row.first_name)) ||
    toGreetingName(clean(row.full_name)) ||
    toGreetingName(row.email.split('@')[0]) ||
    'Hola'
  );
}

function buildInvitationHtml({
  greetingName,
  tenantName,
  registerUrl,
  branding,
}: {
  greetingName: string;
  tenantName: string;
  registerUrl: string;
  branding: TenantEmailBranding;
}) {
  const safeName = escapeHtml(greetingName);
  const safeTenant = escapeHtml(tenantName);
  const safeUrl = escapeHtml(registerUrl);
  const safeBrand = escapeHtml(branding.brandName);
  const ctaColor = branding.accentColor;
  const ctaTextColor = getCtaTextColor(ctaColor);
  const isFullWhiteLabel =
    branding.isCustomBranding && !branding.showPoweredByBondiApps;

  const title = isFullWhiteLabel
    ? `Te damos la bienvenida a ${safeBrand} Capacitaciones`
    : `Tu empresa te invitó a ${safeBrand}`;

  const intro = isFullWhiteLabel
    ? `Hola ${safeName}, ya podés crear tu cuenta para acceder a la plataforma de capacitaciones y certificaciones de ${safeTenant}.`
    : `Hola ${safeName}, ${safeTenant} te invitó a usar ${safeBrand}, su plataforma de capacitaciones y certificaciones.`;

  const onboardingCopy = isFullWhiteLabel
    ? 'Registrate utilizando este mismo email. En tu primer ingreso vas a poder revisar tus datos y completar los requisitos de onboarding correspondientes.'
    : 'Registrate con este mismo email para activar tu acceso. En tu primer ingreso vas a revisar tus datos de nómina y completar los requisitos de onboarding de tu organización, incluida tu firma electrónica.';

  const ctaLabel = isFullWhiteLabel
    ? 'Crear mi cuenta'
    : `Registrarme en ${safeBrand}`;

  return `
    <div style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
      <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
        <div style="background:#111827;border:1px solid #334155;border-radius:16px;padding:28px;">
          ${renderEmailBrandHeader(branding)}

          <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px;color:#f8fafc;">${title}</h1>

          <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 18px;">
            ${intro}
          </p>

          <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px;margin:20px 0;">
            <p style="font-size:14px;line-height:1.6;color:#cbd5e1;margin:0;">
              ${onboardingCopy}
            </p>
          </div>

          <a href="${safeUrl}" style="display:inline-block;background:${ctaColor};color:${ctaTextColor};text-decoration:none;font-weight:700;border-radius:10px;padding:12px 18px;margin:4px 0 18px;">
            ${ctaLabel}
          </a>

          <p style="font-size:12px;line-height:1.5;color:#64748b;margin:0;">
            Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br/>
            <a href="${safeUrl}" style="color:${branding.accentColor};word-break:break-all;">${safeUrl}</a>
          </p>

          ${renderEmailFooter(branding)}
        </div>
      </div>
    </div>
  `;
}

function sanitizeRequestId(value: unknown) {
  const normalized = clean(value).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  return normalized || randomUUID();
}

async function sendResendBatch({
  emails,
  idempotencyKey,
  from,
}: {
  emails: Array<{ to: string; subject: string; html: string }>;
  idempotencyKey: string;
  from: string;
}) {
  if (!resendApiKey) {
    return { ok: false as const, error: 'RESEND_API_KEY no configurada.' };
  }

  const response = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      'x-batch-validation': 'permissive',
    },
    body: JSON.stringify(
      emails.map((email) => ({
        from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
      }))
    ),
  });

  const responseBody = (await response.json().catch(() => null)) as ResendBatchResponse | null;

  if (!response.ok) {
    return {
      ok: false as const,
      error:
        responseBody?.message ||
        responseBody?.error?.message ||
        'No pudimos enviar el lote de emails.',
    };
  }

  return {
    ok: true as const,
    data: responseBody?.data ?? [],
    errors: responseBody?.errors ?? [],
  };
}

function classifySkipped(
  email: string,
  row: DirectoryRow | undefined,
  allowResend: boolean
): InvitationResult | null {
  if (!row) return { email, status: 'skipped', reason: 'not_found' };
  if (row.profile_id) return { email, status: 'skipped', reason: 'registered' };

  const status = clean(row.status).toLowerCase();
  if (status === 'inactive') return { email, status: 'skipped', reason: 'inactive' };
  if (status === 'invited' && !allowResend) {
    return { email, status: 'skipped', reason: 'already_invited' };
  }
  const canReceiveFirstInvitation = ['preapproved', 'pending', 'active'].includes(status);
  const canReceiveResend = allowResend && status === 'invited';

  if (!canReceiveFirstInvitation && !canReceiveResend) {
    return { email, status: 'skipped', reason: 'not_eligible' };
  }

  return null;
}

async function updateInvitationStatus(
  supabaseAdmin: ReturnType<typeof createClient>,
  ids: string[],
  invitedAt: string
) {
  if (ids.length === 0) return null;

  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { error } = await supabaseAdmin
      .from('employee_directory')
      .update({ status: 'invited', invited_at: invitedAt })
      .in('id', ids);

    if (!error) return null;
    lastError = error;

    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  return lastError;
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Método no permitido.' });
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
  const allowResend = payload.allowResend === true;
  const requestId = sanitizeRequestId(payload.requestId);
  const batchIndex = Number.isInteger(payload.batchIndex) && payload.batchIndex >= 0
    ? payload.batchIndex
    : 0;
  const emails: string[] = Array.isArray(payload.emails)
    ? Array.from(new Set<string>(payload.emails.map(normalizeEmail).filter(Boolean)))
    : [];

  if (!tenantId) {
    return json(400, { error: 'Falta tenantId.' });
  }

  if (emails.length === 0) {
    return json(400, {
      error: 'Falta indicar los destinatarios. El envío masivo debe confirmarse desde la aplicación.',
    });
  }

  if (emails.length > MAX_BATCH_SIZE) {
    return json(400, {
      error: `Cada lote puede contener como máximo ${MAX_BATCH_SIZE} destinatarios.`,
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
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
    .select('tenant_id, role, status')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  const requesterRole = clean(requesterProfile?.role).toLowerCase();
  const isSuperAdmin = requesterRole === 'super_admin' || requesterRole === 'superadmin';
  const isTenantAdmin = requesterRole === 'admin' && requesterProfile?.tenant_id === tenantId;

  if (
    requesterError ||
    !requesterProfile ||
    clean(requesterProfile.status).toLowerCase() !== 'active' ||
    (!isSuperAdmin && !isTenantAdmin)
  ) {
    return json(403, { error: 'No tenés permisos para enviar invitaciones de esta empresa.' });
  }

  const { data: tenantData, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('id', tenantId)
    .maybeSingle();

  if (tenantError || !tenantData) {
    return json(400, { error: 'No pudimos verificar la empresa.' });
  }

  const branding = await resolveTenantEmailBranding(
    supabaseAdmin,
    tenantId,
    tenantData.name
  );
  const emailFrom = getEmailSender(branding);

  const { data: rows, error: rowsError } = await supabaseAdmin
    .from('employee_directory')
    .select('id, tenant_id, email, first_name, last_name, full_name, status, profile_id')
    .eq('tenant_id', tenantId)
    .in('email', emails);

  if (rowsError) {
    return json(500, { error: 'No pudimos leer la nómina de empleados.' });
  }

  const directoryRows = (rows ?? []) as DirectoryRow[];
  const rowByEmail = new Map(
    directoryRows.map((row) => [normalizeEmail(row.email), row] as const)
  );

  const results: InvitationResult[] = [];
  const eligibleRows: DirectoryRow[] = [];

  emails.forEach((email) => {
    const row = rowByEmail.get(email);
    const skipped = classifySkipped(email, row, allowResend);

    if (skipped) {
      results.push(skipped);
    } else if (row) {
      eligibleRows.push(row);
    }
  });

  if (eligibleRows.length === 0) {
    return json(200, {
      ok: true,
      accepted: 0,
      failed: 0,
      skipped: results.length,
      trackingWarning: null,
      results,
      message: 'No había destinatarios habilitados para recibir la invitación.',
    });
  }

  const baseRegisterUrl = getTenantAppUrl(branding, appUrl);
  const idempotencyKey = `ciguena-invite/${tenantId}/${requestId}/${batchIndex}`.slice(0, 256);
  const batchResult = await sendResendBatch({
    idempotencyKey,
    from: emailFrom,
    emails: eligibleRows.map((row) => {
      const isFullWhiteLabel =
        branding.isCustomBranding && !branding.showPoweredByBondiApps;

      return {
        to: row.email,
        subject: isFullWhiteLabel
          ? `Creá tu cuenta en ${branding.brandName} Capacitaciones`
          : `Invitación a ${branding.brandName} - ${tenantData.name}`,
        html: buildInvitationHtml({
          greetingName: getGreetingName(row),
          tenantName: tenantData.name,
          registerUrl: buildDirectRegistrationUrl(baseRegisterUrl, row.email),
          branding,
        }),
      };
    }),
  });

  if (!batchResult.ok) {
    const failedResults: InvitationResult[] = eligibleRows.map((row) => ({
      email: normalizeEmail(row.email),
      status: 'failed',
      message: batchResult.error,
    }));

    const resultByEmail = new Map(
      [...results, ...failedResults].map((result) => [result.email, result] as const)
    );
    const orderedResults = emails
      .map((email) => resultByEmail.get(email))
      .filter((result): result is InvitationResult => Boolean(result));

    return json(502, {
      ok: false,
      error: batchResult.error,
      accepted: 0,
      failed: failedResults.length,
      skipped: results.length,
      trackingWarning: null,
      results: orderedResults,
    });
  }

  const errorByIndex = new Map<number, string>();
  batchResult.errors.forEach((error) => {
    if (typeof error.index === 'number' && error.index >= 0) {
      errorByIndex.set(error.index, clean(error.message) || 'El proveedor rechazó este email.');
    }
  });

  const acceptedRows: DirectoryRow[] = [];
  let providerDataIndex = 0;

  eligibleRows.forEach((row, index) => {
    const validationError = errorByIndex.get(index);

    if (validationError) {
      results.push({
        email: normalizeEmail(row.email),
        status: 'failed',
        message: validationError,
      });
      return;
    }

    const providerId = clean(batchResult.data[providerDataIndex]?.id);
    providerDataIndex += 1;

    if (!providerId) {
      results.push({
        email: normalizeEmail(row.email),
        status: 'failed',
        message: 'El proveedor no devolvió una confirmación individual para este email.',
      });
      return;
    }

    acceptedRows.push(row);
    results.push({
      email: normalizeEmail(row.email),
      status: 'accepted',
      providerId,
    });
  });

  const invitedAt = new Date().toISOString();
  const updateError = await updateInvitationStatus(
    supabaseAdmin,
    acceptedRows.map((row) => row.id),
    invitedAt
  );

  const trackingWarning = updateError
    ? 'Los emails fueron aceptados por el proveedor, pero Cigüeña no pudo actualizar su estado. No repitas el envío sin revisar el panel de Resend.'
    : null;

  const resultByEmail = new Map(results.map((result) => [result.email, result] as const));
  const orderedResults = emails
    .map((email) => resultByEmail.get(email))
    .filter((result): result is InvitationResult => Boolean(result));

  const accepted = orderedResults.filter((result) => result.status === 'accepted').length;
  const failed = orderedResults.filter((result) => result.status === 'failed').length;
  const skipped = orderedResults.filter((result) => result.status === 'skipped').length;

  return json(200, {
    ok: failed === 0 && !trackingWarning,
    accepted,
    failed,
    skipped,
    trackingWarning,
    results: orderedResults,
  });
};
