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
 const send=async()=>{
  if(!selected||!text.trim()||sending)return;
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
    <div className="max-h-80 overflow-y-auto space-y-3 rounded-xl bg-steel-900/50 border border-steel-700 p-3" aria-live="polite">
     {conversation?.messages.length ? conversation.messages.map((m:ChatMessage)=><div key={m.id} className={`flex ${m.author_role==='usuario'?'justify-end':'justify-start'}`}>
      <div className="max-w-[90%] rounded-xl bg-steel-800 px-3 py-2 border border-steel-700">
       <p className="text-xs text-steel-400">{m.author_name} · {new Date(m.created_at).toLocaleString('es-AR')}</p>
       <p className="text-sm text-steel-100 whitespace-pre-wrap break-words">{m.body}</p>
      </div></div>):<p className="text-sm text-steel-500">Sin mensajes todavía. Podés escribir tu consulta abajo.</p>}
    </div>
    <textarea className="input w-full min-h-20" value={text} onChange={e=>onText(e.target.value)}
     maxLength={3000} placeholder="Escribí un mensaje para soporte..." aria-label="Nuevo mensaje"/>
    <div className="flex justify-end"><button type="button" className="btn-primary" disabled={sending||!text.trim()}
     onClick={()=>void send()}><Send size={15}/>{sending?'Enviando...':'Enviar mensaje'}</button></div>
   </>}
  </>}
  {error&&<p className="text-sm text-red-300" role="alert">{error}</p>}
 </div>;
}
