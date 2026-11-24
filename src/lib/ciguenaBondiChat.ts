import {supabase} from './supabase';
export type Report={id:string;description:string;created_at:string;status:string};
export type ChatMessage={id:string;author_name:string;author_role:'soporte'|'usuario';body:string;created_at:string};
export type Conversation={ticket:{id:string;code:string;status:string};messages:ChatMessage[]};
export async function chatRequest<T>(input:Record<string,unknown>):Promise<T>{
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)throw new Error('Iniciá sesión para ver tus reportes');
 const response=await fetch('/.netlify/functions/ciguena-bondi-chat',{
  method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${session.access_token}`},
  body:JSON.stringify(input)});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(typeof body.error==='string'?body.error:'No se pudo consultar soporte');
 return body as T;
}
