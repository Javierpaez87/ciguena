import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const allowedStatuses = new Set(['new', 'in_review', 'resolved', 'closed']);
const allowedActions = new Set(['list', 'update_status', 'get_attachment_url']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

function clean(value: unknown, maxLength = 200) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function getBearerToken(eventHeaders: Record<string, string | undefined>) {
  const authorization = eventHeaders.authorization || eventHeaders.Authorization;
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length).trim() || null;
}

function isSuperAdminRole(role?: string | null) {
  const normalized = (role || '').trim().toLowerCase();
  return normalized === 'super_admin' || normalized === 'superadmin';
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

  const bearerToken = getBearerToken(event.headers || {});
  if (!bearerToken) {
    return json(401, { error: 'Sesión requerida.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(bearerToken);

  if (authError || !authData?.user?.id) {
    return json(401, { error: 'La sesión no es válida.' });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, status')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Error validando Superadmin de soporte:', profileError);
    return json(500, { error: 'No pudimos validar tu perfil.' });
  }

  if (!profile || profile.status !== 'active' || !isSuperAdminRole(profile.role)) {
    return json(403, { error: 'Esta sección es exclusiva de Superadmin.' });
  }

  let body: any;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Solicitud inválida.' });
  }

  const action = clean(body.action, 60);
  if (!allowedActions.has(action)) {
    return json(400, { error: 'Acción de soporte inválida.' });
  }

  if (action === 'list') {
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('support_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (requestsError) {
      console.error('Error listando reportes de soporte:', requestsError);
      return json(500, { error: 'No pudimos cargar los reportes de soporte.' });
    }

    const tenantIds = Array.from(new Set(
      (requests || [])
        .map(request => request.tenant_id)
        .filter((tenantId): tenantId is string => typeof tenantId === 'string' && Boolean(tenantId))
    ));

    const tenantNames = new Map<string, string>();

    if (tenantIds.length > 0) {
      const { data: tenants, error: tenantsError } = await supabaseAdmin
        .from('tenants')
        .select('id, name')
        .in('id', tenantIds);

      if (tenantsError) {
        console.error('Error resolviendo tenants para soporte:', tenantsError);
      } else {
        (tenants || []).forEach(tenant => tenantNames.set(tenant.id, tenant.name));
      }
    }

    return json(200, {
      ok: true,
      requests: (requests || []).map(request => ({
        ...request,
        tenant_name: request.tenant_id ? tenantNames.get(request.tenant_id) || null : null,
      })),
    });
  }

  const requestId = clean(body.requestId, 80);
  if (!uuidPattern.test(requestId)) {
    return json(400, { error: 'Identificador de reporte inválido.' });
  }

  if (action === 'update_status') {
    const status = clean(body.status, 30);

    if (!allowedStatuses.has(status)) {
      return json(400, { error: 'Estado inválido.' });
    }

    const now = new Date().toISOString();
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('support_requests')
      .update({ status, updated_at: now })
      .eq('id', requestId)
      .select('id, status, updated_at')
      .maybeSingle();

    if (updateError) {
      console.error('Error actualizando estado de soporte:', updateError);
      return json(500, { error: 'No pudimos actualizar el estado del reporte.' });
    }

    if (!updatedRequest) {
      return json(404, { error: 'No encontramos ese reporte.' });
    }

    return json(200, { ok: true, request: updatedRequest });
  }

  const { data: request, error: requestError } = await supabaseAdmin
    .from('support_requests')
    .select('id, attachment_path')
    .eq('id', requestId)
    .maybeSingle();

  if (requestError) {
    console.error('Error buscando adjunto de soporte:', requestError);
    return json(500, { error: 'No pudimos buscar la captura adjunta.' });
  }

  if (!request) {
    return json(404, { error: 'No encontramos ese reporte.' });
  }

  if (!request.attachment_path) {
    return json(404, { error: 'Este reporte no tiene una captura adjunta.' });
  }

  const expiresIn = 300;
  const { data: signedData, error: signedError } = await supabaseAdmin.storage
    .from('support-attachments')
    .createSignedUrl(request.attachment_path, expiresIn);

  if (signedError || !signedData?.signedUrl) {
    console.error('Error generando URL firmada de soporte:', signedError);
    return json(500, { error: 'No pudimos abrir la captura adjunta.' });
  }

  return json(200, {
    ok: true,
    signedUrl: signedData.signedUrl,
    expiresIn,
  });
};
