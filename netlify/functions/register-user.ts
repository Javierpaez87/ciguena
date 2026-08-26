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
const notifyEmail = process.env.REGISTRATION_NOTIFY_EMAIL || 'javierpaez@bondiapps.com';

const platformUrl =
  process.env.CIGUENA_PLATFORM_URL ||
  process.env.APP_URL ||
  process.env.URL ||
  'https://ciguena-product.netlify.app';

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

function compactEmailList(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeEmail(value))
        .filter((value) => Boolean(value))
    )
  );
}

function splitFullName(fullName: string) {
  const parts = fullName.split(' ').map((part) => part.trim()).filter(Boolean);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ');

  return { firstName, lastName };
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

  return 'No pudimos crear la cuenta. Intentá nuevamente o contactá a la administración de la plataforma.';
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
  autoApproved,
  platformUrl,
  branding,
}: {
  fullName: string;
  requestedAdmin: boolean;
  tenantName: string;
  autoApproved: boolean;
  platformUrl: string;
  branding: TenantEmailBranding;
}) {
  const safeName = escapeHtml(fullName);
  const safeTenant = escapeHtml(tenantName);
  const safeBrand = escapeHtml(branding.brandName);
  const safePlatformUrl = escapeHtml(platformUrl.replace(/\/$/, ''));
  const ctaColor = branding.accentColor;
  const ctaTextColor = getCtaTextColor(ctaColor);

  const title = autoApproved
    ? 'Tu cuenta ya está habilitada'
    : 'Recibimos tu solicitud de acceso';

  const statusText = autoApproved ? 'habilitada' : 'pendiente de validación';

  const approvalText = autoApproved
    ? 'Tu email fue encontrado en la nómina precargada por tu empresa, por eso tu acceso quedó habilitado automáticamente.'
    : requestedAdmin
      ? 'Tu solicitud de acceso como administrador quedó pendiente de validación por parte de la administración de la plataforma.'
      : 'Tu cuenta quedó pendiente de validación por parte del administrador de tu empresa.';

  const nextStepText = autoApproved
    ? 'Ya podés ingresar con el email y la contraseña que cargaste. En tu primer ingreso vas a revisar tus datos laborales y completar los requisitos de onboarding de tu organización, incluida tu firma electrónica.'
    : 'Cuando tu acceso sea aprobado, vas a poder ingresar con el email y la contraseña que cargaste al registrarte.';

  return `
    <div style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
      <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
        <div style="background:#111827;border:1px solid #334155;border-radius:16px;padding:28px;">
          ${renderEmailBrandHeader(branding)}

          <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px;color:#f8fafc;">
            ${title}
          </h1>

          <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 18px;">
            Hola ${safeName}, gracias por registrarte en ${safeBrand}.
          </p>

          <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px;margin:20px 0;">
            <p style="font-size:14px;line-height:1.6;color:#cbd5e1;margin:0;">
              <strong style="color:#f8fafc;">Empresa:</strong> ${safeTenant}<br/>
              <strong style="color:#f8fafc;">Estado:</strong> ${statusText}
            </p>
          </div>

          <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 18px;">
            ${approvalText}
          </p>

          <p style="font-size:14px;line-height:1.6;color:#94a3b8;margin:0;">
            ${nextStepText}
          </p>

          <div style="text-align:center;margin:26px 0 20px;">
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

          ${renderEmailFooter(branding)}
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
  autoApproved,
  brandName,
}: {
  fullName: string;
  email: string;
  phone: string;
  requestedAdmin: boolean;
  tenantName: string;
  autoApproved: boolean;
  brandName: string;
}) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <h2>Nuevo registro en ${escapeHtml(brandName)}</h2>

      <p>Se registró una nueva persona en la plataforma.</p>

      <ul>
        <li><strong>Nombre:</strong> ${escapeHtml(fullName)}</li>
        <li><strong>Email:</strong> ${escapeHtml(email)}</li>
        <li><strong>Teléfono:</strong> ${escapeHtml(phone)}</li>
        <li><strong>Empresa:</strong> ${escapeHtml(tenantName)}</li>
        <li><strong>Solicitó admin:</strong> ${requestedAdmin ? 'Sí' : 'No'}</li>
        <li><strong>Encontrado en nómina:</strong> ${autoApproved ? 'Sí' : 'No'}</li>
        <li><strong>Estado inicial:</strong> ${autoApproved ? 'active' : 'pending'}</li>
      </ul>

      <p>${autoApproved ? 'El usuario fue activado automáticamente porque estaba en employee_directory.' : 'Revisar en el panel admin para aprobar o gestionar el acceso.'}</p>
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

  if (clean(tenantData.status).toLowerCase() !== 'active') {
    return json(403, {
      error: 'La empresa seleccionada no está habilitada para registrar usuarios.',
    });
  }

  const tenantName = tenantData.name || 'Empresa seleccionada';

  const branding = await resolveTenantEmailBranding(
    supabaseAdmin,
    companyId,
    tenantName
  );
  const emailFrom = getEmailSender(branding);

  // Un trabajador precargado puede tener un profile sin auth_user_id para permitir
  // asignaciones antes de su primer login. Ese profile se reutiliza al registrarse.
  const { data: existingProfiles, error: existingProfileError } = await supabaseAdmin
    .from('profiles')
    .select('id, tenant_id, auth_user_id, role, status')
    .eq('email', email);

  if (existingProfileError) {
    return json(500, {
      error: 'No pudimos verificar si el usuario ya existía. Intentá nuevamente.',
    });
  }

  const matchingProfiles = existingProfiles ?? [];
  const registeredProfile = matchingProfiles.find((profile: any) => Boolean(profile.auth_user_id));

  if (registeredProfile) {
    return json(409, { error: 'Ya existe una cuenta registrada con ese email.' });
  }

  const placeholderProfile = matchingProfiles.find(
    (profile: any) => profile.tenant_id === companyId && !profile.auth_user_id
  );

  if (matchingProfiles.length > 0 && !placeholderProfile) {
    return json(409, {
      error: 'Ese email ya está asociado a otra empresa. Contactá a la administración de la plataforma para revisar el acceso.',
    });
  }

  // Busca si el usuario estaba precargado por nómina/CSV/API.
  // Si existe para este tenant, queda validado automáticamente como worker.
  const { data: employeeDirectoryEntry, error: employeeDirectoryError } = await supabaseAdmin
    .from('employee_directory')
    .select(
      'id, tenant_id, email, first_name, last_name, dni, phone, employee_code, work_role, area, position, status, profile_id'
    )
    .eq('tenant_id', companyId)
    .eq('email', email)
    .maybeSingle();

  if (employeeDirectoryError) {
    return json(500, {
      error: 'No pudimos verificar la nómina de la empresa. Intentá nuevamente.',
    });
  }

  if (employeeDirectoryEntry?.profile_id) {
    return json(409, { error: 'Ya existe una cuenta registrada con ese email.' });
  }

  const directoryStatus = clean(employeeDirectoryEntry?.status).toLowerCase();
  const isDirectoryEntryEligible =
    Boolean(employeeDirectoryEntry) &&
    !['inactive', 'inactivo', 'disabled', 'deshabilitado'].includes(directoryStatus);
  const isPreapprovedWorker = isDirectoryEntryEligible && !requestedAdmin;
  const initialStatus = isPreapprovedWorker ? 'active' : 'pending';

  const rosterFullName = [employeeDirectoryEntry?.first_name, employeeDirectoryEntry?.last_name]
    .map((value) => clean(value))
    .filter(Boolean)
    .join(' ');

  const finalFullName = rosterFullName || fullName;
  const { firstName, lastName } = splitFullName(finalFullName);
  const finalPhone = clean(employeeDirectoryEntry?.phone) || phone;

  // Crear usuario en Supabase Auth, ya confirmado.
  // La validación real de acceso queda en profiles.status.
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: finalFullName,
      phone: finalPhone,
      requested_admin: requestedAdmin,
      tenant_id: companyId,
      preapproved: isPreapprovedWorker,
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
      full_name: finalFullName,
      phone: finalPhone,
      requested_admin: requestedAdmin,
      tenant_id: companyId,
      preapproved: isPreapprovedWorker,
    },
  });

  const profilePayload = {
    auth_user_id: authData.user.id,
    tenant_id: companyId,
    full_name: finalFullName,
    first_name: firstName || null,
    last_name: lastName || null,
    email,
    phone: finalPhone,
    dni: clean(employeeDirectoryEntry?.dni) || null,
    employee_code: clean(employeeDirectoryEntry?.employee_code) || null,
    work_role: clean(employeeDirectoryEntry?.work_role) || null,
    area: clean(employeeDirectoryEntry?.area) || null,
    position: clean(employeeDirectoryEntry?.position) || null,
    role: 'worker',
    status: initialStatus,
    preapproved: isPreapprovedWorker,
    requested_admin: requestedAdmin,
  };

  // Crear o vincular perfil en Cigüeña. Si la persona ya estaba precargada,
  // reutilizamos el profile sin auth_user_id para conservar asignaciones previas.
  const profileMutation = placeholderProfile?.id
    ? supabaseAdmin
        .from('profiles')
        .update(profilePayload)
        .eq('id', placeholderProfile.id)
        .select('id')
        .single()
    : supabaseAdmin
        .from('profiles')
        .insert(profilePayload)
        .select('id')
        .single();

  const { data: profileData, error: profileError } = await profileMutation;

  if (profileError || !profileData?.id) {
    // Si falla el profile, eliminamos el usuario Auth para no dejar cuentas huérfanas.
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

    return json(400, {
      error: 'No pudimos vincular el perfil de usuario. Intentá nuevamente.',
    });
  }

  if (employeeDirectoryEntry) {
    const { error: employeeDirectoryUpdateError } = await supabaseAdmin
      .from('employee_directory')
      .update({
        status: 'registered',
        registered_at: new Date().toISOString(),
        profile_id: profileData.id,
        phone: finalPhone,
      })
      .eq('id', employeeDirectoryEntry.id);

    if (employeeDirectoryUpdateError) {
      console.error('Error actualizando employee_directory:', employeeDirectoryUpdateError);
    }
  }

  const { data: tenantAdmins, error: tenantAdminsError } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('tenant_id', companyId)
    .eq('role', 'admin')
    .eq('status', 'active');

  if (tenantAdminsError) {
    console.warn('No pudimos obtener administradores del tenant:', tenantAdminsError);
  }

  const tenantAdminEmails = compactEmailList((tenantAdmins || []).map((admin: any) => admin.email));
  const internalRecipients = requestedAdmin
    ? [notifyEmail]
    : compactEmailList([...tenantAdminEmails, notifyEmail]);

  // Emails informativos vía Resend.
  // No bloqueamos la creación de cuenta si el email falla.
  const userEmailResult = await sendResendEmail({
    to: email,
    bcc: notifyEmail,
    from: emailFrom,
    subject: isPreapprovedWorker
      ? `Tu cuenta de ${branding.brandName} ya está habilitada`
      : `Recibimos tu solicitud de acceso a ${branding.brandName}`,
    html: buildUserEmailHtml({
      fullName: finalFullName,
      requestedAdmin,
      tenantName,
      autoApproved: isPreapprovedWorker,
      platformUrl: getTenantAppUrl(branding, platformUrl),
      branding,
    }),
  });

  const shouldNotifyAdmins = !isPreapprovedWorker || requestedAdmin;

  const internalEmailResult = shouldNotifyAdmins
    ? await sendResendEmail({
        to: internalRecipients.length ? internalRecipients : notifyEmail,
        from: emailFrom,
        subject: `Nuevo registro pendiente en ${branding.brandName}: ${finalFullName}`,
        html: buildInternalEmailHtml({
          fullName: finalFullName,
          email,
          phone: finalPhone,
          requestedAdmin,
          tenantName,
          autoApproved: isPreapprovedWorker,
          brandName: branding.brandName,
        }),
      })
    : { ok: true };

  const emailWarning =
    !userEmailResult.ok || !internalEmailResult.ok
      ? 'La cuenta fue creada, pero no pudimos enviar una o más notificaciones por email.'
      : null;

  return json(200, {
    ok: true,
    preapproved: isPreapprovedWorker,
    status: initialStatus,
    email_sent: userEmailResult.ok,
    internal_email_sent: internalEmailResult.ok,
    email_warning: emailWarning,
    message: requestedAdmin
      ? 'Tu cuenta fue creada correctamente. Tu solicitud de acceso como administrador quedó pendiente de validación por la administración de la plataforma.'
      : isPreapprovedWorker
        ? 'Tu cuenta fue creada correctamente y ya quedó habilitada porque tu email estaba en la nómina de tu empresa.'
        : 'Tu cuenta fue creada correctamente y quedó pendiente de validación por parte del administrador de tu empresa.',
  });
};
