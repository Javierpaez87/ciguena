import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = 'Cigüeña | Platform by BondiApps <ciguena-no-reply@bondiapps.com>';
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

type SkippedInvitation = {
  email: string;
  reason: 'not_found' | 'registered' | 'inactive' | 'already_invited' | 'not_eligible';
};

function getFullName(row: DirectoryRow) {
  return (
    row.full_name ||
    [row.first_name, row.last_name].filter(Boolean).join(' ') ||
    row.email.split('@')[0]
  );
}

function buildInvitationHtml({
  fullName,
  tenantName,
  registerUrl,
}: {
  fullName: string;
  tenantName: string;
  registerUrl: string;
}) {
  const safeName = escapeHtml(fullName);
  const safeTenant = escapeHtml(tenantName);
  const safeUrl = escapeHtml(registerUrl);

  return `
    <div style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
      <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
        <div style="background:#111827;border:1px solid #334155;border-radius:16px;padding:28px;">
          <div style="margin-bottom:24px;">
            <div style="font-size:22px;font-weight:700;color:#f59e0b;letter-spacing:0.5px;">CIGÜEÑA</div>
            <div style="font-size:13px;color:#94a3b8;">Platform by BondiApps</div>
          </div>

          <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px;color:#f8fafc;">Tu empresa te invitó a Cigüeña</h1>

          <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 18px;">
            Hola ${safeName}, ${safeTenant} te preaprobó para ingresar a Cigüeña, la plataforma de capacitaciones y certificaciones.
          </p>

          <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px;margin:20px 0;">
            <p style="font-size:14px;line-height:1.6;color:#cbd5e1;margin:0;">
              Registrate con este mismo email para activar tu acceso. Una vez que ingreses, vas a poder firmar el Código de Ética y ver tus capacitaciones asignadas.
            </p>
          </div>

          <a href="${safeUrl}" style="display:inline-block;background:#f59e0b;color:#111827;text-decoration:none;font-weight:700;border-radius:10px;padding:12px 18px;margin:4px 0 18px;">
            Registrarme en Cigüeña
          </a>

          <p style="font-size:12px;line-height:1.5;color:#64748b;margin:0;">
            Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br/>${safeUrl}
          </p>

          <hr style="border:none;border-top:1px solid #334155;margin:28px 0;" />

          <p style="font-size:12px;line-height:1.5;color:#64748b;margin:0;">
            Este es un mensaje automático de Cigüeña | Platform by BondiApps.
          </p>
        </div>
      </div>
    </div>
  `;
}

async function sendResendBatch(
  emails: Array<{ to: string; subject: string; html: string }>
) {
  if (!resendApiKey) {
    return { ok: false as const, error: 'RESEND_API_KEY no configurada.' };
  }

  const response = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      emails.map((email) => ({
        from: fromEmail,
        to: [email.to],
        subject: email.subject,
        html: email.html,
      }))
    ),
  });

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false as const,
      error: responseBody?.message || responseBody?.error?.message || 'No pudimos enviar el lote de emails.',
    };
  }

  return { ok: true as const, data: responseBody };
}

function classifySkipped(
  email: string,
  rows: DirectoryRow[],
  allowResend: boolean
): SkippedInvitation | null {
  const row = rows.find((candidate) => normalizeEmail(candidate.email) === email);

  if (!row) return { email, reason: 'not_found' };
  if (row.profile_id) return { email, reason: 'registered' };

  const status = clean(row.status).toLowerCase();
  if (status === 'inactive') return { email, reason: 'inactive' };
  if (status === 'invited' && !allowResend) return { email, reason: 'already_invited' };
  if (status !== 'preapproved' && !(allowResend && status === 'invited')) {
    return { email, reason: 'not_eligible' };
  }

  return null;
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

  const { data: rows, error: rowsError } = await supabaseAdmin
    .from('employee_directory')
    .select('id, tenant_id, email, first_name, last_name, full_name, status, profile_id')
    .eq('tenant_id', tenantId)
    .in('email', emails);

  if (rowsError) {
    return json(500, { error: 'No pudimos leer la nómina de empleados.' });
  }

  const directoryRows = (rows ?? []) as DirectoryRow[];
  const skipped = emails
    .map((email) => classifySkipped(email, directoryRows, allowResend))
    .filter((item): item is SkippedInvitation => Boolean(item));
  const skippedEmails = new Set(skipped.map((item) => item.email));
  const eligibleRows = directoryRows.filter((row) => !skippedEmails.has(normalizeEmail(row.email)));

  if (eligibleRows.length === 0) {
    return json(200, {
      ok: true,
      sent: 0,
      failed: 0,
      skipped: skipped.length,
      skippedDetails: skipped,
      message: 'No había destinatarios habilitados para recibir la invitación.',
    });
  }

  const registerUrl = appUrl.replace(/\/$/, '');
  const batchResult = await sendResendBatch(
    eligibleRows.map((row) => ({
      to: row.email,
      subject: `Invitación a Cigüeña - ${tenantData.name}`,
      html: buildInvitationHtml({
        fullName: getFullName(row),
        tenantName: tenantData.name,
        registerUrl,
      }),
    }))
  );

  if (!batchResult.ok) {
    return json(502, {
      error: batchResult.error,
      sent: 0,
      failed: eligibleRows.length,
      skipped: skipped.length,
      skippedDetails: skipped,
    });
  }

  const sentIds = eligibleRows.map((row) => row.id);
  const invitedAt = new Date().toISOString();
  const { error: updateError } = await supabaseAdmin
    .from('employee_directory')
    .update({ status: 'invited', invited_at: invitedAt })
    .in('id', sentIds);

  if (updateError) {
    return json(500, {
      error: 'Los emails fueron enviados, pero no pudimos actualizar el estado de invitación.',
      sent: sentIds.length,
      failed: 0,
      skipped: skipped.length,
      skippedDetails: skipped,
    });
  }

  return json(200, {
    ok: true,
    sent: sentIds.length,
    failed: 0,
    skipped: skipped.length,
    skippedDetails: skipped,
  });
};
