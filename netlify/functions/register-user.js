import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function json(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value) {
  return clean(value).toLowerCase();
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

export const handler = async (event) => {
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

  let payload;

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

  // Crear usuario en Supabase Auth, ya confirmado
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

  // Refuerzo: volver a marcar el email como confirmado.
  // Esto ayuda si Supabase crea el usuario pero igual queda "waiting for verification".
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
    // Si falla el profile, eliminamos el usuario Auth para no dejar cuentas huérfanas
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

    return json(400, {
      error: 'No pudimos crear el perfil de usuario. Intentá nuevamente.',
    });
  }

  return json(200, {
    ok: true,
    message: requestedAdmin
      ? 'Tu cuenta fue creada correctamente. Tu solicitud de acceso como administrador quedó pendiente de validación por BondiApps.'
      : 'Tu cuenta fue creada correctamente y quedó pendiente de validación por parte del administrador de tu empresa.',
  });
};
