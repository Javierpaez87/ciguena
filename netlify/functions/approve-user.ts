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
const notifyEmail =
  process.env.REGISTRATION_NOTIFY_EMAIL || 'javierpaez@bondiapps.com';


const platformUrl =
  process.env.CIGUENA_PLATFORM_URL ||
  'https://ciguena-product.netlify.app/';

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

async function sendResendEmail({
  to,
  subject,
  html,
  bcc,
  from,
}: {
  to: string | string[];
  subject: string;
  html: string;
  bcc?: string | string[];
  from: string;
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
      from,
      to,
      bcc,
      subject,
      html,
    }),
  });

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    console.error(
      'Error enviando email con Resend:',
      response.status,
      responseBody
    );

    return {
      ok: false,
      error: responseBody?.message || 'No pudimos enviar el email.',
    };
  }

  return { ok: true, data: responseBody };
}

export function buildApprovalEmailHtml({
  fullName,
  tenantName,
  platformUrl: tenantPlatformUrl,
  branding,
}: {
  fullName: string;
  tenantName: string;
  platformUrl: string;
  branding: TenantEmailBranding;
}) {
  const safeName = escapeHtml(fullName || 'Usuario');
  const safeTenant = escapeHtml(tenantName || 'tu empresa');
  const safeBrand = escapeHtml(branding.brandName);
  const safePlatformUrl = escapeHtml(tenantPlatformUrl);
  const ctaColor = branding.accentColor;
  const ctaTextColor = getCtaTextColor(ctaColor);

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Tu cuenta fue aprobada</title>
      </head>

      <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
        <div style="margin:0;padding:0;background:#0f172a;">
          <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
            <div style="background:#111827;border:1px solid #334155;border-radius:16px;padding:28px;">
              ${renderEmailBrandHeader(branding)}

              <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px;color:#f8fafc;">
                Tu cuenta fue aprobada
              </h1>

              <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 18px;">
                Hola ${safeName}, tu acceso a ${safeBrand} fue aprobado por la administración de ${safeTenant}.
              </p>

              <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px;margin:20px 0;">
                <p style="font-size:14px;line-height:1.6;color:#cbd5e1;margin:0;">
                  <strong style="color:#f8fafc;">Estado:</strong> cuenta activa
                </p>
              </div>

              <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 20px;">
                Ya podés ingresar a la plataforma con el email y la contraseña que cargaste al registrarte.
              </p>

              <div style="text-align:center;margin:28px 0;">
                <a
                  href="${safePlatformUrl}"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="display:inline-block;background:${ctaColor};color:${ctaTextColor};text-decoration:none;font-size:15px;font-weight:700;line-height:1;padding:15px 24px;border-radius:10px;"
                >
                  Ingresar a ${safeBrand}
                </a>
              </div>

              <div style="background:#0f172a;border:1px solid #334155;border-radius:10px;padding:14px;margin:0 0 22px;">
                <p style="font-size:12px;line-height:1.5;color:#94a3b8;margin:0 0 6px;">
                  Si el botón no funciona, copiá y pegá esta dirección en tu navegador:
                </p>

                <a
                  href="${safePlatformUrl}"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="font-size:12px;line-height:1.5;color:${branding.accentColor};text-decoration:underline;word-break:break-all;"
                >
                  ${safePlatformUrl}
                </a>
              </div>

              <p style="font-size:14px;line-height:1.6;color:#94a3b8;margin:0;">
                Si no solicitaste este acceso o tenés dudas, contactá con la administración de tu empresa.
              </p>

              ${renderEmailFooter(branding)}
            </div>
          </div>
        </div>
      </body>
    </html>
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
    return json(400, {
      error: 'Faltan datos para aprobar el usuario.',
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Primero consultamos el perfil para saber si solicitó acceso como administrador.
  // El rol no debe venir decidido desde el frontend: la promoción se resuelve acá.
  const { data: currentProfile, error: currentProfileError } = await supabaseAdmin
    .from('profiles')
    .select('id, tenant_id, role, requested_admin')
    .eq('id', profileId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (currentProfileError || !currentProfile) {
    console.error('Error buscando profile antes de aprobar:', currentProfileError);

    return json(404, {
      error: 'No encontramos el usuario solicitado dentro de esa empresa.',
    });
  }

  const isAdminApproval =
    nextStatus === 'active' && currentProfile.requested_admin === true;

  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  if (nextStatus === 'active') {
    updatePayload.preapproved = true;
  }

  // Si la persona pidió acceso administrativo y la solicitud es aprobada,
  // la convertimos realmente en admin y cerramos la solicitud pendiente.
  if (isAdminApproval) {
    updatePayload.role = 'admin';
    updatePayload.requested_admin = false;
  }

  const { data: updatedProfile, error: updateError } = await supabaseAdmin
    .from('profiles')
    .update(updatePayload)
    .eq('id', profileId)
    .eq('tenant_id', tenantId)
    .select(
      'id, tenant_id, auth_user_id, full_name, first_name, last_name, email, phone, dni, employee_code, job_role, work_role, position, area, contractor_company, role, status, preapproved, requested_admin, source'
    )
    .single();

  if (updateError || !updatedProfile) {
    console.error('Error actualizando profile:', updateError);

    return json(400, {
      error: 'No pudimos actualizar el usuario en Supabase.',
    });
  }

  const now = new Date().toISOString();

  if (updatedProfile.email) {
    const normalizedEmail = normalizeEmail(updatedProfile.email);
    const directoryStatus = nextStatus === 'active' ? 'registered' : nextStatus;

    const directoryPayload = {
      tenant_id: tenantId,
      email: normalizedEmail,
      first_name: updatedProfile.first_name || null,
      last_name: updatedProfile.last_name || null,
      full_name:
        updatedProfile.full_name ||
        [updatedProfile.first_name, updatedProfile.last_name].filter(Boolean).join(' ') ||
        updatedProfile.email ||
        null,
      phone: updatedProfile.phone || null,
      dni: updatedProfile.dni || null,
      employee_code: updatedProfile.employee_code || null,
      work_role: updatedProfile.job_role || updatedProfile.position || null,
      position: updatedProfile.position || updatedProfile.job_role || null,
      area: updatedProfile.area || null,
      contractor_company: updatedProfile.contractor_company || null,
      status: directoryStatus,
      profile_id: updatedProfile.id,
      registered_at: nextStatus === 'active' ? now : null,
      source:
        updatedProfile.source ||
        (isAdminApproval ? 'self_register_admin_approved' : 'self_register_worker_approved'),
      updated_at: now,
    };

    const { data: existingDirectory, error: directoryLookupError } = await supabaseAdmin
      .from('employee_directory')
      .select('id, registered_at')
      .eq('tenant_id', tenantId)
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (directoryLookupError) {
      console.error('Error buscando employee_directory:', directoryLookupError);
    } else if (existingDirectory?.id) {
      const { error: directoryUpdateError } = await supabaseAdmin
        .from('employee_directory')
        .update({
          ...directoryPayload,
          registered_at:
            nextStatus === 'active' ? existingDirectory.registered_at || now : existingDirectory.registered_at,
        })
        .eq('id', existingDirectory.id);

      if (directoryUpdateError) {
        console.error('Error actualizando employee_directory:', directoryUpdateError);
      }
    } else {
      const { error: directoryInsertError } = await supabaseAdmin
        .from('employee_directory')
        .insert({
          ...directoryPayload,
          created_at: now,
        });

      if (directoryInsertError) {
        console.error('Error creando employee_directory:', directoryInsertError);
      }
    }
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

  const branding = await resolveTenantEmailBranding(
    supabaseAdmin,
    tenantId,
    tenantName
  );
  const emailFrom = getEmailSender(branding);

  const fullName =
    updatedProfile.full_name ||
    [updatedProfile.first_name, updatedProfile.last_name]
      .filter(Boolean)
      .join(' ') ||
    updatedProfile.email ||
    'Usuario';

  let emailSent = false;

  if (nextStatus === 'active' && updatedProfile.email) {
    const emailResult = await sendResendEmail({
      to: updatedProfile.email,
      bcc: notifyEmail,
      from: emailFrom,
      subject: `Tu cuenta de ${branding.brandName} fue aprobada`,
      html: buildApprovalEmailHtml({
        fullName,
        tenantName,
        platformUrl: getTenantAppUrl(branding, platformUrl),
        branding,
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
        ? isAdminApproval
          ? 'Administrador aprobado correctamente.'
          : 'Usuario activado correctamente.'
        : 'Usuario actualizado correctamente.',
  });
};
