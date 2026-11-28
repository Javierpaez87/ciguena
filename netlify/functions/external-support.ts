import { maintenanceResponse } from '../lib/platformMaintenance.mjs';
/** Enlace externo con email verificado, aislado del acceso de trabajadores SPI. */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { digest,enabled,emailAllowed,issueLink,EXTERNAL_TENANT } from '../lib/externalSupport';
import { bondiSettings } from '../lib/bondiConnector.mjs';
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply=(statusCode:number,data:unknown)=>({statusCode,headers:{'content-type':'application/json','cache-control':'no-store','referrer-policy':'no-referrer'},body:JSON.stringify(data)});
const call=async(op:string,token:string,endpoint:string,body?:unknown,qs?:URLSearchParams)=>{
 const url=`${endpoint}?op=${op}${qs?'&'+qs.toString():''}`;
 const r=await fetch(url,{method:body?'POST':'GET',headers:{'x-bondisupport-connector-key':token,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000),cache:'no-store'});
 const obj=await r.json().catch(()=>({}));if(!r.ok)throw new Error('central '+r.status);return obj;
};
export const handler=async(event:any)=>{
  const maintenanceBlock = await maintenanceResponse(event, 'public');
  if (maintenanceBlock) return maintenanceBlock;
 if(event.httpMethod!=='POST')return reply(405,{error:'Método no permitido'});
 if(!enabled())return reply(404,{error:'Seguimiento externo no disponible'});
 if(Buffer.byteLength(event.body||'','utf8')>8000)return reply(413,{error:'Solicitud demasiado grande'});
 let data:any;try{data=JSON.parse(event.body||'{}');}catch{return reply(400,{error:'Solicitud inválida'});}
 if(!['issue','get','send'].includes(data?.action))return reply(400,{error:'Acción inválida'});
 const url=(process.env.SUPABASE_URL||'').trim(),key=(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
 let connector:string;let endpoint:string;
 try{({token:connector,endpoint}=bondiSettings());}catch{return reply(503,{error:'Conector no configurado'});}
 if(!url||!key||connector.length!==64)return reply(503,{error:'Servicio no configurado'});
 try{
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},
   ...(key.startsWith('sb_secret_')?{global:{fetch:(input:any,init:any={})=>{
    const h=new Headers(init.headers??(input instanceof Request?input.headers:undefined));
    if(h.get('authorization')===`Bearer ${key}`)h.delete('authorization');
    if(!h.has('apikey'))h.set('apikey',key);return fetch(input,{...init,headers:h});
   }}}:{})});
  if(data.action==='issue'){
   if(!ID.test(data.requestId||'')||typeof data.email!=='string')return reply(200,{ok:true});
   const email=data.email.trim().toLowerCase();if(!emailAllowed(email))return reply(200,{ok:true});
   const {data:req}=await db.from('support_requests').select('id,contact_email,source,auth_user_id')
     .eq('id',data.requestId).maybeSingle();
   if(req&&!req.auth_user_id&&['login','register'].includes(req.source)&&req.contact_email?.toLowerCase()===email){
    await issueLink(db,req.id,email);
   }
   return reply(200,{ok:true}); // sin revelar si existe el reporte
  }
  // El enlace puede emitirse con el conector apagado; leer/escribir en el
  // ticket central debe esperar a que se active la sincronizacion.
  if(process.env.CIGUENA_BONDI_SYNC_ENABLED!=='true')
   return reply(503,{error:'Seguimiento temporalmente no disponible'});
  if(typeof data.token!=='string'||!/^[a-f0-9]{64}$/.test(data.token))return reply(401,{error:'Enlace inválido'});
  const {data:access}=await db.from('support_external_access').select('request_id,expires_at')
    .eq('token_hash',digest(data.token)).maybeSingle();
  if(!access||new Date(access.expires_at).getTime()<Date.now())return reply(401,{error:'Enlace vencido o inválido'});
  const {data:request,error:re}=await db.from('support_requests')
    .select('id,request_type,priority,description,contact_name,contact_email,source,auth_user_id,created_at')
    .eq('id',access.request_id).maybeSingle();
  if(re||!request||request.auth_user_id||!['login','register'].includes(request.source)
    ||!emailAllowed(request.contact_email))return reply(403,{error:'No autorizado'});
  await db.from('support_external_access').update({verified_at:new Date().toISOString()}).eq('request_id',access.request_id);
  // El ticket externo se sincroniza SOLO después de abrir un enlace enviado al email declarado.
  await call('external-ticket',connector,endpoint,{external_request_id:request.id,request_type:request.request_type,
    priority:request.priority,contact_name:request.contact_name,contact_email:request.contact_email,
    description:request.description});
  const qs=new URLSearchParams({external_request_id:request.id,tenant_id:EXTERNAL_TENANT});
  if(data.action==='send'){
   if(typeof data.text!=='string'||data.text.trim().length<1||data.text.length>3000)
      return reply(400,{error:'Mensaje inválido'});
   const existing=await call('conversation',connector,endpoint,undefined,qs);
   if(existing?.ticket?.status==='cerrado')return reply(409,{error:'El ticket está cerrado'});
   const msg=await call('message',connector,endpoint,{message_id:ID.test(data.messageId||'')?data.messageId:randomUUID(),
     author_name:request.contact_name,body:data.text.trim()},qs);
   return reply(200,{ok:true,message:msg});
  }
  const conversation=await call('conversation',connector,endpoint,undefined,qs);
  return reply(200,{ticket:conversation.ticket,messages:conversation.messages,created_at:request.created_at,
    description:request.description,contact_name:request.contact_name});
 }catch(e){console.error('external support',e instanceof Error?e.message.slice(0,45):'unknown');
  return reply(503,{error:'Seguimiento temporalmente no disponible'});}
};
