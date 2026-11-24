import { randomBytes, createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
export const EXTERNAL_TENANT='00000000-0000-4000-8000-000000000001';
export const enabled=()=>process.env.CIGUENA_EXTERNAL_SUPPORT_ENABLED==='true';
export const emailAllowed=(address:string)=>{
 const allow=(process.env.CIGUENA_EXTERNAL_SUPPORT_EMAIL_ALLOWLIST||'')
  .toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
 return allow.length>0&&allow.includes(address.toLowerCase().trim());
};
export const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
export async function issueLink(db:SupabaseClient,requestId:string,email:string){
 if(!enabled()||!emailAllowed(email))return false;
 const key=process.env.RESEND_API_KEY||'';
 const sender=process.env.CIGUENA_EXTERNAL_SUPPORT_MAIL_FROM||'';
 const site=process.env.CIGUENA_EXTERNAL_SUPPORT_SITE_URL||'';
 if(!key||!(/^[^<>@]+@[^<>@]+\.[^<>@]+$/.test(sender)||/^.{1,80} <[^<>@]+@[^<>@]+\.[^<>@]+>$/.test(sender))||!/^https:\/\/[^/]+$/.test(site))return false;
 const {data:prior,error:pe}=await db.from('support_external_access')
    .select('issued_at').eq('request_id',requestId).maybeSingle();
 if(pe)throw new Error('No se pudo consultar acceso externo');
 if(prior&&Date.now()-new Date(prior.issued_at).getTime()<10*60*1000)return false;
 const token=randomBytes(32).toString('hex');
 const path=`${site}/soporte/seguimiento#token=${token}`;
 const res=await fetch('https://api.resend.com/emails',{
  method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
  body:JSON.stringify({from:sender,to:[email],subject:'Acceso a tu solicitud de soporte Cigüeña QA',
   text:`Recibimos tu solicitud. Para ver y responder a soporte, abrí este enlace temporal (válido por 48 horas):\n\n${path}\n\nSi no hiciste esta solicitud, ignorá este correo.`}),
 });
 if(!res.ok){console.error('external support mail status',res.status);return false;}
 const {error}=await db.from('support_external_access').upsert({
  request_id:requestId,token_hash:digest(token),
  issued_at:new Date().toISOString(),expires_at:new Date(Date.now()+48*3600*1000).toISOString(),verified_at:null,
 },{onConflict:'request_id'});
 if(error)throw new Error('No se pudo almacenar enlace');
 return true;
}
