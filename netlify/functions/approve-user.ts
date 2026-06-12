import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const notifyEmail = process.env.REGISTRATION_NOTIFY_EMAIL || 'javierpaez@bondiapps.com';

const fromEmail = 'Cigüeña | Platform by BondiApps <ciguena-no-reply@bondiapps.com>';

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

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function sendResendEmail({
  to,
  subject,
  html,
  bcc,
}: {
  to: string | string[];
  subject: string;
  html: string;
  bcc?: string | string[];
}) {
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY no configurada. No se envió email.');
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
      bcc,
      subject,
      html,
    }),
  });

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    console.error('Error enviando email con Resend:', response.status, responseBody);
    return {
      ok: false,
      error: responseBody?.message || 'No pudimos enviar el email.',
    };
  }

  return { ok: true, data: responseBody };
}

function buildApprovalEmailHtml({
  fullName,
  tenantName,
}: {
  fullName: string;
  tenantName: string;
}) {
  const safeName = escapeHtml(fullName || 'Usuario');
  const safeTenant = escapeHtml(tenantName || 'tu empresa');

  return `
    <div style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
      <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
        <div style="background:#111827;border:1px solid #334155;border-radius:16px;padding:28px;">
          <div style="margin-bottom:24px;">
            <div style="font-size:22px;font-weight:700;color:#f59e0b;letter-spacing:0.5px;">
              CIGÜEÑA
            </div>
            <div style="font-size:13px;color:#94a3b8;">
              Platform by BondiApps
            </div>
          </div>

          <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px;color:#f8fafc;">
            Tu cuenta fue aprobada
          </h1>

          <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 18px;">
            Hola ${safeName}, tu acceso a Cigüeña fue aprobado por la administración de ${safeTenant}.
          </p>

          <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px;margin:20px 0;">
            <p style="font-size:14px;line-height:1.6;color:#cbd5e1;margin:0;">
              <strong style="color:#f8fafc;">Estado:</strong> cuenta activa
            </p>
          </div>

          <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 18px;">
            Ya podés ingresar a la plataforma con el email y la contraseña que cargaste al registrarte.
          </p>

          <p style="font-size:14px;line-height:1.6;color:#94a3b8;margin:0;">
            Si no solicitaste este acceso o tenés dudas, contactá con la administración de tu empresa.
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

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Método no permitido.' });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, {
      error: 'Faltan variables de entorno del servidor.',
    });
  }

  let payload: any;

  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Solicitud inválida.' });
  }

  const profileId = clean(payload.profileId);
  const tenantId = clean(payload.tenantId);
  const nextStatus = clean(payload.status) || 'active';

  if (!profileId || !tenantId) {
    return json(400, { error: 'Faltan datos para aprobar el usuario.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  if (nextStatus === 'active') {
    updatePayload.preapproved = true;
  }

  const { data: updatedProfile, error: updateError } = await supabaseAdmin
    .from('profiles')
    .update(updatePayload)
    .eq('id', profileId)
    .eq('tenant_id', tenantId)
    .select('id, tenant_id, full_name, first_name, last_name, email, status, preapproved')
    .single();

  if (updateError || !updatedProfile) {
    console.error('Error actualizando profile:', updateError);
    return json(400, {
      error: 'No pudimos actualizar el usuario en Supabase.',
    });
  }

  let tenantName = 'tu empresa';

  const { data: tenantData } = await supabaseAdmin
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .maybeSingle();

  if (tenantData?.name) {
    tenantName = tenantData.name;
  }

  const fullName =
    updatedProfile.full_name ||
    [updatedProfile.first_name, updatedProfile.last_name].filter(Boolean).join(' ') ||
    updatedProfile.email ||
    'Usuario';

  let emailSent = false;

  if (nextStatus === 'active' && updatedProfile.email) {
    const emailResult = await sendResendEmail({
      to: updatedProfile.email,
      bcc: notifyEmail,
      subject: 'Tu cuenta de Cigüeña fue aprobada',
      html: buildApprovalEmailHtml({
        fullName,
        tenantName,
      }),
    });

    emailSent = emailResult.ok;
  }

  return json(200, {
    ok: true,
    profile: updatedProfile,
    email_sent: emailSent,
    message:
      nextStatus === 'active'
        ? 'Usuario activado correctamente.'
        : 'Usuario actualizado correctamente.',
  });
};
