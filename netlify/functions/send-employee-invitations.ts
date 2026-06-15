import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = 'Cigüeña | Platform by BondiApps <ciguena-no-reply@bondiapps.com>';
const appUrl = process.env.APP_URL || process.env.URL || 'https://ciguena-product.netlify.app';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
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

async function sendResendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!resendApiKey) {
    return { ok: false, error: 'RESEND_API_KEY no configurada.' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject,
      html,
    }),
  });

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      error: responseBody?.message || 'No pudimos enviar el email.',
    };
  }

  return { ok: true, data: responseBody };
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
  const emails = Array.isArray(payload.emails)
    ? Array.from(new Set(payload.emails.map(normalizeEmail).filter(Boolean)))
    : [];

  if (!tenantId) {
    return json(400, { error: 'Falta tenantId.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: tenantData, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('id', tenantId)
    .maybeSingle();

  if (tenantError || !tenantData) {
    return json(400, { error: 'No pudimos verificar la empresa.' });
  }

  let query = supabaseAdmin
    .from('employee_directory')
    .select('id, tenant_id, email, first_name, last_name, full_name, status, profile_id')
    .eq('tenant_id', tenantId)
    .is('profile_id', null)
    .in('status', ['preapproved', 'invited']);

  if (emails.length > 0) {
    query = query.in('email', emails);
  }

  const { data: rows, error: rowsError } = await query;

  if (rowsError) {
    return json(500, { error: 'No pudimos leer la nómina de empleados.' });
  }

  const directoryRows = (rows ?? []) as DirectoryRow[];

  if (directoryRows.length === 0) {
    return json(200, {
      ok: true,
      sent: 0,
      failed: 0,
      skipped: 0,
      message: 'No había trabajadores pendientes de invitación.',
    });
  }

  const registerUrl = `${appUrl.replace(/\/$/, '')}/register`;
  const results = [] as Array<{ id: string; email: string; ok: boolean; error?: string }>;

  // Envío secuencial para evitar rate limits y timeouts bruscos.
  for (const row of directoryRows) {
    const result = await sendResendEmail({
      to: row.email,
      subject: `Invitación a Cigüeña - ${tenantData.name}`,
      html: buildInvitationHtml({
        fullName: getFullName(row),
        tenantName: tenantData.name,
        registerUrl,
      }),
    });

    results.push({
      id: row.id,
      email: row.email,
      ok: result.ok,
      error: result.ok ? undefined : result.error,
    });
  }

  const sentIds = results.filter((result) => result.ok).map((result) => result.id);

  if (sentIds.length > 0) {
    await supabaseAdmin
      .from('employee_directory')
      .update({ status: 'invited', invited_at: new Date().toISOString() })
      .in('id', sentIds);
  }

  const failed = results.filter((result) => !result.ok);

  return json(200, {
    ok: true,
    sent: sentIds.length,
    failed: failed.length,
    errors: failed,
  });
};
