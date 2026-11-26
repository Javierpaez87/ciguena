/** Sincronización privada e idempotente de tickets externos hacia BondiSupport QA. */
import type { SupabaseClient } from '@supabase/supabase-js';
import { bondiSettings } from './bondiConnector.mjs';
export async function syncExternalTicket(db: SupabaseClient, requestId: string, connector: string) {
  const {token,endpoint}=bondiSettings();
  if(connector!==token)throw new Error('external_connector_mismatch');
  const {data:r,error}=await db.from('support_requests')
    .select('id,source,auth_user_id,tenant_id,request_type,priority,description,contact_name,contact_email')
    .eq('id',requestId).maybeSingle();
  if(error||!r||!['login','register'].includes(r.source)||r.auth_user_id||r.tenant_id)
    throw new Error('invalid_external_request');
  const response=await fetch(`${endpoint}?op=external-ticket`,{method:'POST',headers:{'content-type':'application/json',
    'x-bondisupport-connector-key':connector},body:JSON.stringify({
      external_request_id:r.id,request_type:r.request_type,priority:r.priority,
      contact_name:r.contact_name,contact_email:r.contact_email,description:r.description,
    }),signal:AbortSignal.timeout(8000),cache:'no-store'});
  if(!response.ok)throw new Error('external_bridge_http_'+response.status);
  const result=await response.json();
  if(!result?.ticket_id)throw new Error('external_missing_central_ticket');
  const {error:upError}=await db.from('support_bondi_outbox').update({state:'synced',
    central_ticket_id:result.ticket_id,synced_at:new Date().toISOString(),last_error:null,
    updated_at:new Date().toISOString()}).eq('request_id',requestId);
  if(upError)throw new Error('external_queue_update_failed');
  return result;
}
