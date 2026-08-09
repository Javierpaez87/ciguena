import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

const appUrl =
  process.env.CIGUENA_APP_URL ||
  process.env.URL ||
  process.env.DEPLOY_PRIME_URL ||
  'https://ciguena.netlify.app';

const fromEmail =
  process.env.CIGUENA_FROM_EMAIL ||
  'Cigüeña | Platform by BondiApps <ciguena-no-reply@bondiapps.com>';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const TRAINING_TITLES: Record<string, string> = {
  tr_hand_safety: 'Cuidado de manos',
  tr_working_at_heights: 'Trabajo en altura',
  tr_energy_isolation: 'Aislamiento de energía',
  tr_line_of_fire: 'Línea de fuego',
  tr_confined_spaces: 'Espacios confinados',
  tr_hot_work: 'Trabajo en caliente',
  tr_lifting_operations: 'Izaje mecánico seguro',
};

type NotificationType = 'assignment' | 'reminder' | 'unassignment' | 'reassignment';

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

function getTrainingTitle(trainingId: string) {
  return TRAINING_TITLES[trainingId] || trainingId || 'Curso asignado';
}

function normalizeType(value: unknown): NotificationType {
  const type = clean(value).toLowerCase();

  if (type === 'reminder') return 'reminder';
  if (type === 'unassignment') return 'unassignment';
  if (type === 'reassignment') return 'reassignment';

  return 'assignment';
}

function getNotificationTypeForDb(type: NotificationType) {
  if (type === 'reminder') return 'training_reminder';
  if (type === 'unassignment') return 'training_unassignment';
  if (type === 'reassignment') return 'training_reassignment';
  return 'training_assignment';
}

function getEmailEventType(type: NotificationType, ok: boolean) {
  const suffix = ok ? 'email_sent' : 'email_failed';

  if (type === 'reminder') return `reminder_${suffix}`;
  if (type === 'unassignment') return `unassignment_${suffix}`;
  if (type === 'reassignment') return `reassignment_${suffix}`;
  return `assignment_${suffix}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha límite';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Sin fecha límite';

  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getSubject(type: NotificationType, trainingTitle: string) {
  if (type === 'reminder') return `Recordatorio de curso pendiente: ${trainingTitle}`;
  if (type === 'unassignment') return `Curso desasignado: ${trainingTitle}`;
  if (type === 'reassignment') return `Curso reasignado: ${trainingTitle}`;
  return `Nuevo curso asignado: ${trainingTitle}`;
}

function getHeading(type: NotificationType) {
  if (type === 'reminder') return 'Recordatorio de curso pendiente';
  if (type === 'unassignment') return 'Curso desasignado';
  if (type === 'reassignment') return 'Tenés un curso reasignado';
  return 'Tenés un nuevo curso asignado';
}

function getIntroText({
  type,
  safeName,
  safeTenant,
}: {
  type: NotificationType;
  safeName: string;
  safeTenant: string;
}) {
  if (type === 'reminder') {
    return `Hola ${safeName}, ${safeTenant} te recuerda que tenés un curso pendiente en la plataforma Cigüeña.`;
  }

  if (type === 'unassignment') {
    return `Hola ${safeName}, ${safeTenant} desasignó este curso de tu recorrido de capacitación en Cigüeña.`;
  }

  if (type === 'reassignment') {
    return `Hola ${safeName}, ${safeTenant} te reasignó este curso en la plataforma Cigüeña.`;
  }

  return `Hola ${safeName}, ${safeTenant} te asignó un nuevo curso en la plataforma Cigüeña.`;
}

function getCtaText(type: NotificationType) {
  if (type === 'unassignment') return 'Ingresar a Cigüeña';
  if (type === 'reminder') return 'Completar curso';
  return 'Ingresar a Cigüeña';
}

function getStatusText(type: NotificationType) {
  if (type === 'unassignment') return 'desasignado';
  return 'pendiente de realización';
}

async function sendResendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
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

function buildNotificationEmailHtml({
  type,
  fullName,
  tenantName,
  trainingTitle,
  dueDate,
  loginUrl,
}: {
  type: NotificationType;
  fullName: string;
  tenantName: string;
  trainingTitle: string;
  dueDate?: string | null;
  loginUrl: string;
}) {
  const safeName = escapeHtml(fullName || 'Hola');
  const safeTenant = escapeHtml(tenantName || 'Tu empresa');
  const safeTrainingTitle = escapeHtml(trainingTitle);
  const safeDueDate = escapeHtml(formatDate(dueDate));
  const safeLoginUrl = escapeHtml(loginUrl);
  const heading = escapeHtml(getHeading(type));
  const intro = getIntroText({ type, safeName, safeTenant });
  const cta = escapeHtml(getCtaText(type));
  const statusText = escapeHtml(getStatusText(type));

  const followUpText =
    type === 'unassignment'
      ? 'Si tenés dudas sobre esta desasignación, consultá con el administrador de tu empresa.'
      : 'Ingresá a la plataforma para revisar el curso. Una vez aprobado el examen, vas a poder acceder a tu certificado.';

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
            ${heading}
          </h1>

          <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 18px;">
            ${intro}
          </p>

          <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px;margin:20px 0;">
            <p style="font-size:14px;line-height:1.6;color:#cbd5e1;margin:0;">
              <strong style="color:#f8fafc;">Curso:</strong> ${safeTrainingTitle}<br/>
              <strong style="color:#f8fafc;">Estado:</strong> ${statusText}<br/>
              <strong style="color:#f8fafc;">Fecha límite:</strong> ${safeDueDate}
            </p>
          </div>

          <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 20px;">
            ${escapeHtml(followUpText)}
          </p>

          <p style="margin:24px 0;">
            <a href="${safeLoginUrl}"
              style="display:inline-block;background:#f59e0b;color:#111827;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">
              ${cta}
            </a>
          </p>

          <p style="font-size:14px;line-height:1.6;color:#94a3b8;margin:0;">
            Si este mensaje no corresponde, consultá con el administrador de tu empresa.
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
      error: 'Faltan variables de entorno de Supabase.',
    });
  }

  let payload: any;

  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Solicitud inválida.' });
  }

  const assignmentId = clean(payload.assignmentId);
  const type = normalizeType(payload.type);
  const createdBy = clean(payload.createdBy) || null;

  if (!assignmentId) {
    return json(400, { error: 'Falta assignmentId.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: assignment, error: assignmentError } = await supabaseAdmin
    .from('training_assignments')
    .select('id, user_id, training_id, tenant_id, due_date, status')
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

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, status')
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
  const loginUrl = appUrl.replace(/\/$/, '') + '/';
  const subject = getSubject(type, trainingTitle);
  const notificationType = getNotificationTypeForDb(type);

  const notificationBase = {
    tenant_id: assignment.tenant_id,
    profile_id: profile.id,
    assignment_id: assignment.id,
    training_id: trainingId,
    type: notificationType,
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
    subject,
    html: buildNotificationEmailHtml({
      type,
      fullName: profile.full_name || '',
      tenantName,
      trainingTitle,
      dueDate: assignment.due_date,
      loginUrl,
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

  await supabaseAdmin.from('training_assignment_events').insert({
    tenant_id: assignment.tenant_id,
    assignment_id: assignment.id,
    user_id: assignment.user_id,
    training_id: trainingId,
    event_type: getEmailEventType(type, emailResult.ok),
    event_detail: emailResult.ok
      ? `Email ${notificationType} enviado a ${profile.email}`
      : `Falló email ${notificationType}: ${emailResult.error || 'Error desconocido'}`,
    created_by: createdBy,
  });

  if (!emailResult.ok) {
    return json(500, {
      ok: false,
      error: emailResult.error || 'No pudimos enviar el email.',
    });
  }

  return json(200, {
    ok: true,
    email_sent: true,
    type,
    assignment_id: assignment.id,
    recipient_email: profile.email,
    training_id: trainingId,
    training_title: trainingTitle,
  });
};
