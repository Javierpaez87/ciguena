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
const fallbackAppUrl =
  process.env.CIGUENA_APP_URL ||
  process.env.URL ||
  process.env.DEPLOY_PRIME_URL ||
  'https://ciguena.bondiapps.com';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const MAX_RECIPIENTS = 500;
const BATCH_SIZE = 100;
const MAX_SUBJECT_LENGTH = 180;
const MAX_BODY_LENGTH = 20000;

type Recipient = {
  email: string;
  profileId: string | null;
  directoryId: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
};

type SendResult = {
  email: string;
  status: 'sent' | 'failed';
  providerId?: string | null;
  error?: string | null;
};

function json(statusCode: number, body: unknown) {
  return { statusCode, headers, body: JSON.stringify(body) };
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

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function firstNameFrom(fullName: string) {
  return clean(fullName).split(/\s+/)[0] || 'Hola';
}

function lastNameFrom(fullName: string) {
  const parts = clean(fullName).split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function recipientFromProfile(row: any): Recipient | null {
  const email = normalizeEmail(row?.email);
  if (!email || !isEmail(email)) return null;

  const fullName =
    clean(row?.full_name) ||
    [clean(row?.first_name), clean(row?.last_name)].filter(Boolean).join(' ') ||
    email;

  return {
    email,
    profileId: clean(row?.id) || null,
    directoryId: null,
    firstName: clean(row?.first_name) || firstNameFrom(fullName),
    lastName: clean(row?.last_name) || lastNameFrom(fullName),
    fullName,
  };
}

function recipientFromDirectory(row: any): Recipient | null {
  const email = normalizeEmail(row?.email);
  if (!email || !isEmail(email)) return null;

  const fullName =
    clean(row?.full_name) ||
    [clean(row?.first_name), clean(row?.last_name)].filter(Boolean).join(' ') ||
    email;

  return {
    email,
    profileId: clean(row?.profile_id) || null,
    directoryId: clean(row?.id) || null,
    firstName: clean(row?.first_name) || firstNameFrom(fullName),
    lastName: clean(row?.last_name) || lastNameFrom(fullName),
    fullName,
  };
}

function renderVariables(
  template: string,
  recipient: Recipient,
  tenantName: string,
  trainingTitle: string
) {
  return template
    .replaceAll('{{nombre}}', recipient.firstName || recipient.fullName || '')
    .replaceAll('{{apellido}}', recipient.lastName || '')
    .replaceAll('{{empresa}}', tenantName)
    .replaceAll('{{training}}', trainingTitle || '');
}

function renderBodyText(text: string) {
  const escaped = escapeHtml(text);
  return escaped
    .split(/\n{2,}/)
    .map((paragraph) =>
      `<p style="font-size:15px;line-height:1.65;color:#cbd5e1;margin:0 0 16px;">${paragraph.replaceAll('\n', '<br/>')}</p>`
    )
    .join('');
}

function buildCommunicationHtml({
  subject,
  body,
  branding,
  appUrl,
  includePlatformButton,
}: {
  subject: string;
  body: string;
  branding: TenantEmailBranding;
  appUrl: string;
  includePlatformButton: boolean;
}) {
  const safeSubject = escapeHtml(subject);
  const safeUrl = escapeHtml(appUrl);
  const ctaColor = branding.accentColor;
  const ctaTextColor = getCtaTextColor(ctaColor);

  return `
    <div style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
      <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
        <div style="background:#111827;border:1px solid #334155;border-radius:16px;padding:28px;">
          ${renderEmailBrandHeader(branding)}

          <h1 style="font-size:22px;line-height:1.35;margin:0 0 18px;color:#f8fafc;">
            ${safeSubject}
          </h1>

          ${renderBodyText(body)}

          ${includePlatformButton ? `
            <a href="${safeUrl}" style="display:inline-block;background:${ctaColor};color:${ctaTextColor};text-decoration:none;font-weight:700;border-radius:10px;padding:12px 18px;margin:4px 0 4px;">
              Ingresar a ${escapeHtml(branding.brandName)}
            </a>
          ` : ''}

          ${renderEmailFooter(branding)}
        </div>
      </div>
    </div>
  `;
}

function extractErrorIndex(error: any) {
  const values = [error?.index, error?.item_index, error?.itemIndex, error?.position];
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

function extractErrorMessage(error: any) {
  return clean(error?.message || error?.error?.message || error?.name) || 'El proveedor rechazó el email.';
}

async function sendResendBatch({
  from,
  items,
  idempotencyKey,
}: {
  from: string;
  items: Array<{ email: string; subject: string; html: string }>;
  idempotencyKey: string;
}): Promise<SendResult[]> {
  if (!resendApiKey) {
    return items.map((item) => ({
      email: item.email,
      status: 'failed',
      error: 'RESEND_API_KEY no configurada.',
    }));
  }

  const response = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey.slice(0, 256),
      'x-batch-validation': 'permissive',
    },
    body: JSON.stringify(
      items.map((item) => ({
        from,
        to: [item.email],
        subject: item.subject,
        html: item.html,
      }))
    ),
  });

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      clean(responseBody?.message || responseBody?.error?.message) ||
      'No pudimos enviar el lote de emails.';
    return items.map((item) => ({ email: item.email, status: 'failed', error: message }));
  }

  const errors = Array.isArray(responseBody?.errors) ? responseBody.errors : [];
  const data = Array.isArray(responseBody?.data) ? responseBody.data : [];
  const errorsByIndex = new Map<number, string>();

  errors.forEach((error: any) => {
    const index = extractErrorIndex(error);
    if (index !== null && index < items.length) {
      errorsByIndex.set(index, extractErrorMessage(error));
    }
  });

  return items.map((item, index) => {
    const indexedError = errorsByIndex.get(index);
    if (indexedError) {
      return { email: item.email, status: 'failed' as const, error: indexedError };
    }

    return {
      email: item.email,
      status: 'sent' as const,
      providerId: clean(data[index]?.id) || null,
    };
  });
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido.' });

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
  const mode = clean(payload.mode).toLowerCase() === 'test' ? 'test' : 'send';
  const subjectTemplate = clean(payload.subject).slice(0, MAX_SUBJECT_LENGTH);
  const bodyTemplate = clean(payload.body).slice(0, MAX_BODY_LENGTH);
  const trainingTitle = clean(payload.trainingTitle);
  const includePlatformButton = payload.includePlatformButton !== false;
  const recipientEmails = Array.from(
    new Set(
      (Array.isArray(payload.recipientEmails) ? payload.recipientEmails : [])
        .map(normalizeEmail)
        .filter((email: string) => email && isEmail(email))
    )
  ) as string[];
  const testRecipient = normalizeEmail(payload.testRecipient);
  const sampleRecipientEmail = normalizeEmail(payload.sampleRecipientEmail);
  const filters = payload.filters && typeof payload.filters === 'object' ? payload.filters : {};

  if (!tenantId) return json(400, { error: 'Falta tenantId.' });
  if (!subjectTemplate) return json(400, { error: 'Ingresá un asunto.' });
  if (!bodyTemplate) return json(400, { error: 'Ingresá el cuerpo del mensaje.' });

  if (mode === 'test') {
    if (!testRecipient || !isEmail(testRecipient)) {
      return json(400, { error: 'Ingresá un destinatario de prueba válido.' });
    }
  } else {
    if (recipientEmails.length === 0) {
      return json(400, { error: 'Seleccioná al menos un destinatario.' });
    }
    if (recipientEmails.length > MAX_RECIPIENTS) {
      return json(400, { error: `El envío admite hasta ${MAX_RECIPIENTS} destinatarios por campaña.` });
    }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const authorizationHeader = clean(event.headers?.authorization || event.headers?.Authorization);
  const accessToken = authorizationHeader.toLowerCase().startsWith('bearer ')
    ? authorizationHeader.slice(7).trim()
    : '';

  if (!accessToken) return json(401, { error: 'Sesión no autorizada.' });

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
  const authUser = authData?.user;
  if (authError || !authUser) return json(401, { error: 'La sesión no es válida o venció.' });

  const { data: requesterProfile, error: requesterError } = await supabaseAdmin
    .from('profiles')
    .select('id, tenant_id, role, status, email, full_name')
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
    return json(403, { error: 'No tenés permisos para enviar comunicaciones de esta empresa.' });
  }

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('id', tenantId)
    .maybeSingle();

  if (tenantError || !tenant) return json(400, { error: 'No pudimos verificar la empresa.' });

  const [profilesResult, directoryResult] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name, full_name, status, role')
      .eq('tenant_id', tenantId),
    supabaseAdmin
      .from('employee_directory')
      .select('id, profile_id, email, first_name, last_name, full_name, status')
      .eq('tenant_id', tenantId),
  ]);

  if (profilesResult.error || directoryResult.error) {
    return json(500, { error: 'No pudimos verificar los destinatarios de la empresa.' });
  }

  const allowedByEmail = new Map<string, Recipient>();

  (directoryResult.data ?? []).forEach((row: any) => {
    const recipient = recipientFromDirectory(row);
    if (recipient) allowedByEmail.set(recipient.email, recipient);
  });

  (profilesResult.data ?? []).forEach((row: any) => {
    const role = clean(row?.role).toLowerCase();
    if (role === 'super_admin' || role === 'superadmin') return;
    const recipient = recipientFromProfile(row);
    if (!recipient) return;
    const existing = allowedByEmail.get(recipient.email);
    allowedByEmail.set(recipient.email, {
      ...existing,
      ...recipient,
      directoryId: existing?.directoryId || null,
    });
  });

  const branding = await resolveTenantEmailBranding(supabaseAdmin, tenant.id, tenant.name);
  const from = getEmailSender(branding);
  const appUrl = getTenantAppUrl(branding, fallbackAppUrl);

  if (mode === 'test') {
    const sampleRecipient =
      allowedByEmail.get(sampleRecipientEmail) ||
      allowedByEmail.values().next().value || {
        email: testRecipient,
        profileId: null,
        directoryId: null,
        firstName: 'Usuario',
        lastName: 'QA',
        fullName: 'Usuario QA',
      };

    const subject = renderVariables(subjectTemplate, sampleRecipient, tenant.name, trainingTitle);
    const body = renderVariables(bodyTemplate, sampleRecipient, tenant.name, trainingTitle);
    const html = buildCommunicationHtml({
      subject,
      body,
      branding,
      appUrl,
      includePlatformButton,
    });

    const result = await sendResendBatch({
      from,
      items: [{ email: testRecipient, subject: `[PRUEBA] ${subject}`, html }],
      idempotencyKey: `bulk-email-test/${tenantId}/${randomUUID()}`,
    });

    const first = result[0];
    if (!first || first.status === 'failed') {
      return json(500, { error: first?.error || 'No pudimos enviar el email de prueba.' });
    }

    return json(200, {
      ok: true,
      mode: 'test',
      recipient: testRecipient,
      from,
      subject: `[PRUEBA] ${subject}`,
    });
  }

  const recipients: Recipient[] = [];
  const invalidOrExternal: string[] = [];

  recipientEmails.forEach((email) => {
    const recipient = allowedByEmail.get(email);
    if (recipient) recipients.push(recipient);
    else invalidOrExternal.push(email);
  });

  if (invalidOrExternal.length > 0) {
    return json(400, {
      error: 'Uno o más destinatarios ya no pertenecen a la empresa. Actualizá la selección antes de enviar.',
      invalidRecipients: invalidOrExternal,
    });
  }

  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from('bulk_email_campaigns')
    .insert({
      tenant_id: tenantId,
      created_by: requesterProfile.id,
      created_by_name: clean(requesterProfile.full_name) || clean(requesterProfile.email) || 'Administrador',
      created_by_email: clean(requesterProfile.email) || null,
      subject: subjectTemplate,
      body_text: bodyTemplate,
      filters,
      recipient_count: recipients.length,
      sent_count: 0,
      failed_count: 0,
      status: 'sending',
      include_platform_button: includePlatformButton,
    })
    .select('id')
    .single();

  if (campaignError || !campaign) {
    return json(500, {
      error: 'No pudimos crear el historial del envío. Verificá que la migración de Comunicaciones esté aplicada.',
    });
  }

  const campaignId = campaign.id as string;

  const recipientRows = recipients.map((recipient) => ({
    campaign_id: campaignId,
    tenant_id: tenantId,
    profile_id: recipient.profileId,
    directory_id: recipient.directoryId,
    email: recipient.email,
    full_name: recipient.fullName,
    status: 'pending',
  }));

  const { data: insertedRecipientRows, error: recipientInsertError } = await supabaseAdmin
    .from('bulk_email_recipients')
    .insert(recipientRows)
    .select('id, email');

  if (recipientInsertError) {
    await supabaseAdmin
      .from('bulk_email_campaigns')
      .update({ status: 'failed', failed_count: recipients.length, completed_at: new Date().toISOString() })
      .eq('id', campaignId);

    return json(500, { error: 'No pudimos preparar el detalle de destinatarios.' });
  }

  const recipientRowIdByEmail = new Map(
    ((insertedRecipientRows ?? []) as Array<{ id: string; email: string }>).map((row) => [
      normalizeEmail(row.email),
      row.id,
    ])
  );
  const recipientByEmail = new Map(recipients.map((recipient) => [recipient.email, recipient] as const));
  const allResults: SendResult[] = [];

  for (let offset = 0; offset < recipients.length; offset += BATCH_SIZE) {
    const batchRecipients = recipients.slice(offset, offset + BATCH_SIZE);
    const items = batchRecipients.map((recipient) => {
      const subject = renderVariables(subjectTemplate, recipient, tenant.name, trainingTitle);
      const body = renderVariables(bodyTemplate, recipient, tenant.name, trainingTitle);
      return {
        email: recipient.email,
        subject,
        html: buildCommunicationHtml({
          subject,
          body,
          branding,
          appUrl,
          includePlatformButton,
        }),
      };
    });

    const batchResults = await sendResendBatch({
      from,
      items,
      idempotencyKey: `bulk-email/${campaignId}/${offset / BATCH_SIZE}`,
    });
    allResults.push(...batchResults);
  }

  const sentCount = allResults.filter((result) => result.status === 'sent').length;
  const failedCount = allResults.length - sentCount;
  const completedAt = new Date().toISOString();
  const campaignStatus =
    sentCount === 0 ? 'failed' : failedCount > 0 ? 'partial' : 'sent';

  for (let offset = 0; offset < allResults.length; offset += 100) {
    const resultBatch = allResults.slice(offset, offset + 100);
    const updates = resultBatch
      .map((result) => {
        const recipient = recipientByEmail.get(result.email);
        const id = recipientRowIdByEmail.get(result.email);
        if (!recipient || !id) return null;

        return {
          id,
          campaign_id: campaignId,
          tenant_id: tenantId,
          profile_id: recipient.profileId,
          directory_id: recipient.directoryId,
          email: recipient.email,
          full_name: recipient.fullName,
          status: result.status,
          provider_id: result.providerId || null,
          error_message: result.error || null,
          sent_at: result.status === 'sent' ? completedAt : null,
        };
      })
      .filter(Boolean);

    if (updates.length > 0) {
      await supabaseAdmin
        .from('bulk_email_recipients')
        .upsert(updates, { onConflict: 'id' });
    }
  }

  await supabaseAdmin
    .from('bulk_email_campaigns')
    .update({
      sent_count: sentCount,
      failed_count: failedCount,
      status: campaignStatus,
      completed_at: completedAt,
    })
    .eq('id', campaignId);

  return json(200, {
    ok: sentCount > 0,
    campaignId,
    tenant: { id: tenant.id, name: tenant.name },
    from,
    requested: recipients.length,
    sent: sentCount,
    failed: failedCount,
    status: campaignStatus,
    failedRecipients: allResults
      .filter((result) => result.status === 'failed')
      .map((result) => ({ email: result.email, error: result.error || 'Error de envío' })),
  });
};
