import { supabase } from './supabase';

export type ComplianceSource = 'superadmin' | 'admin';
export type ComplianceMode = 'signature_only' | 'ethics_and_signature';

export interface TenantOnboardingSetting {
  id: string;
  tenant_id: string;
  source: ComplianceSource;
  onboarding_mode: ComplianceMode;
  ethics_code_id?: string | null;
  is_active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TenantEthicsCode {
  id: string;
  tenant_id: string;
  title: string;
  version: string;
  content: string;
  content_hash?: string | null;
  is_active?: boolean;
  created_at?: string | null;
  created_by?: string | null;
  source?: ComplianceSource;
  document_url?: string | null;
  published_at?: string | null;
}

export interface TenantComplianceState {
  tenant: { id: string; name: string; status?: string | null };
  defaultSetting: TenantOnboardingSetting | null;
  adminOverride: TenantOnboardingSetting | null;
  effectiveSetting: TenantOnboardingSetting | null;
  codes: TenantEthicsCode[];
}

export async function getTenantComplianceState(
  tenantId: string,
): Promise<TenantComplianceState> {
  const [tenantResult, settingsResult, codesResult] = await Promise.all([
    supabase
      .from('tenants')
      .select('id, name, status')
      .eq('id', tenantId)
      .single(),
    supabase
      .from('tenant_onboarding_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
    supabase
      .from('ethics_codes')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false }),
  ]);

  if (tenantResult.error || !tenantResult.data) {
    throw tenantResult.error ?? new Error('No pudimos cargar el tenant.');
  }
  if (settingsResult.error) throw settingsResult.error;
  if (codesResult.error) throw codesResult.error;

  const settings = (settingsResult.data ?? []) as TenantOnboardingSetting[];
  const defaultSetting = settings.find((row) => row.source === 'superadmin') ?? null;
  const adminOverride = settings.find((row) => row.source === 'admin') ?? null;

  return {
    tenant: tenantResult.data as TenantComplianceState['tenant'],
    defaultSetting,
    adminOverride,
    effectiveSetting: adminOverride ?? defaultSetting,
    codes: (codesResult.data ?? []) as TenantEthicsCode[],
  };
}

export async function saveTenantOnboardingSetting(args: {
  tenantId: string;
  source: ComplianceSource;
  mode: ComplianceMode;
  ethicsCodeId?: string | null;
}) {
  const { data, error } = await supabase.rpc('save_tenant_onboarding_setting', {
    p_tenant_id: args.tenantId,
    p_source: args.source,
    p_mode: args.mode,
    p_ethics_code_id: args.ethicsCodeId ?? null,
  });

  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

function sanitizeFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export async function uploadEthicsDocument(args: {
  tenantId: string;
  source: ComplianceSource;
  file: File;
}) {
  if (args.file.type !== 'application/pdf') {
    throw new Error('El documento adjunto debe ser PDF.');
  }

  const maxBytes = 15 * 1024 * 1024;
  if (args.file.size > maxBytes) {
    throw new Error('El PDF no puede superar los 15 MB.');
  }

  const safeName = sanitizeFileName(args.file.name) || 'codigo-etica.pdf';
  const path = `${args.tenantId}/${args.source}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from('ethics-documents')
    .upload(path, args.file, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from('ethics-documents')
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function publishTenantEthicsCode(args: {
  tenantId: string;
  source: ComplianceSource;
  title: string;
  version: string;
  content?: string;
  documentUrl?: string | null;
}) {
  const { data, error } = await supabase.rpc('publish_tenant_ethics_code', {
    p_tenant_id: args.tenantId,
    p_source: args.source,
    p_title: args.title,
    p_version: args.version,
    p_content: args.content ?? '',
    p_document_url: args.documentUrl ?? null,
  });

  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as TenantEthicsCode;
}

export async function resetTenantAdminOnboardingOverride() {
  const { data, error } = await supabase.rpc(
    'reset_tenant_onboarding_admin_override',
  );

  if (error) throw error;
  return Boolean(data);
}

export function getComplianceModeLabel(mode?: ComplianceMode | null) {
  return mode === 'ethics_and_signature'
    ? 'Código de Ética + firma'
    : 'Firma + consentimiento';
}
