import { supabase } from './supabase';
import type { AuthUser, EthicsAcceptance, EthicsCode, Profile } from '../types';

export type WorkerOnboardingMode = 'signature_only' | 'ethics_and_signature';

export interface WorkerSignatureConsent {
  id: string;
  tenant_id: string;
  user_id: string;
  signature_image_url: string;
  signature_hash: string;
  accepted_name: string;
  accepted_document_number?: string | null;
  consent_text: string;
  consent_version: string;
  profile_snapshot?: Record<string, unknown> | null;
  accepted_at: string;
  created_at?: string | null;
}

export interface WorkerOnboardingProfile extends Profile {
  profile_validated_at?: string | null;
}

export interface WorkerDirectorySnapshot {
  full_name?: string | null;
  dni?: string | null;
  employee_code?: string | null;
  work_role?: string | null;
  phone?: string | null;
  area?: string | null;
  position?: string | null;
}

export interface WorkerOnboardingRequirement {
  mustComplete: boolean;
  tenant: { id: string; name: string; logo_url: string | null } | null;
  profile: WorkerOnboardingProfile | null;
  directory: WorkerDirectorySnapshot | null;
  mode: WorkerOnboardingMode;
  ethicsCode: EthicsCode | null;
  ethicsAcceptance: EthicsAcceptance | null;
  signatureConsent: WorkerSignatureConsent | null;
  needsProfileValidation: boolean;
  needsSignatureConsent: boolean;
  needsEthicsAcceptance: boolean;
  missingProfileFields: string[];
  error: string | null;
}

const REQUIRED_PROFILE_FIELDS: Array<{
  label: string;
  getValue: (profile: WorkerOnboardingProfile) => string | null | undefined;
}> = [
  { label: 'Nombre y apellido', getValue: (profile) => profile.full_name },
  { label: 'DNI', getValue: (profile) => profile.dni },
  { label: 'Legajo', getValue: (profile) => profile.employee_code },
  {
    label: 'Rol operativo',
    getValue: (profile) => profile.work_role || profile.job_role || profile.position,
  },
  { label: 'Teléfono', getValue: (profile) => profile.phone },
];

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function getMissingRequiredProfileFields(profile: WorkerOnboardingProfile) {
  return REQUIRED_PROFILE_FIELDS
    .filter((field) => !hasText(field.getValue(profile)))
    .map((field) => field.label);
}

function preferProfileValue(
  profileValue: string | null | undefined,
  directoryValue: string | null | undefined,
) {
  return hasText(profileValue) ? profileValue : directoryValue ?? profileValue;
}

function mergeProfileWithDirectory(
  profile: WorkerOnboardingProfile,
  directory: WorkerDirectorySnapshot | null,
): WorkerOnboardingProfile {
  if (!directory) return profile;

  return {
    ...profile,
    full_name: preferProfileValue(profile.full_name, directory.full_name) || '',
    dni: preferProfileValue(profile.dni, directory.dni),
    employee_code: preferProfileValue(profile.employee_code, directory.employee_code),
    work_role: preferProfileValue(
      profile.work_role || profile.job_role || profile.position,
      directory.work_role || directory.position,
    ),
    phone: preferProfileValue(profile.phone, directory.phone),
    area: preferProfileValue(profile.area, directory.area) ?? null,
    position: preferProfileValue(profile.position, directory.position) ?? null,
  };
}

function blockedResult(error: string): WorkerOnboardingRequirement {
  return {
    mustComplete: true,
    tenant: null,
    profile: null,
    directory: null,
    mode: 'signature_only',
    ethicsCode: null,
    ethicsAcceptance: null,
    signatureConsent: null,
    needsProfileValidation: true,
    needsSignatureConsent: true,
    needsEthicsAcceptance: false,
    missingProfileFields: [],
    error,
  };
}

export async function getWorkerOnboardingRequirement(
  user: AuthUser,
): Promise<WorkerOnboardingRequirement> {
  if (!user.tenant_id) {
    return blockedResult('No pudimos identificar la empresa asociada a tu usuario.');
  }

  try {
    const [tenantResult, profileResult, settingsResult, signatureResult] = await Promise.all([
      supabase
        .from('tenants')
        .select('id, name, logo_url')
        .eq('id', user.tenant_id)
        .single(),
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .eq('tenant_id', user.tenant_id)
        .single(),
      supabase
        .from('tenant_onboarding_settings')
        .select('source, onboarding_mode, ethics_code_id, is_active, updated_at')
        .eq('tenant_id', user.tenant_id)
        .eq('is_active', true),
      supabase
        .from('worker_signature_consents')
        .select('*')
        .eq('user_id', user.id)
        .eq('tenant_id', user.tenant_id)
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (tenantResult.error || !tenantResult.data) {
      return blockedResult('No pudimos identificar la empresa asociada a tu usuario.');
    }

    if (profileResult.error || !profileResult.data) {
      return {
        ...blockedResult('No pudimos verificar los datos de tu perfil.'),
        tenant: tenantResult.data,
      };
    }

    if (settingsResult.error) {
      return {
        ...blockedResult('No pudimos verificar la configuración de onboarding de tu empresa.'),
        tenant: tenantResult.data,
        profile: profileResult.data as WorkerOnboardingProfile,
      };
    }

    if (signatureResult.error) {
      return {
        ...blockedResult('No pudimos verificar tu firma electrónica registrada.'),
        tenant: tenantResult.data,
        profile: profileResult.data as WorkerOnboardingProfile,
      };
    }

    const storedProfile = profileResult.data as WorkerOnboardingProfile;

    let directory: WorkerDirectorySnapshot | null = null;

    const directoryByProfile = await supabase
      .from('employee_directory')
      .select('full_name, dni, employee_code, work_role, phone, area, position')
      .eq('tenant_id', user.tenant_id)
      .eq('profile_id', user.id)
      .maybeSingle();

    if (!directoryByProfile.error && directoryByProfile.data) {
      directory = directoryByProfile.data as WorkerDirectorySnapshot;
    } else if (user.email) {
      const directoryByEmail = await supabase
        .from('employee_directory')
        .select('full_name, dni, employee_code, work_role, phone, area, position')
        .eq('tenant_id', user.tenant_id)
        .ilike('email', user.email.trim())
        .maybeSingle();

      if (!directoryByEmail.error && directoryByEmail.data) {
        directory = directoryByEmail.data as WorkerDirectorySnapshot;
      }
    }

    const profile = mergeProfileWithDirectory(storedProfile, directory);
    const settings = settingsResult.data ?? [];
    const adminOverride = settings.find((row) => row.source === 'admin');
    const superadminDefault = settings.find((row) => row.source === 'superadmin');
    const effectiveSetting = adminOverride ?? superadminDefault ?? null;

    const mode: WorkerOnboardingMode =
      effectiveSetting?.onboarding_mode === 'ethics_and_signature'
        ? 'ethics_and_signature'
        : 'signature_only';

    const missingProfileFields = getMissingRequiredProfileFields(profile);
    const needsProfileValidation =
      missingProfileFields.length > 0 || !profile.profile_validated_at;

    const signatureConsent =
      (signatureResult.data as WorkerSignatureConsent | null) ?? null;
    const needsSignatureConsent = !signatureConsent;

    let ethicsCode: EthicsCode | null = null;
    let ethicsAcceptance: EthicsAcceptance | null = null;
    let needsEthicsAcceptance = false;

    if (mode === 'ethics_and_signature') {
      if (!effectiveSetting?.ethics_code_id) {
        return {
          mustComplete: true,
          tenant: tenantResult.data,
          profile,
          directory,
          mode,
          ethicsCode: null,
          ethicsAcceptance: null,
          signatureConsent,
          needsProfileValidation,
          needsSignatureConsent,
          needsEthicsAcceptance: true,
          missingProfileFields,
          error: 'La empresa exige Código de Ética, pero no hay una versión vigente configurada.',
        };
      }

      const ethicsCodeResult = await supabase
        .from('ethics_codes')
        .select('*')
        .eq('id', effectiveSetting.ethics_code_id)
        .eq('tenant_id', user.tenant_id)
        .maybeSingle();

      if (ethicsCodeResult.error || !ethicsCodeResult.data) {
        return {
          mustComplete: true,
          tenant: tenantResult.data,
          profile,
          directory,
          mode,
          ethicsCode: null,
          ethicsAcceptance: null,
          signatureConsent,
          needsProfileValidation,
          needsSignatureConsent,
          needsEthicsAcceptance: true,
          missingProfileFields,
          error: 'No pudimos cargar el Código de Ética vigente de tu empresa.',
        };
      }

      ethicsCode = ethicsCodeResult.data as EthicsCode;

      const acceptanceResult = await supabase
        .from('ethics_acceptances')
        .select('*')
        .eq('user_id', user.id)
        .eq('ethics_code_id', ethicsCode.id)
        .maybeSingle();

      if (acceptanceResult.error) {
        return {
          mustComplete: true,
          tenant: tenantResult.data,
          profile,
          directory,
          mode,
          ethicsCode,
          ethicsAcceptance: null,
          signatureConsent,
          needsProfileValidation,
          needsSignatureConsent,
          needsEthicsAcceptance: true,
          missingProfileFields,
          error: 'No pudimos verificar la aceptación del Código de Ética vigente.',
        };
      }

      ethicsAcceptance = (acceptanceResult.data as EthicsAcceptance | null) ?? null;
      needsEthicsAcceptance = !ethicsAcceptance;
    }

    return {
      mustComplete:
        needsProfileValidation || needsSignatureConsent || needsEthicsAcceptance,
      tenant: tenantResult.data,
      profile,
      directory,
      mode,
      ethicsCode,
      ethicsAcceptance,
      signatureConsent,
      needsProfileValidation,
      needsSignatureConsent,
      needsEthicsAcceptance,
      missingProfileFields,
      error: null,
    };
  } catch (error) {
    console.error('Error verificando onboarding del worker:', error);
    return blockedResult('No pudimos verificar tu onboarding. Reintentá para continuar.');
  }
}
