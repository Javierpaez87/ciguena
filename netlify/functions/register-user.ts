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

function getFriendlyAuthError(message = '') {
  const lower = message.toLowerCase();

  if (
    lower.includes('already') ||
    lower.includes('registered') ||
    lower.includes('already been registered') ||
    lower.includes('user already registered')
  ) {
    return 'Ya existe una cuenta registrada con ese email.';
  }

  if (lower.includes('password')) {
    return 'La contraseña no cumple con los requisitos mínimos.';
  }

  return 'No pudimos crear la cuenta. Intentá nuevamente o contactá a BondiApps.';
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

function buildUserEmailHtml({
  fullName,
  requestedAdmin,
  tenantName,
}: {
  fullName: string;
  requestedAdmin: boolean;
  tenantName: string;
}) {
  const safeName = escapeHtml(fullName);
  const safeTenant = escapeHtml(tenantName);

  const approvalText = requestedAdmin
    ? 'Tu solicitud de acceso como administrador quedó pendiente de validación por parte de BondiApps.'
    : 'Tu cuenta quedó pendiente de validación por parte del administrador de tu empresa.';

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
            Recibimos tu solicitud de acceso
          </h1>

          <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 18px;">
            Hola ${safeName}, gracias por registrarte en Cigüeña.
          </p>

          <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px;margin:20px 0;">
            <p style="font-size:14px;line-height:1.6;color:#cbd5e1;margin:0;">
              <strong style="color:#f8fafc;">Empresa:</strong> ${safeTenant}<br/>
              <strong style="color:#f8fafc;">Estado:</strong> pendiente de validación
            </p>
          </div>

          <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 18px;">
            ${approvalText}
          </p>

          <p style="font-size:14px;line-height:1.6;color:#94a3b8;margin:0;">
            Cuando tu acceso sea aprobado, vas a poder ingresar a la plataforma con el email y la contraseña que cargaste al registrarte.
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

function buildInternalEmailHtml({
  fullName,
  email,
  phone,
  requestedAdmin,
  tenantName,
}: {
  fullName: string;
  email: string;
  phone: string;
  requestedAdmin: boolean;
  tenantName: string;
}) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <h2>Nuevo registro en Cigüeña</h2>

      <p>Se registró una nueva persona en la plataforma.</p>

      <ul>
        <li><strong>Nombre:</strong> ${escapeHtml(fullName)}</li>
        <li><strong>Email:</strong> ${escapeHtml(email)}</li>
        <li><strong>Teléfono:</strong> ${escapeHtml(phone)}</li>
        <li><strong>Empresa:</strong> ${escapeHtml(tenantName)}</li>
        <li><strong>Solicitó admin:</strong> ${requestedAdmin ? 'Sí' : 'No'}</li>
        <li><strong>Estado inicial:</strong> pending</li>
      </ul>

      <p>Revisar en Supabase / panel admin para aprobar o gestionar el acceso.</p>
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
      error: 'Faltan variables de entorno del servidor para crear usuarios.',
    });
  }

  let payload: any;

  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Solicitud inválida.' });
  }

  const fullName = clean(payload.fullName);
  const email = normalizeEmail(payload.email);
  const phone = clean(payload.phone);
  const companyId = clean(payload.companyId);
  const password = typeof payload.password === 'string' ? payload.password : '';
  const requestedAdmin = Boolean(payload.requestedAdmin);

  if (!fullName || !email || !phone || !companyId || !password) {
    return json(400, { error: 'Completá todos los campos obligatorios.' });
  }

  if (password.length < 8) {
    return json(400, { error: 'La contraseña debe tener al menos 8 caracteres.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: tenantData, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('id, name, status')
    .eq('id', companyId)
    .maybeSingle();

  if (tenantError) {
    return json(500, {
      error: 'No pudimos verificar la empresa seleccionada. Intentá nuevamente.',
    });
  }

  if (!tenantData) {
    return json(400, {
      error: 'La empresa seleccionada no existe o ya no está disponible.',
    });
  }

  const tenantName = tenantData.name || 'Empresa seleccionada';

  // Evita duplicados en profiles
  const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingProfileError) {
    return json(500, {
      error: 'No pudimos verificar si el usuario ya existía. Intentá nuevamente.',
    });
  }

  if (existingProfile) {
    return json(409, { error: 'Ya existe una cuenta registrada con ese email.' });
  }

  // Crear usuario en Supabase Auth, ya confirmado.
  // La validación real de acceso queda en profiles.status = pending.
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      phone,
      requested_admin: requestedAdmin,
    },
  });

  if (authError || !authData.user) {
    return json(400, {
      error: getFriendlyAuthError(authError?.message),
    });
  }

  await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      phone,
      requested_admin: requestedAdmin,
    },
  });

  // Crear perfil pendiente en Cigüeña
  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    auth_user_id: authData.user.id,
    tenant_id: companyId,
    full_name: fullName,
    email,
    phone,
    role: 'worker',
    status: 'pending',
    requested_admin: requestedAdmin,
  });

  if (profileError) {
    // Si falla el profile, eliminamos el usuario Auth para no dejar cuentas huérfanas.
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

    return json(400, {
      error: 'No pudimos crear el perfil de usuario. Intentá nuevamente.',
    });
  }

  // Emails informativos vía Resend.
  // No bloqueamos la creación de cuenta si el email falla.
  const userEmailResult = await sendResendEmail({
    to: email,
    bcc: notifyEmail,
    subject: 'Recibimos tu solicitud de acceso a Cigüeña',
    html: buildUserEmailHtml({
      fullName,
      requestedAdmin,
      tenantName,
    }),
  });

  const internalEmailResult = await sendResendEmail({
    to: notifyEmail,
    subject: `Nuevo registro pendiente en Cigüeña: ${fullName}`,
    html: buildInternalEmailHtml({
      fullName,
      email,
      phone,
      requestedAdmin,
      tenantName,
    }),
  });

  const emailWarning =
    !userEmailResult.ok || !internalEmailResult.ok
      ? 'La cuenta fue creada, pero no pudimos enviar una o más notificaciones por email.'
      : null;

  return json(200, {
    ok: true,
    email_sent: userEmailResult.ok,
    internal_email_sent: internalEmailResult.ok,
    email_warning: emailWarning,
    message: requestedAdmin
      ? 'Tu cuenta fue creada correctamente. Tu solicitud de acceso como administrador quedó pendiente de validación por BondiApps.'
      : 'Tu cuenta fue creada correctamente y quedó pendiente de validación por parte del administrador de tu empresa.',
  });
};
