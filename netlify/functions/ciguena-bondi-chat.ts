/** Chat Cigüeña: proxy autenticado, sin exponer secreto de BondiSupport al navegador. */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { bondiSettings } from '../lib/bondiConnector.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json=(statusCode:number,body:unknown)=>({statusCode,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify(body)});
const parseBearer=(headers:Record<string,string|undefined>)=>{
 const value=headers.authorization||headers.Authorization||'';
 return value.startsWith('Bearer ')?value.slice(7).trim():'';
};
export const handler=async(event:any)=>{
 if(event.httpMethod!=='POST')return json(405,{error:'Metodo no permitido'});
 if(process.env.CIGUENA_BONDI_SYNC_ENABLED!=='true')return json(503,{error:'Conector temporalmente desactivado'});
 const jwt=parseBearer(event.headers||{});
 if(!jwt)return json(401,{error:'Inicia sesion'});
 let token:string;let central:string;
 try{({token,endpoint:central}=bondiSettings());}catch{return json(503,{error:'Conector no configurado'});}
 const url=(process.env.SUPABASE_URL||'').trim();
 const key=(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
 if(token.length!==64||!url||!key)return json(503,{error:'Conexion no configurada'});
 let body:any;
 try {body=JSON.parse(event.body||'{}');}catch{return json(400,{error:'Solicitud invalida'});}
 const action=body?.action;
 if(!['list','conversation','send','reopen'].includes(action))return json(400,{error:'Accion invalida'});
 if(action!=='list'&&!UUID.test(body?.requestId||''))return json(400,{error:'Reporte invalido'});
 if(action==='reopen'&&(typeof body?.reason!=='string'||body.reason.trim().length<5||body.reason.length>1000))
   return json(400,{error:'Indica un motivo de al menos 5 caracteres'});
 if(action==='send'&&(typeof body?.text!=='string'||!body.text.trim()||body.text.length>3000))
   return json(400,{error:'Mensaje invalido'});
 try{
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},
   ...(key.startsWith('sb_secret_')?{global:{fetch:(input:any,init:any={})=>{
    const headers=new Headers(init.headers??(input instanceof Request?input.headers:undefined));
    if(headers.get('authorization')===`Bearer ${key}`)headers.delete('authorization');
    if(!headers.has('apikey'))headers.set('apikey',key);
    return fetch(input,{...init,headers});
   }}}:{})});
  const {data:identity,error:authError}=await db.auth.getUser(jwt);
  if(authError||!identity?.user?.id)return json(401,{error:'Sesion invalida'});
  const {data:profile,error:pe}=await db.from('profiles').select('id,tenant_id,full_name,status')
   .eq('auth_user_id',identity.user.id).maybeSingle();
  if(pe||!profile?.tenant_id||profile.status!=='active')return json(403,{error:'Perfil no autorizado'});
  if(action==='list'){
   const {data:reports,error:re}=await db.from('support_requests')
    .select('id,description,created_at,status,tenant_id')
    .eq('auth_user_id',identity.user.id).eq('tenant_id',profile.tenant_id).eq('source','platform')
    .order('created_at',{ascending:false}).limit(30);
   if(re)return json(500,{error:'No se pudieron leer los reportes'});
   const ids=(reports||[]).map((r:any)=>r.id);
   if(!ids.length)return json(200,{reports:[]});
   const {data:links,error:le}=await db.from('support_bondi_outbox')
    .select('request_id,state,central_ticket_id').in('request_id',ids).eq('state','synced');
   if(le)return json(500,{error:'No se pudieron leer las vinculaciones'});
   const synced=new Set((links||[]).filter((r:any)=>r.central_ticket_id).map((r:any)=>r.request_id));
   return json(200,{reports:(reports||[]).filter((r:any)=>synced.has(r.id))
     .map((r:any)=>({id:r.id,description:r.description,created_at:r.created_at,status:r.status}))});
  }
  const {data:local,error:localError}=await db.from('support_requests')
   .select('id,tenant_id,auth_user_id,source')
   .eq('id',body.requestId).eq('auth_user_id',identity.user.id)
   .eq('tenant_id',profile.tenant_id).eq('source','platform').maybeSingle();
  if(localError||!local)return json(404,{error:'Reporte no disponible'});
  const {data:out,error:outError}=await db.from('support_bondi_outbox')
    .select('state,central_ticket_id').eq('request_id',local.id).eq('state','synced').maybeSingle();
  if(outError||!out?.central_ticket_id)return json(409,{error:'Reporte pendiente de sincronizar'});
  if(action==='reopen'){
   const response=await fetch(`${central}?op=reopen`,{
     method:'POST',headers:{'x-bondisupport-connector-key':token,'content-type':'application/json'},
     body:JSON.stringify({external_request_id:local.id,tenant_id:profile.tenant_id,
       author_name:profile.full_name||'Usuario Cigüeña',reason:body.reason.trim()}),
     signal:AbortSignal.timeout(12000),cache:'no-store',
   });
   const reply=await response.json().catch(()=>({}));
   if(!response.ok)return json(response.status===409?409:502,{error:response.status===409?'El ticket ya no está cerrado. Actualizá la conversación.':'No se pudo reabrir el ticket'});
   return json(200,reply);
  }
  const params=new URLSearchParams({op:action==='send'?'message':'conversation',
    external_request_id:local.id,tenant_id:profile.tenant_id});
  // El identificador se origina en servidor. En reintentos del navegador no se duplican mensajes
  // si se envía el mismo messageId.
  const messageId=typeof body.messageId==='string'&&UUID.test(body.messageId)?body.messageId:randomUUID();
  const response=await fetch(`${central}?${params}`,{
    method:action==='send'?'POST':'GET',
    headers:{'x-bondisupport-connector-key':token,...(action==='send'?{'content-type':'application/json'}:{})},
    ...(action==='send'?{body:JSON.stringify({message_id:messageId,author_name:profile.full_name||'Usuario Cigüeña',body:body.text})}:{}),
    signal:AbortSignal.timeout(12000),cache:'no-store',
  });
  const reply=await response.json().catch(()=>({}));
  if(!response.ok)return json(response.status===404?404:502,{error:'No se pudo comunicar con BondiSupport'});
  return json(200,reply);
 }catch(err){console.error('ciguena chat proxy',err instanceof Error?err.name:'unknown');
  return json(503,{error:'Servicio temporalmente no disponible'});}
};
