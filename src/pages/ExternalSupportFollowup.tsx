import {useEffect,useRef,useState, type FormEvent} from 'react';
type Msg={id:string;author_name:string;author_role:string;body:string;created_at:string};
type Data={ticket:{code:string;status:string}|null;messages:Msg[];description:string;contact_name:string};
const endpoint='/.netlify/functions/external-support';
async function request(payload:unknown){const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'No se pudo conectar');return d;}
export default function ExternalSupportFollowup(){
 const token=useRef(new URLSearchParams(window.location.hash.slice(1)).get('token')||'');
 const [data,setData]=useState<Data|null>(null),[text,setText]=useState(''),[error,setError]=useState(''),[sending,setSending]=useState(false);
 const [requestId,setRequestId]=useState(''),[email,setEmail]=useState(''),[issued,setIssued]=useState(false);
 const messageId=useRef<string|null>(null);
 useEffect(()=>{if(token.current){history.replaceState(null,'',window.location.pathname);void load();}},[]);
 async function load(){if(!token.current)return;try{const result=await request({action:'get',token:token.current});setData(result);setError('');}
 catch(e){setError(e instanceof Error?e.message:'Error');}}
 async function send(){if(!text.trim()||sending)return;setSending(true);try{
  if(!messageId.current)messageId.current=crypto.randomUUID();
  await request({action:'send',token:token.current,text:text.trim(),messageId:messageId.current});
  setText('');messageId.current=null;await load();
 }catch(e){setError(e instanceof Error?e.message:'Error');}finally{setSending(false);}}
 async function issue(e:FormEvent){e.preventDefault();try{await request({action:'issue',requestId,email});setIssued(true);setError('');}
 catch(e){setError(e instanceof Error?e.message:'Error');}}
 return <main className="min-h-screen bg-[#080e1d] text-slate-100 p-4 sm:p-8">
 <section className="mx-auto max-w-2xl rounded-2xl border border-slate-700 bg-slate-800 p-5 sm:p-8 space-y-5">
 <h1 className="text-2xl font-semibold">Seguimiento de soporte · Cigüeña QA</h1>
 <p className="text-sm text-slate-300">Este acceso permite consultar solo el reporte asociado al enlace verificado por email. No inicia sesión en Cigüeña ni acredita pertenencia a SPI.</p>
 {data?<>
 <div className="flex justify-between gap-3"><strong>{data.ticket?.code||'Solicitud'}</strong><span>{data.ticket?.status}</span></div>
 <p className="text-sm text-slate-300 whitespace-pre-wrap">{data.description}</p>
 <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-600 p-3 space-y-3">
 {data.messages.length?data.messages.map(m=><div key={m.id} className={`flex ${m.author_role==='usuario'?'justify-start':'justify-end'}`}>
 <div className={`max-w-[85%] rounded-xl p-3 text-sm ${m.author_role==='usuario'?'bg-sky-900/60':'bg-emerald-900/50'}`}>
 <p className="text-xs text-slate-300 mb-1">{m.author_name} · {new Date(m.created_at).toLocaleString('es-AR')}</p>
 <p className="whitespace-pre-wrap break-words">{m.body}</p></div></div>):<p className="text-sm text-slate-400">Todavía no hay respuestas.</p>}</div>
 {data.ticket?.status!=='cerrado'&&<div className="space-y-2"><textarea className="w-full rounded-lg border border-slate-600 bg-slate-900 p-3" rows={3} maxLength={3000} value={text} onChange={e=>{setText(e.target.value);messageId.current=null;}} placeholder="Escribí una respuesta..."/>
 <button onClick={()=>void send()} disabled={!text.trim()||sending} className="rounded-lg bg-cyan-700 px-4 py-2 disabled:opacity-50">{sending?'Enviando...':'Enviar respuesta'}</button></div>}
 <button onClick={()=>void load()} className="text-sm text-cyan-300 underline">Actualizar conversación</button>
 </>:<form onSubmit={issue} className="space-y-3"><h2 className="font-semibold">Solicitar otro enlace</h2>
 <p className="text-sm text-slate-300">Si tu enlace venció, ingresá el identificador del reporte y el mismo email que usaste para reportar.</p>
 <input className="w-full rounded-lg border border-slate-600 bg-slate-900 p-3" placeholder="ID del reporte" value={requestId} onChange={e=>setRequestId(e.target.value)} required/>
 <input type="email" className="w-full rounded-lg border border-slate-600 bg-slate-900 p-3" placeholder="Correo de contacto" value={email} onChange={e=>setEmail(e.target.value)} required/>
 <button className="rounded-lg bg-cyan-700 px-4 py-2">Solicitar enlace</button>
 {issued&&<p className="text-sm text-slate-300">Si los datos corresponden a una solicitud habilitada, recibirás un nuevo enlace.</p>}
 </form>}
 {error&&<p role="alert" className="text-red-300 text-sm">{error}</p>}
 <p className="text-xs text-slate-400">Enlaces válidos por 48 horas. No compartas el enlace de seguimiento.</p>
 </section></main>;
}
