import {useCallback,useEffect,useRef,useState} from 'react';
import {RefreshCw,Send} from 'lucide-react';
import {chatRequest,type ChatMessage,type Conversation,type Report} from '../../lib/ciguenaBondiChat';

export default function SupportConversations(){
 const [reports,setReports]=useState<Report[]>([]);
 const [selected,setSelected]=useState<string>('');
 const [conversation,setConversation]=useState<Conversation|null>(null);
 const [text,setText]=useState('');
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 const [sending,setSending]=useState(false);
 const [reopenReason,setReopenReason]=useState('');
 const [reopening,setReopening]=useState(false);
 const sentId=useRef<string|null>(null);
 const loadReports=useCallback(async()=>{
  try{const data=await chatRequest<{reports:Report[]}>({action:'list'});setReports(data.reports);
   setSelected(prev=>prev&&data.reports.some(r=>r.id===prev)?prev:(data.reports[0]?.id||''));
  }catch(e){setError(e instanceof Error?e.message:'Error de conexion');}
 },[]);
 const loadMessages=useCallback(async(requestId:string,showLoading=false)=>{
  if(!requestId)return;
  if(showLoading)setLoading(true);
  try{const data=await chatRequest<Conversation>({action:'conversation',requestId});
   setConversation(data);setError('');
  }catch(e){setError(e instanceof Error?e.message:'Error de conexion');}
  finally{if(showLoading)setLoading(false);}
 },[]);
 useEffect(()=>{void loadReports();},[loadReports]);
 useEffect(()=>{
  setConversation(null);
  if(!selected)return;
  void loadMessages(selected,true);
  const timer=window.setInterval(()=>{if(!document.hidden)void loadMessages(selected);},15000);
  return()=>window.clearInterval(timer);
 },[selected,loadMessages]);
 const closed=conversation?.ticket?.status==='cerrado';
 const statusLabel:Record<string,string>={nuevo:'Nuevo',en_progreso:'En progreso',esperando_cliente:'Esperando cliente',resuelto:'Resuelto',cerrado:'Cerrado',reabierto:'Reabierto'};
 const reopen=async()=>{
  if(!selected||!closed||reopening||reopenReason.trim().length<5)return;
  setReopening(true);setError('');
  try{await chatRequest({action:'reopen',requestId:selected,reason:reopenReason.trim()});
   setReopenReason('');await loadMessages(selected,true);
  }catch(e){setError(e instanceof Error?e.message:'No se pudo reabrir el ticket');}
  finally{setReopening(false);}
 };
 const send=async()=>{
  if(!selected||!text.trim()||sending||closed)return;
  if(!sentId.current)sentId.current=crypto.randomUUID();
  setSending(true);setError('');
  try{await chatRequest({action:'send',requestId:selected,text:text.trim(),messageId:sentId.current});
   setText('');sentId.current=null;await loadMessages(selected);
  }catch(e){setError(e instanceof Error?e.message:'No pudimos enviar el mensaje');}
  finally{setSending(false);}
 };
 const onText=(value:string)=>{if(value!==text)sentId.current=null;setText(value);};
 return <div className="card space-y-4 mt-5">
  <div className="flex justify-between items-center gap-3">
   <div><h3 className="text-lg font-semibold text-steel-100">Mis conversaciones con soporte</h3>
    <p className="text-xs text-steel-400 mt-1">Reportes sincronizados con BondiSupport · actualiza cada 15 s</p></div>
   <button type="button" className="btn-secondary" onClick={()=>void loadReports()} aria-label="Actualizar reportes"><RefreshCw size={16}/></button>
  </div>
  {reports.length===0?<p className="text-sm text-steel-400">Todavía no hay reportes sincronizados. Los nuevos reportes aparecerán acá.</p>:<>
   <label className="text-xs text-steel-400 block">Elegí un reporte
    <select className="select mt-2 w-full" value={selected} onChange={e=>setSelected(e.target.value)}>
     {reports.map(r=><option key={r.id} value={r.id}>{new Date(r.created_at).toLocaleDateString('es-AR')} · {r.description.slice(0,75)}</option>)}
    </select></label>
   {loading?<p className="text-steel-400 text-sm">Cargando conversación...</p>:<>
    {conversation?.ticket&&<div className="flex items-center gap-2 text-xs text-steel-300">
      Estado en BondiSupport: <span className="rounded-lg border border-steel-600 bg-steel-900 px-2 py-1 font-semibold">{statusLabel[conversation.ticket.status]||conversation.ticket.status}</span>
    </div>}
    <div className="max-h-80 overflow-y-auto space-y-3 rounded-xl bg-steel-900/50 border border-steel-700 p-3" aria-live="polite">
     {conversation?.messages.length ? conversation.messages.map((m:ChatMessage)=>{
      const isUser=m.author_role==='usuario';
      return <div key={m.id} className={`flex w-full ${isUser?'justify-start':'justify-end'}`}>
       <div className={`max-w-[85%] min-w-0 rounded-2xl border px-3 py-2 shadow-sm ${isUser?'rounded-bl-sm border-sky-500/40 bg-sky-500/15':'rounded-br-sm border-emerald-500/40 bg-emerald-500/15'}`}>
        <p className={`text-xs font-medium ${isUser?'text-sky-300':'text-emerald-300'}`}>
         {isUser?'Vos':m.author_name} · {new Date(m.created_at).toLocaleString('es-AR')}
        </p>
        <p className="mt-1 text-sm text-steel-100 whitespace-pre-wrap break-words">{m.body}</p>
       </div>
      </div>;
     }):<p className="text-sm text-steel-500">Sin mensajes todavía. Podés escribir tu consulta abajo.</p>}
    </div>
    {closed&&<div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 space-y-2">
      <p className="text-sm text-amber-100">Este ticket fue cerrado por soporte. Si el problema continúa, podés reabrirlo.</p>
      <textarea className="input w-full min-h-16" maxLength={1000} value={reopenReason}
        onChange={e=>setReopenReason(e.target.value)} placeholder="Explicá por qué necesitás reabrirlo..." aria-label="Motivo de reapertura"/>
      <button type="button" className="btn-primary" onClick={()=>void reopen()}
        disabled={reopening||reopenReason.trim().length<5}>{reopening?'Reabriendo...':'Reabrir ticket'}</button>
    </div>}
    {!closed&&<textarea className="input w-full min-h-20" value={text} onChange={e=>onText(e.target.value)}
     maxLength={3000} placeholder="Escribí un mensaje para soporte..." aria-label="Nuevo mensaje"/>}
    {!closed&&<div className="flex justify-end"><button type="button" className="btn-primary" disabled={sending||!text.trim()}
     onClick={()=>void send()}><Send size={15}/>{sending?'Enviando...':'Enviar mensaje'}</button></div>}
   </>}
  </>}
  {error&&<p className="text-sm text-red-300" role="alert">{error}</p>}
 </div>;
}
