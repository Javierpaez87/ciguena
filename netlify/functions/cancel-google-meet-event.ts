import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRefreshToken = process.env.GOOGLE_REFRESH_TOKEN;
const googleCalendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
const resendApiKey = process.env.RESEND_API_KEY;

const fromEmail =
  process.env.CIGUENA_FROM_EMAIL ||
  'Cigüeña | Platform by BondiApps <ciguena-no-reply@bondiapps.com>';

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

function assertBaseConfig() {
  const missing = [
    ['VITE_SUPABASE_URL', supabaseUrl],
    ['SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
  }
}

function assertGoogleConfig() {
  const missing = [
    ['GOOGLE_CLIENT_ID', googleClientId],
    ['GOOGLE_CLIENT_SECRET', googleClientSecret],
    ['GOOGLE_REFRESH_TOKEN', googleRefreshToken],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno Google: ${missing.join(', ')}`);
  }
}

function escapeGoogleId(value: string) {
  return encodeURIComponent(value);
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

async function getGoogleAccessToken() {
  assertGoogleConfig();

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

async function cancelGoogleCalendarEvent({
  accessToken,
  calendarEventId,
}: {
  accessToken: string;
  calendarEventId: string;
}) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${escapeGoogleId(
      googleCalendarId
    )}/events/${escapeGoogleId(calendarEventId)}?sendUpdates=all`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (response.status === 404 || response.status === 410) {
    return { ok: true, already_missing: true };
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || 'Google Calendar no pudo cancelar el evento.');
  }

  return { ok: true, already_missing: false };
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
      error: responseBody?.message || responseBody?.error || 'No pudimos enviar el email.',
    };
  }

  return { ok: true, data: responseBody };
}

function buildCancellationEmailHtml({
  fullName,
  training,
}: {
  fullName?: string | null;
  training: {
    title: string;
    description?: string | null;
    starts_at: string;
    ends_at: string;
    timezone?: string | null;
  };
}) {
  const safeName = escapeHtml(fullName || 'Hola');
  const safeTitle = escapeHtml(training.title || 'Capacitación en vivo');
  const timezone = training.timezone || 'America/Argentina/Buenos_Aires';
  const safeStart = escapeHtml(formatDateTime(training.starts_at, timezone));
  const safeEnd = escapeHtml(formatTime(training.ends_at, timezone));

  return `
    <div style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
      <div style="max-width:620px;margin:0 auto;padding:32px 20px;">
        <div style="background:#111827;border:1px solid #334155;border-radius:16px;padding:28px;">
          <div style="margin-bottom:24px;">
            <div style="font-size:22px;font-weight:700;color:#f59e0b;letter-spacing:0.5px;">CIGÜEÑA</div>
            <div style="font-size:13px;color:#94a3b8;">Platform by BondiApps</div>
          </div>

          <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px;color:#f8fafc;">
            Capacitación en vivo cancelada
          </h1>

          <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 18px;">
            Hola ${safeName}, el administrador canceló esta capacitación en vivo.
          </p>

          <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px;margin:20px 0;">
            <p style="font-size:14px;line-height:1.7;color:#cbd5e1;margin:0;">
              <strong style="color:#f8fafc;">Capacitación:</strong> ${safeTitle}<br/>
              <strong style="color:#f8fafc;">Fecha original:</strong> ${safeStart}<br/>
              <strong style="color:#f8fafc;">Finalizaba:</strong> ${safeEnd}
            </p>
          </div>

          <div style="background:#450a0a;border:1px solid #ef4444;border-radius:12px;padding:16px;margin:20px 0;">
            <p style="font-size:15px;line-height:1.6;color:#fecaca;margin:0;">
              <strong>IMPORTANTE:</strong><br/>
              No es necesario que ingreses a Cigüeña ni a Google Meet para esta capacitación. El evento fue cancelado y Google Calendar debería quitarlo o marcarlo como cancelado en tu calendario.
            </p>
          </div>

          <p style="font-size:13px;line-height:1.6;color:#94a3b8;margin:0;">
            Si tenés dudas, contactá al administrador de tu organización.
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

async function resolveRecipients({
  client,
  training,
}: {
  client: ReturnType<typeof createClient>;
  training: { id: string; created_by?: string | null };
}) {
  const { data: participants, error: participantsError } = await client
    .from('live_training_participants')
    .select('*')
    .eq('live_training_id', training.id);

  if (participantsError) throw participantsError;

  const participantUserIds = uniqueValues((participants ?? []).map(participant => participant.user_id));
  const profileIdsToInvite = uniqueValues([
    training.created_by,
    ...participantUserIds,
  ]);

  if (profileIdsToInvite.length === 0) {
    return {
      recipients: [] as Array<{ email: string; displayName?: string }>,
      participantUserCount: participantUserIds.length,
    };
  }

  const { data: profiles, error: profilesError } = await client
    .from('profiles')
    .select('*')
    .or(`id.in.(${profileIdsToInvite.join(',')}),auth_user_id.in.(${profileIdsToInvite.join(',')})`);

  if (profilesError) throw profilesError;

  const recipients = uniqueValues((profiles ?? []).map(profile => profile.email)).map(email => {
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

  return {
    recipients,
    participantUserCount: participantUserIds.length,
  };
}

async function sendCancellationEmails({
  recipients,
  training,
}: {
  recipients: Array<{ email: string; displayName?: string }>;
  training: {
    title: string;
    description?: string | null;
    starts_at: string;
    ends_at: string;
    timezone?: string | null;
  };
}) {
  const results = await Promise.all(
    recipients.map(async recipient => {
      const result = await sendResendEmail({
        to: recipient.email,
        subject: `Capacitación en vivo cancelada: ${training.title}`,
        html: buildCancellationEmailHtml({
          fullName: recipient.displayName,
          training,
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

export async function handler(event: { httpMethod: string; body?: string | null }) {
  if (event.httpMethod === 'OPTIONS') {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Método no permitido.' });
  }

  try {
    assertBaseConfig();

    const body = event.body ? JSON.parse(event.body) : {};
    const liveTrainingId = typeof body.live_training_id === 'string' ? body.live_training_id.trim() : '';
    const cancelledBy = typeof body.cancelled_by === 'string' ? body.cancelled_by.trim() : null;

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

    if (training.deleted_at && training.calendar_status === 'cancelled') {
      return json(200, {
        ok: true,
        already_cancelled: true,
        training,
      });
    }

    const now = new Date().toISOString();
    const { recipients, participantUserCount } = await resolveRecipients({ client, training });

    let googleCancellation: { ok: boolean; already_missing?: boolean } | null = null;

    if (training.calendar_event_id && training.calendar_status !== 'cancelled') {
      await client.from('live_training_logs').insert({
        tenant_id: training.tenant_id,
        live_training_id: liveTrainingId,
        user_id: null,
        event_type: 'google_calendar_cancel_requested',
        metadata: {
          calendar_event_id: training.calendar_event_id,
          requested_at: now,
        },
        created_by: cancelledBy || training.created_by,
      });

      const accessToken = await getGoogleAccessToken();
      googleCancellation = await cancelGoogleCalendarEvent({
        accessToken,
        calendarEventId: training.calendar_event_id,
      });
    }

    const emailResult = await sendCancellationEmails({
      recipients,
      training,
    });

    const { data: updatedTraining, error: updateError } = await client
      .from('live_trainings')
      .update({
        status: 'cancelled',
        calendar_status: 'cancelled',
        calendar_error: null,
        deleted_at: now,
        deleted_by: cancelledBy,
        updated_at: now,
      })
      .eq('id', liveTrainingId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    await client.from('live_training_logs').insert({
      tenant_id: training.tenant_id,
      live_training_id: liveTrainingId,
      user_id: null,
      event_type: 'live_training_cancelled',
      metadata: {
        cancelled_at: now,
        calendar_event_id: training.calendar_event_id,
        google_calendar_cancelled: Boolean(googleCancellation?.ok),
        google_calendar_already_missing: Boolean(googleCancellation?.already_missing),
        attendee_count: recipients.length,
        participant_user_count: participantUserCount,
        cancellation_email_count: emailResult.sent,
        cancellation_email_failed_count: emailResult.failed,
        cancellation_email_errors: emailResult.errors,
      },
      created_by: cancelledBy || training.created_by,
    });

    return json(200, {
      ok: true,
      training: updatedTraining,
      google_calendar_cancelled: Boolean(googleCancellation?.ok),
      google_calendar_already_missing: Boolean(googleCancellation?.already_missing),
      attendee_count: recipients.length,
      cancellation_email_count: emailResult.sent,
      cancellation_email_failed_count: emailResult.failed,
      cancellation_email_errors: emailResult.errors,
    });
  } catch (error) {
    const message = getErrorMessage(error);

    try {
      const body = event.body ? JSON.parse(event.body) : {};
      const liveTrainingId = typeof body.live_training_id === 'string' ? body.live_training_id.trim() : '';

      if (supabaseUrl && serviceRoleKey && liveTrainingId) {
        const client = createClient(supabaseUrl, serviceRoleKey);
        await client.from('live_training_logs').insert({
          tenant_id: null,
          live_training_id: liveTrainingId,
          user_id: null,
          event_type: 'google_calendar_cancel_failed',
          metadata: {
            error: message,
            failed_at: new Date().toISOString(),
          },
          created_by: null,
        });

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
      console.error('No pudimos guardar error de cancelación:', updateError);
    }

    console.error('cancel-google-meet-event error:', error);

    return json(500, { error: message });
  }
}
