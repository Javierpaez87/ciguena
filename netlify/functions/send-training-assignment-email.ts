import { getTrainingTitle } from './_training-titles';
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
  process.env.CIGUENA_APP_URL ||
  process.env.URL ||
  process.env.DEPLOY_PRIME_URL ||
  'https://ciguena.netlify.app';


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
  from,
}: {
  to: string;
  subject: string;
  html: string;
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

function buildAssignmentEmailHtml({
  fullName,
  tenantName,
  trainingTitle,
  loginUrl,
  branding,
}: {
  fullName: string;
  tenantName: string;
  trainingTitle: string;
  loginUrl: string;
  branding: TenantEmailBranding;
}) {
  const safeName = escapeHtml(fullName || 'Hola');
  const safeTenant = escapeHtml(tenantName || 'Tu empresa');
  const safeTrainingTitle = escapeHtml(trainingTitle);
  const safeLoginUrl = escapeHtml(loginUrl);
  const safeBrand = escapeHtml(branding.brandName);
  const ctaColor = branding.accentColor;
  const ctaTextColor = getCtaTextColor(ctaColor);

  return `
    <div style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
      <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
        <div style="background:#111827;border:1px solid #334155;border-radius:16px;padding:28px;">
          ${renderEmailBrandHeader(branding)}

          <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px;color:#f8fafc;">
            Tenés un nuevo curso asignado
          </h1>

          <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 18px;">
            Hola ${safeName}, ${safeTenant} te asignó un nuevo curso en ${safeBrand}.
          </p>

          <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px;margin:20px 0;">
            <p style="font-size:14px;line-height:1.6;color:#cbd5e1;margin:0;">
              <strong style="color:#f8fafc;">Curso:</strong> ${safeTrainingTitle}<br/>
              <strong style="color:#f8fafc;">Estado:</strong> pendiente de realización
            </p>
          </div>

          <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 20px;">
            Ingresá a la plataforma para completar el entrenamiento. Una vez aprobado el examen, vas a poder acceder a tu certificado.
          </p>

          <p style="margin:24px 0;">
            <a href="${safeLoginUrl}"
              style="display:inline-block;background:${ctaColor};color:${ctaTextColor};text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">
              Ingresar a ${safeBrand}
            </a>
          </p>

          <p style="font-size:14px;line-height:1.6;color:#94a3b8;margin:0;">
            Si ya completaste este curso recientemente, podés ignorar este mensaje o consultar con el administrador de tu empresa.
          </p>

          ${renderEmailFooter(branding)}
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
      error: 'Faltan variables de entorno de Supabase.',
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Authenticate the caller before service-role reads or email side effects.
  const authorizationHeader = clean(event.headers?.authorization || event.headers?.Authorization);
  const accessToken = authorizationHeader.toLowerCase().startsWith('bearer ')
    ? authorizationHeader.slice(7).trim()
    : '';
  if (!accessToken) return json(401, { error: 'Sesión no autorizada.' });

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
  if (authError || !authData?.user) {
    return json(401, { error: 'La sesión no es válida o venció.' });
  }

  const { data: requester, error: requesterError } = await supabaseAdmin
    .from('profiles')
    .select('tenant_id, role, status, deleted_at')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();
  if (requesterError || !requester || requester.deleted_at ||
      clean(requester.status).toLowerCase() !== 'active') {
    return json(403, { error: 'Perfil sin autorización para enviar notificaciones.' });
  }
  const requesterRole = clean(requester.role).toLowerCase();
  const globalAdmin = requesterRole === 'super_admin' || requesterRole === 'superadmin';
  if (!globalAdmin && requesterRole !== 'admin') {
    return json(403, { error: 'Se requiere un perfil administrador.' });
  }

  let payload: any;

  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Solicitud inválida.' });
  }

  const assignmentId = clean(payload.assignmentId);

  if (!assignmentId) {
    return json(400, { error: 'Falta assignmentId.' });
  }

  const { data: assignment, error: assignmentError } = await supabaseAdmin
    .from('training_assignments')
    .select('id, user_id, training_id, tenant_id')
    .eq('id', assignmentId)
    .maybeSingle();

  if (assignmentError) {
    console.error('Error buscando asignación:', assignmentError);

    return json(500, {
      error: 'No pudimos buscar la asignación.',
    });
  }

  if (!assignment) {
    return json(404, {
      error: 'La asignación no existe.',
    });
  }

  if (!globalAdmin && requester.tenant_id !== assignment.tenant_id) {
    return json(403, { error: 'No tenés permisos para enviar emails de esta empresa.' });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, tenant_id, full_name, email, status, deleted_at')
    .eq('id', assignment.user_id)
    .maybeSingle();

  if (profileError) {
    console.error('Error buscando perfil:', profileError);

    return json(500, {
      error: 'No pudimos buscar el perfil del usuario.',
    });
  }

  if (!profile) {
    return json(404, {
      error: 'No encontramos el perfil asociado a la asignación.',
    });
  }

  if (profile.tenant_id !== assignment.tenant_id) {
    return json(409, { error: 'La asignación y el perfil pertenecen a empresas distintas.' });
  }

  if (profile.deleted_at) {
    return json(409, { error: 'El perfil está en papelera. No se enviará el correo.' });
  }

  if (!profile.email) {
    return json(400, {
      error: 'El usuario asignado no tiene email cargado.',
    });
  }

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('id', assignment.tenant_id)
    .maybeSingle();

  if (tenantError) {
    console.error('Error buscando tenant:', tenantError);

    return json(500, {
      error: 'No pudimos buscar la empresa.',
    });
  }

  const trainingId = assignment.training_id || '';
  const trainingTitle = getTrainingTitle(trainingId);
  const tenantName = tenant?.name || 'Tu empresa';
  const branding = await resolveTenantEmailBranding(
    supabaseAdmin,
    assignment.tenant_id,
    tenantName
  );
  const emailFrom = getEmailSender(branding);
  const loginUrl = getTenantAppUrl(branding, appUrl) + '/';
  const subject = `Nuevo curso asignado: ${trainingTitle}`;

  const notificationBase = {
    tenant_id: assignment.tenant_id,
    profile_id: profile.id,
    assignment_id: assignment.id,
    training_id: trainingId,
    type: 'training_assignment',
    recipient_email: profile.email,
    subject,
  };

  const { data: notification, error: notificationInsertError } = await supabaseAdmin
    .from('email_notifications')
    .insert({
      ...notificationBase,
      status: 'pending',
    })
    .select('id')
    .maybeSingle();

  if (notificationInsertError) {
    console.warn(
      'No se pudo crear email_notifications. Se intenta enviar igual:',
      notificationInsertError
    );
  }

  const emailResult = await sendResendEmail({
    to: profile.email,
    from: emailFrom,
    subject,
    html: buildAssignmentEmailHtml({
      fullName: profile.full_name || '',
      tenantName,
      trainingTitle,
      loginUrl,
      branding,
    }),
  });

  if (notification?.id) {
    await supabaseAdmin
      .from('email_notifications')
      .update({
        status: emailResult.ok ? 'sent' : 'failed',
        error_message: emailResult.ok ? null : emailResult.error,
        sent_at: emailResult.ok ? new Date().toISOString() : null,
      })
      .eq('id', notification.id);
  } else {
    await supabaseAdmin.from('email_notifications').insert({
      ...notificationBase,
      status: emailResult.ok ? 'sent' : 'failed',
      error_message: emailResult.ok ? null : emailResult.error,
      sent_at: emailResult.ok ? new Date().toISOString() : null,
    });
  }

  if (!emailResult.ok) {
    return json(500, {
      ok: false,
      error: emailResult.error || 'No pudimos enviar el email.',
    });
  }

  return json(200, {
    ok: true,
    email_sent: true,
    assignment_id: assignment.id,
    recipient_email: profile.email,
    training_id: trainingId,
    training_title: trainingTitle,
  });
};
