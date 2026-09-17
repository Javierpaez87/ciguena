import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const requestTypes = new Set(['problem', 'suggestion']);
const priorities = new Set(['urgent', 'high', 'medium', 'low']);
const sources = new Set(['platform', 'login', 'register']);
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxAttachmentBytes = 2 * 1024 * 1024;

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

function clean(value: unknown, maxLength = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeEmail(value: unknown) {
  return clean(value, 320).toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizeFileName(value: string) {
  const safe = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return safe || 'captura.jpg';
}

function getBearerToken(eventHeaders: Record<string, string | undefined>) {
  const authorization = eventHeaders.authorization || eventHeaders.Authorization;
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length).trim() || null;
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Método no permitido.' });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
    return json(500, { error: 'El servicio de soporte no está configurado.' });
  }

  let body: any;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Solicitud inválida.' });
  }

  // Honeypot: public login/register forms should leave this field empty.
  if (clean(body.website, 200)) {
    return json(200, { ok: true, requestId: 'accepted' });
  }

  const requestType = clean(body.requestType, 30);
  const priority = clean(body.priority, 30);
  const source = clean(body.source, 30);
  const submittedName = clean(body.name, 200);
  const submittedEmail = normalizeEmail(body.email);
  const submittedPhone = clean(body.phone, 100);
  const description = clean(body.description, 4000);
  const submittedTenantId = clean(body.tenantId, 80) || null;

  if (!requestTypes.has(requestType)) {
    return json(400, { error: 'Seleccioná si se trata de un problema o una sugerencia.' });
  }

  if (!priorities.has(priority)) {
    return json(400, { error: 'Seleccioná una prioridad válida.' });
  }

  if (!sources.has(source)) {
    return json(400, { error: 'Origen de reporte inválido.' });
  }

  if (!submittedName || !submittedEmail || !description) {
    return json(400, { error: 'Completá nombre, email y descripción.' });
  }

  if (!isValidEmail(submittedEmail)) {
    return json(400, { error: 'Ingresá un email válido.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userId: string | null = null;
  let tenantId: string | null = submittedTenantId;
  let authUserId: string | null = null;

  const bearerToken = getBearerToken(event.headers || {});

  if (bearerToken) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(bearerToken);

    if (!authError && authData?.user?.id) {
      authUserId = authData.user.id;

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, tenant_id')
        .eq('auth_user_id', authData.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error resolviendo perfil de soporte:', profileError);
        return json(500, { error: 'No pudimos asociar el reporte a tu usuario.' });
      }

      if (profile) {
        userId = profile.id;
        tenantId = profile.tenant_id;
      }
    }
  }

  if (tenantId) {
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .maybeSingle();

    if (tenantError) {
      console.error('Error validando tenant del reporte:', tenantError);
      return json(500, { error: 'No pudimos validar la organización del reporte.' });
    }

    if (!tenant) {
      tenantId = null;
    }
  }

  let attachmentPath: string | null = null;
  let attachmentMimeType: string | null = null;
  let attachmentOriginalName: string | null = null;
  let attachmentOriginalSize: number | null = null;
  let attachmentCompressedSize: number | null = null;

  if (body.attachment) {
    const fileName = sanitizeFileName(clean(body.attachment.fileName, 240));
    const mimeType = clean(body.attachment.mimeType, 100);
    const base64 = clean(body.attachment.base64, 4_000_000);
    const originalSize = Number(body.attachment.originalSize || 0);
    const compressedSize = Number(body.attachment.compressedSize || 0);

    if (!allowedImageTypes.has(mimeType) || !base64) {
      return json(400, { error: 'La imagen adjunta no tiene un formato válido.' });
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(base64, 'base64');
    } catch {
      return json(400, { error: 'No pudimos procesar la imagen adjunta.' });
    }

    if (!fileBuffer.length || fileBuffer.length > maxAttachmentBytes) {
      return json(400, { error: 'La imagen adjunta supera el tamaño permitido después de comprimirla.' });
    }

    const requestFolder = tenantId || 'unassigned';
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${fileName}`;
    attachmentPath = `${requestFolder}/${uniqueName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('support-attachments')
      .upload(attachmentPath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error subiendo adjunto de soporte:', uploadError);
      return json(500, { error: 'No pudimos guardar la imagen adjunta.' });
    }

    attachmentMimeType = mimeType;
    attachmentOriginalName = fileName;
    attachmentOriginalSize = Number.isFinite(originalSize) ? originalSize : null;
    attachmentCompressedSize = Number.isFinite(compressedSize) ? compressedSize : fileBuffer.length;
  }

  const { data: request, error: insertError } = await supabaseAdmin
    .from('support_requests')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      auth_user_id: authUserId,
      request_type: requestType,
      priority,
      source,
      contact_name: submittedName,
      contact_email: submittedEmail,
      contact_phone: submittedPhone || null,
      description,
      attachment_path: attachmentPath,
      attachment_mime_type: attachmentMimeType,
      attachment_original_name: attachmentOriginalName,
      attachment_original_size: attachmentOriginalSize,
      attachment_compressed_size: attachmentCompressedSize,
      status: 'new',
      metadata: {
        hostname: clean(event.headers?.host, 300) || null,
        user_agent: clean(event.headers?.['user-agent'], 500) || null,
      },
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error creando support_request:', insertError);

    if (attachmentPath) {
      await supabaseAdmin.storage.from('support-attachments').remove([attachmentPath]);
    }

    return json(500, { error: 'No pudimos guardar el reporte. Intentá nuevamente.' });
  }

  return json(201, { ok: true, requestId: request.id });
};
