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

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRefreshToken = process.env.GOOGLE_REFRESH_TOKEN;
const googleCalendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
const resendApiKey = process.env.RESEND_API_KEY;

const appUrl =
  process.env.CIGUENA_APP_URL ||
  process.env.URL ||
  process.env.DEPLOY_PRIME_URL ||
  'https://ciguena.netlify.app';


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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'Ocurrió un error inesperado.';
  }
}

function assertConfig() {
  const missing = [
    ['VITE_SUPABASE_URL', supabaseUrl],
    ['SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey],
    ['GOOGLE_CLIENT_ID', googleClientId],
    ['GOOGLE_CLIENT_SECRET', googleClientSecret],
    ['GOOGLE_REFRESH_TOKEN', googleRefreshToken],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
  }
}

function escapeGoogleCalendarId(calendarId: string) {
  return encodeURIComponent(calendarId);
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map(value => value?.trim()).filter(Boolean))) as string[];
}


function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getAppBaseUrl(baseUrl = appUrl) {
  return baseUrl.replace(/\/$/, '');
}

function getWorkerLiveRoomUrl(liveTrainingId: string, baseUrl = appUrl) {
  const params = new URLSearchParams({
    view: 'worker-live-room',
    liveTrainingId,
  });

  return `${getAppBaseUrl(baseUrl)}/?${params.toString()}`;
}

function formatDateTime(value?: string | null, timezone = 'America/Argentina/Buenos_Aires') {
  if (!value) return 'Fecha no definida';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Fecha no definida';

  return parsed.toLocaleString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  });
}

function formatTime(value?: string | null, timezone = 'America/Argentina/Buenos_Aires') {
  if (!value) return '—';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  });
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
    return {
      ok: false,
      error: responseBody?.message || responseBody?.error || 'No pudimos enviar el email.',
    };
  }

  return { ok: true, data: responseBody };
}

export function buildLiveTrainingEmailHtml({
  fullName,
  training,
  workerRoomUrl,
  branding,
}: {
  fullName?: string | null;
  training: {
    title: string;
    description?: string | null;
    starts_at: string;
    ends_at: string;
    timezone?: string | null;
    tenant_name?: string | null;
    creator_name?: string | null;
    creator_email?: string | null;
  };
  workerRoomUrl: string;
  branding: TenantEmailBranding;
}) {
  const safeName = escapeHtml(fullName || 'Hola');
  const safeTitle = escapeHtml(training.title || 'Capacitación en vivo');
  const safeDescription = escapeHtml(training.description || '');
  const safeTenantName = escapeHtml(training.tenant_name || 'Organización no informada');
  const safeBrand = escapeHtml(branding.brandName);
  const safeCreatorName = escapeHtml(training.creator_name || `Administrador ${branding.brandName}`);
  const safeCreatorEmail = escapeHtml(training.creator_email || '');
  const timezone = training.timezone || 'America/Argentina/Buenos_Aires';
  const safeStart = escapeHtml(formatDateTime(training.starts_at, timezone));
  const safeEnd = escapeHtml(formatTime(training.ends_at, timezone));
  const safeWorkerRoomUrl = escapeHtml(workerRoomUrl);
  const ctaColor = branding.accentColor;
  const ctaTextColor = getCtaTextColor(ctaColor);

  return `
    <div style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
      <div style="max-width:620px;margin:0 auto;padding:32px 20px;">
        <div style="background:#111827;border:1px solid #334155;border-radius:16px;padding:28px;">
          ${renderEmailBrandHeader(branding)}

          <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px;color:#f8fafc;">
            Tenés una capacitación en vivo asignada
          </h1>

          <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 18px;">
            Hola ${safeName}, te asignaron una capacitación en vivo en ${safeBrand}.
          </p>

          <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px;margin:20px 0;">
            <p style="font-size:14px;line-height:1.7;color:#cbd5e1;margin:0;">
              <strong style="color:#f8fafc;">Organización:</strong> ${safeTenantName}<br/>
              <strong style="color:#f8fafc;">Capacitación:</strong> ${safeTitle}<br/>
              <strong style="color:#f8fafc;">Creada por:</strong> ${safeCreatorName}${safeCreatorEmail ? ` · ${safeCreatorEmail}` : ''}<br/>
              <strong style="color:#f8fafc;">Fecha y hora:</strong> ${safeStart}<br/>
              <strong style="color:#f8fafc;">Finaliza:</strong> ${safeEnd}
            </p>
            ${safeDescription ? `<p style="font-size:14px;line-height:1.6;color:#94a3b8;margin:12px 0 0;">${safeDescription}</p>` : ''}
          </div>

          <div style="background:#451a03;border:1px solid #f59e0b;border-radius:12px;padding:16px;margin:20px 0;">
            <p style="font-size:15px;line-height:1.6;color:#fde68a;margin:0;">
              <strong>IMPORTANTE:</strong><br/>
              Para que tu asistencia quede registrada, ingresá siempre desde ${safeBrand} antes de entrar a Google Meet.
              No ingreses directo desde el link de Meet o desde Google Calendar.
            </p>
          </div>

          <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 20px;">
            ${safeBrand} registrará tu ingreso a la sala interna y luego podrás acceder a Google Meet.
          </p>

          <p style="margin:24px 0;">
            <a href="${safeWorkerRoomUrl}"
              style="display:inline-block;background:${ctaColor};color:${ctaTextColor};text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">
              Ingresar desde ${safeBrand}
            </a>
          </p>

          <p style="font-size:13px;line-height:1.6;color:#94a3b8;margin:0;">
            También vas a recibir una invitación de Google Calendar. Usala para tener el evento en tu calendario, pero entrá desde ${safeBrand} para que podamos registrar tu asistencia.
          </p>

          ${renderEmailFooter(branding)}
        </div>
      </div>
    </div>
  `;
}

async function sendCiguenaLiveTrainingInvites({
  recipients,
  training,
  branding,
}: {
  recipients: Array<{ email: string; displayName?: string }>;
  training: {
    id: string;
    title: string;
    description?: string | null;
    starts_at: string;
    ends_at: string;
    timezone?: string | null;
    tenant_name?: string | null;
    creator_name?: string | null;
    creator_email?: string | null;
  };
  branding: TenantEmailBranding;
}) {
  const workerRoomUrl = getWorkerLiveRoomUrl(
    training.id,
    getTenantAppUrl(branding, appUrl)
  );
  const emailFrom = getEmailSender(branding);
  const uniqueRecipients = uniqueValues(recipients.map(recipient => recipient.email)).map(email => {
    const recipient = recipients.find(item => item.email === email);
    return {
      email,
      displayName: recipient?.displayName,
    };
  });

  const results = await Promise.all(
    uniqueRecipients.map(async recipient => {
      const result = await sendResendEmail({
        to: recipient.email,
        from: emailFrom,
        subject: `Capacitación en vivo asignada: ${training.title}`,
        html: buildLiveTrainingEmailHtml({
          fullName: recipient.displayName,
          training,
          workerRoomUrl,
          branding,
        }),
      });

      return {
        email: recipient.email,
        ok: result.ok,
        error: result.ok ? null : result.error,
      };
    })
  );

  return {
    sent: results.filter(result => result.ok).length,
    failed: results.filter(result => !result.ok).length,
    errors: results.filter(result => !result.ok),
  };
}

async function getGoogleAccessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: googleClientId as string,
      client_secret: googleClientSecret as string,
      refresh_token: googleRefreshToken as string,
      grant_type: 'refresh_token',
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || 'No pudimos obtener access_token de Google.');
  }

  if (!payload?.access_token) {
    throw new Error('Google no devolvió access_token.');
  }

  return payload.access_token as string;
}

async function createGoogleCalendarEvent({
  accessToken,
  training,
  attendees,
  branding,
}: {
  accessToken: string;
  training: {
    id: string;
    title: string;
    description?: string | null;
    starts_at: string;
    ends_at: string;
    timezone?: string | null;
    tenant_name?: string | null;
    creator_name?: string | null;
    creator_email?: string | null;
  };
  attendees: Array<{ email: string; displayName?: string }>;
  branding: TenantEmailBranding;
}) {
  const timezone = training.timezone || 'America/Argentina/Buenos_Aires';
  const tenantName = training.tenant_name || 'Organización no informada';
  const brandName = branding.brandName;
  const creatorLabel = [training.creator_name, training.creator_email].filter(Boolean).join(' · ') || `Administrador ${brandName}`;

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${escapeGoogleCalendarId(
      googleCalendarId
    )}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: `${training.title} · ${brandName}`,
        description: [
          `<strong>Organización:</strong> ${escapeHtml(tenantName)}`,
          `<strong>Capacitador / creador en ${escapeHtml(brandName)}:</strong> ${escapeHtml(creatorLabel)}`,
          '',
          training.description ? escapeHtml(training.description) : '',
          '',
          '<strong>IMPORTANTE:</strong>',
          `<strong>Ingresá siempre desde ${escapeHtml(brandName)} para registrar tu asistencia antes de entrar a Google Meet.</strong>`,
          `Si ingresás directo desde el link de Google Meet o desde Google Calendar, ${escapeHtml(brandName)} podría no registrar correctamente tu asistencia.`,
          '',
          `<a href="${escapeHtml(getWorkerLiveRoomUrl(training.id, getTenantAppUrl(branding, appUrl)))}">Ingresar desde ${escapeHtml(brandName)}</a>`,
          '',
          `Evento generado automáticamente por ${escapeHtml(brandName)}${branding.showPoweredByBondiApps ? ' | Platform by BondiApps' : ''}.`,
        ]
          .filter(Boolean)
          .join('<br>'),
        start: {
          dateTime: training.starts_at,
          timeZone: timezone,
        },
        end: {
          dateTime: training.ends_at,
          timeZone: timezone,
        },
        attendees,
        conferenceData: {
          createRequest: {
            requestId: `ciguena-${training.id}-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
        reminders: {
          useDefault: true,
        },
      }),
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Google Calendar no pudo crear el evento.');
  }

  const meetingUrl =
    payload?.hangoutLink ||
    payload?.conferenceData?.entryPoints?.find((entryPoint: { entryPointType?: string; uri?: string }) =>
      entryPoint.entryPointType === 'video'
    )?.uri ||
    null;

  if (!meetingUrl) {
    throw new Error('Google creó el evento, pero no devolvió link de Google Meet.');
  }

  return {
    eventId: payload.id as string,
    meetingUrl: meetingUrl as string,
    htmlLink: payload.htmlLink as string | undefined,
  };
}

export async function handler(event: { httpMethod: string; body?: string | null }) {
  if (event.httpMethod === 'OPTIONS') {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Método no permitido.' });
  }

  try {
    assertConfig();

    const body = event.body ? JSON.parse(event.body) : {};
    const liveTrainingId = typeof body.live_training_id === 'string' ? body.live_training_id.trim() : '';

    if (!liveTrainingId) {
      return json(400, { error: 'Falta live_training_id.' });
    }

    const client = createClient(supabaseUrl as string, serviceRoleKey as string);

    const { data: training, error: trainingError } = await client
      .from('live_trainings')
      .select('*')
      .eq('id', liveTrainingId)
      .maybeSingle();

    if (trainingError) throw trainingError;

    if (!training) {
      return json(404, { error: 'Capacitación en vivo no encontrada.' });
    }

    if (training.deleted_at) {
      return json(400, { error: 'No se puede crear Calendar/Meet para una capacitación eliminada.' });
    }

    if (training.meeting_url && training.calendar_event_id && training.calendar_status === 'created') {
      return json(200, {
        ok: true,
        already_created: true,
        training,
        meeting_url: training.meeting_url,
        calendar_event_id: training.calendar_event_id,
      });
    }

    const { data: tenant, error: tenantError } = await client
      .from('tenants')
      .select('id,name')
      .eq('id', training.tenant_id)
      .maybeSingle();

    if (tenantError) throw tenantError;

    const branding = await resolveTenantEmailBranding(
      client,
      training.tenant_id,
      tenant?.name ?? null
    );

    const { data: participants, error: participantsError } = await client
      .from('live_training_participants')
      .select('*')
      .eq('live_training_id', liveTrainingId);

    if (participantsError) throw participantsError;

    const participantUserIds = uniqueValues((participants ?? []).map(participant => participant.user_id));
    const profileIdsToInvite = uniqueValues([
      training.created_by,
      ...participantUserIds,
    ]);

    let attendees: Array<{ email: string; displayName?: string }> = [];

    if (profileIdsToInvite.length > 0) {
      const { data: profiles, error: profilesError } = await client
        .from('profiles')
        .select('*')
        .or(`id.in.(${profileIdsToInvite.join(',')}),auth_user_id.in.(${profileIdsToInvite.join(',')})`);

      if (profilesError) throw profilesError;

      attendees = uniqueValues((profiles ?? []).map(profile => profile.email)).map(email => {
        const profile = (profiles ?? []).find(item => item.email === email);
        const displayName =
          profile?.full_name ||
          [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
          undefined;

        return {
          email,
          ...(displayName ? { displayName } : {}),
        };
      });
    }

    const { data: creatorProfileData, error: creatorProfileError } = await client
      .from('profiles')
      .select('*')
      .or(`id.eq.${training.created_by},auth_user_id.eq.${training.created_by}`)
      .maybeSingle();

    if (creatorProfileError) throw creatorProfileError;

    const creatorName =
      creatorProfileData?.full_name ||
      [creatorProfileData?.first_name, creatorProfileData?.last_name].filter(Boolean).join(' ') ||
      creatorProfileData?.email ||
      null;

    const enrichedTraining = {
      ...training,
      tenant_name: tenant?.name ?? null,
      creator_name: creatorName,
      creator_email: creatorProfileData?.email ?? null,
    };

    const accessToken = await getGoogleAccessToken();
    const googleEvent = await createGoogleCalendarEvent({
      accessToken,
      training: enrichedTraining,
      attendees,
      branding,
    });

    const now = new Date().toISOString();

    const { data: updatedTraining, error: updateError } = await client
      .from('live_trainings')
      .update({
        meeting_url: googleEvent.meetingUrl,
        meeting_external_id: googleEvent.eventId,
        calendar_event_id: googleEvent.eventId,
        calendar_status: 'created',
        calendar_error: null,
        status: training.status === 'draft' ? 'scheduled' : training.status,
        updated_at: now,
      })
      .eq('id', liveTrainingId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    const emailInviteResult = await sendCiguenaLiveTrainingInvites({
      recipients: attendees,
      training: enrichedTraining,
      branding,
    });

    await client.from('live_training_logs').insert({
      tenant_id: training.tenant_id,
      live_training_id: liveTrainingId,
      user_id: null,
      event_type: 'google_calendar_created',
      metadata: {
        calendar_event_id: googleEvent.eventId,
        meeting_url: googleEvent.meetingUrl,
        google_event_url: googleEvent.htmlLink ?? null,
        attendee_count: attendees.length,
        creator_profile_id: training.created_by ?? null,
        creator_name: creatorName,
        creator_email: creatorProfileData?.email ?? null,
        tenant_name: tenant?.name ?? null,
        participant_user_count: participantUserIds.length,
        email_invite_count: emailInviteResult.sent,
        email_invite_failed_count: emailInviteResult.failed,
        email_invite_errors: emailInviteResult.errors,
        worker_room_url: getWorkerLiveRoomUrl(
          training.id,
          getTenantAppUrl(branding, appUrl)
        ),
        created_at: now,
      },
      created_by: training.created_by,
    });

    return json(200, {
      ok: true,
      training: updatedTraining,
      meeting_url: googleEvent.meetingUrl,
      calendar_event_id: googleEvent.eventId,
      attendee_count: attendees.length,
      email_invite_count: emailInviteResult.sent,
      email_invite_failed_count: emailInviteResult.failed,
      email_invite_errors: emailInviteResult.errors,
    });
  } catch (error) {
    const message = getErrorMessage(error);

    try {
      const body = event.body ? JSON.parse(event.body) : {};
      const liveTrainingId = typeof body.live_training_id === 'string' ? body.live_training_id.trim() : '';

      if (supabaseUrl && serviceRoleKey && liveTrainingId) {
        const client = createClient(supabaseUrl, serviceRoleKey);
        await client
          .from('live_trainings')
          .update({
            calendar_status: 'failed',
            calendar_error: message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', liveTrainingId);
      }
    } catch (updateError) {
      console.error('No pudimos guardar calendar_status=failed:', updateError);
    }

    console.error('create-google-meet-event error:', error);

    return json(500, { error: message });
  }
}
