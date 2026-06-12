import { supabase } from './supabase';
import type { AuthUser, EthicsAcceptance, EthicsCode } from '../types';

export const DEFAULT_ETHICS_TENANT_SLUG = 'bondiapps';

export interface EthicsRequirementResult {
  isLoading?: boolean;
  mustSign: boolean;
  tenant: { id: string; name: string; logo_url: string | null } | null;
  ethicsCode: EthicsCode | null;
  acceptance: EthicsAcceptance | null;
  error: string | null;
}

export async function getActiveEthicsCodeForTenant(tenantId: string) {
  return supabase
    .from('ethics_codes')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function getEthicsRequirement(user: AuthUser): Promise<EthicsRequirementResult> {
  if (!user.tenant_id) {
    return {
      mustSign: false,
      tenant: null,
      ethicsCode: null,
      acceptance: null,
      error: null,
    };
  }

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, logo_url')
    .eq('id', user.tenant_id)
    .single();

  if (tenantError || !tenant) {
    return {
      mustSign: false,
      tenant: null,
      ethicsCode: null,
      acceptance: null,
      error: 'No pudimos identificar la empresa del usuario.',
    };
  }

  const { data: ethicsCode, error: ethicsCodeError } = await getActiveEthicsCodeForTenant(tenant.id);

  if (ethicsCodeError) {
    return {
      mustSign: false,
      tenant,
      ethicsCode: null,
      acceptance: null,
      error: 'No pudimos cargar el Código de Ética vigente.',
    };
  }

  if (!ethicsCode) {
    return {
      mustSign: false,
      tenant,
      ethicsCode: null,
      acceptance: null,
      error: null,
    };
  }

  const { data: acceptance, error: acceptanceError } = await supabase
    .from('ethics_acceptances')
    .select('*')
    .eq('user_id', user.id)
    .eq('ethics_code_id', ethicsCode.id)
    .maybeSingle();

  if (acceptanceError) {
    return {
      mustSign: false,
      tenant,
      ethicsCode: ethicsCode as EthicsCode,
      acceptance: null,
      error: 'No pudimos verificar si el Código de Ética ya fue firmado.',
    };
  }

  return {
    mustSign: !acceptance,
    tenant,
    ethicsCode: ethicsCode as EthicsCode,
    acceptance: acceptance as EthicsAcceptance | null,
    error: null,
  };
}

export async function sha256FromText(text: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function dataUrlToBlob(dataUrl: string) {
  const [metadata, base64] = dataUrl.split(',');
  const contentType = metadata.match(/:(.*?);/)?.[1] ?? 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: contentType });
}
