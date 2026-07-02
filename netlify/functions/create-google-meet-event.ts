import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRefreshToken = process.env.GOOGLE_REFRESH_TOKEN;
const googleCalendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

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
}: {
  accessToken: string;
  training: {
    id: string;
    title: string;
    description?: string | null;
    starts_at: string;
    ends_at: string;
    timezone?: string | null;
  };
  attendees: Array<{ email: string; displayName?: string }>;
}) {
  const timezone = training.timezone || 'America/Argentina/Buenos_Aires';

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
        summary: training.title,
        description: [
          training.description || '',
          '',
          'Evento generado automáticamente por Cigüeña | Platform by BondiApps.',
          'Ingresá siempre desde Cigüeña para registrar tu asistencia antes de entrar a Google Meet.',
        ]
          .filter(Boolean)
          .join('\n'),
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

    const { data: participants, error: participantsError } = await client
      .from('live_training_participants')
      .select('*')
      .eq('live_training_id', liveTrainingId);

    if (participantsError) throw participantsError;

    const participantUserIds = uniqueValues((participants ?? []).map(participant => participant.user_id));

    let attendees: Array<{ email: string; displayName?: string }> = [];

    if (participantUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await client
        .from('profiles')
        .select('*')
        .or(`id.in.(${participantUserIds.join(',')}),auth_user_id.in.(${participantUserIds.join(',')})`);

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

    const accessToken = await getGoogleAccessToken();
    const googleEvent = await createGoogleCalendarEvent({
      accessToken,
      training,
      attendees,
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
