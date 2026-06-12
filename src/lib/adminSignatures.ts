import { supabase } from './supabase';
import type { AuthUser } from '../types';

export interface AdminSignatureAcceptance {
  id: string;
  tenant_id: string;
  admin_user_id: string;
  accepted_name: string;
  accepted_document_number?: string | null;
  acceptance_text: string;
  signature_image_url: string;
  tenant_signature_id?: string | null;
  accepted_at: string;
  created_at: string;
}

export interface AdminSignatureRequirementResult {
  mustSign: boolean;
  tenant: { id: string; name: string; logo_url: string | null } | null;
  acceptance: AdminSignatureAcceptance | null;
  error: string | null;
}

export async function getAdminSignatureRequirement(
  user: AuthUser
): Promise<AdminSignatureRequirementResult> {
  if (!user.tenant_id) {
    return {
      mustSign: false,
      tenant: null,
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
      acceptance: null,
      error: 'No pudimos identificar la empresa del admin.',
    };
  }

  const { data: acceptance, error: acceptanceError } = await supabase
    .from('admin_signature_acceptances')
    .select('*')
    .eq('admin_user_id', user.id)
    .order('accepted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (acceptanceError) {
    return {
      mustSign: false,
      tenant,
      acceptance: null,
      error: 'No pudimos verificar si la conformidad de firma ya fue registrada.',
    };
  }

  return {
    mustSign: !acceptance,
    tenant,
    acceptance: (acceptance as AdminSignatureAcceptance | null) ?? null,
    error: null,
  };
}
