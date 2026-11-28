import { maintenanceEnabled } from '../lib/platformMaintenance.mjs';
/** Worker privado por entorno; credenciales Supabase y BondiSupport de su Netlify. */
import { createClient } from '@supabase/supabase-js';
import { syncExternalTicket } from '../lib/bondiExternalSync';
import { bondiSettings } from '../lib/bondiConnector.mjs';
export const config={schedule:'*/5 * * * *'};
function dbClient(){
 const url=(process.env.SUPABASE_URL||'').trim();
 const key=(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
 if(!/^https:\/\/[^/]+\.supabase\.co\/?$/.test(url)||!key)throw new Error('missing_db_config');
 const fetchForSecret=key.startsWith('sb_secret_')?(input,init={})=>{
   const h=new Headers(init.headers??(input instanceof Request?input.headers:undefined));
   if(h.get('authorization')===`Bearer ${key}`)h.delete('authorization');
   if(!h.has('apikey'))h.set('apikey',key);
   return fetch(input,{...init,headers:h});
 }:undefined;
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},
   ...(fetchForSecret?{global:{fetch:fetchForSecret}}:{})});
}
async function update(db,id,patch){
 const {error}=await db.from('support_bondi_outbox').update({...patch,updated_at:new Date().toISOString()}).eq('request_id',id);
 if(error)throw error;
}
export default async function handler(){
 if(process.env.CIGUENA_BONDI_SYNC_ENABLED!=='true')return new Response('disabled',{status:200});
 try{
 if(await maintenanceEnabled())return new Response('maintenance: paused',{status:200});
 const {token,endpoint}=bondiSettings();
 const db=dbClient();
 const {data:jobs,error}=await db.from('support_bondi_outbox')
   .select('request_id,tenant_id,attempts,state,next_attempt_at')
   .in('state',['pending','error']).lte('next_attempt_at',new Date().toISOString())
   .order('created_at',{ascending:true}).limit(5);
 if(error)throw new Error('queue_read_failed');
 let synced=0,failed=0;
 for(const job of jobs||[]){
  if(await maintenanceEnabled())break;
  try{
   if(job.tenant_id===null){
     await syncExternalTicket(db,job.request_id,token);
     synced++;
     continue;
   }
   const {data:r,error:re}=await db.from('support_requests')
     .select('id,source,tenant_id,auth_user_id,request_type,priority,description,contact_name,attachment_path')
     .eq('id',job.request_id).maybeSingle();
   if(re||!r||r.source!=='platform'||!r.auth_user_id||r.tenant_id!==job.tenant_id)
     throw new Error('invalid_local_request');
   // No se permite exportar adjuntos sin transferencia segura ni se permite
   // simular que se exportaron: el job queda en error visible para QA.
   if(r.attachment_path)throw new Error('attachment_requires_secure_bridge');
   const {data:profiles,error:pe}=await db.from('profiles').select('id')
      .eq('auth_user_id',r.auth_user_id).eq('tenant_id',r.tenant_id).limit(1);
   if(pe||!profiles?.length)throw new Error('tenant_not_verified');
   const response=await fetch(`${endpoint}?op=ticket`,{method:'POST',headers:{'content-type':'application/json',
     'x-bondisupport-connector-key':token},body:JSON.stringify({
     external_request_id:r.id,tenant_id:r.tenant_id,contact_name:r.contact_name,
     description:r.description,request_type:r.request_type,priority:r.priority,
   }),signal:AbortSignal.timeout(10000),cache:'no-store'});
   if(!response.ok)throw new Error('bridge_http_'+response.status);
   const body=await response.json();
   if(!body.ticket_id)throw new Error('missing_central_ticket');
   await update(db,job.request_id,{state:'synced',central_ticket_id:body.ticket_id,
     synced_at:new Date().toISOString(),last_error:null});synced++;
  }catch(err){
   failed++;const attempts=Number(job.attempts||0)+1;
   const delay=Math.min(1440,Math.pow(2,Math.min(attempts,8))*5);
   await update(db,job.request_id,{state:'error',attempts,
     next_attempt_at:new Date(Date.now()+delay*60000).toISOString(),
     last_error:String(err?.message||'sync_failed').slice(0,100)});
  }
 }
 console.info('ciguena-bondi-sync',{processed:(jobs||[]).length,synced,failed});
 return new Response('ok',{status:200});
 }catch(err){console.error('ciguena-bondi-sync',String(err?.message||'error').slice(0,80));
 return new Response('worker error',{status:500});}
}
