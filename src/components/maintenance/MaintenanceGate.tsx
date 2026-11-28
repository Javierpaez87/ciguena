import { useState, useRef, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBranding } from '../../contexts/BrandingContext';
import { useMaintenance } from '../../contexts/MaintenanceContext';
import PublicBrandLockup from '../branding/PublicBrandLockup';
import { getTenantBrandTheme } from '../../lib/brandTheme';
import { AlertTriangle, Lock } from 'lucide-react';

function Surface({children}: {children: ReactNode}) {
  const {branding} = useBranding();
  const theme = getTenantBrandTheme(branding);
  return <main className="min-h-screen flex items-center justify-center p-6 bg-steel-950" style={{backgroundColor: theme.pageBackground}}>
    <section className="w-full max-w-lg rounded-2xl border brand-border bg-steel-900/90 p-8 sm:p-10 text-center space-y-6">
      <PublicBrandLockup centered compact logoSurface="neon" />
      {children}
    </section>
  </main>;
}
function MaintenanceNotice() {
  const {branding} = useBranding();
  const theme = getTenantBrandTheme(branding);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  return <Surface>
    <AlertTriangle size={36} className="mx-auto brand-text"/>
    <h1 className="text-2xl font-bold text-steel-50">Estamos realizando tareas de mantenimiento</h1>
    <p className="text-steel-300">Disculpe las molestias. Por favor, inténtelo nuevamente más tarde.</p>
    <div className="border-t brand-border pt-4">
      <button ref={trigger} type="button" className="text-sm font-semibold underline underline-offset-4 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" style={{color: theme.accentText}} onClick={()=>dialog.current?.showModal()} aria-haspopup="dialog">¿Estabas realizando un examen?</button>
    </div>
    <dialog ref={dialog} aria-labelledby="maintenance-exam-title" onClose={()=>trigger.current?.focus()} onClick={e=>{if(e.target===e.currentTarget) dialog.current?.close();}} className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border brand-border bg-steel-800 p-0 text-left text-steel-100 shadow-2xl backdrop:bg-black/70">
      <div className="p-6 sm:p-8 space-y-4">
        <h2 id="maintenance-exam-title" className="text-xl font-bold text-steel-50">¿Qué sucede con mi examen?</h2>
        <p className="text-sm text-steel-200">Las respuestas que hayas seleccionado se guardan durante un máximo de 48 horas en la misma pestaña del navegador. Podrás retomarlas cuando finalice el mantenimiento, siempre que mantengas la pestaña abierta, el navegador conserve el borrador y el examen no haya cambiado.</p>
        <p className="text-sm text-steel-200">Si no podés retomarlo dentro de ese plazo o el borrador ya no está disponible, podrás comenzar nuevamente desde cero, siempre que la capacitación siga habilitada.</p>
        <p className="text-sm font-semibold" style={{color: theme.accentText}}>Si el examen todavía no fue evaluado, la interrupción no consume un intento adicional. Los intentos anteriores se conservan.</p>
        <button type="button" className="btn-primary w-full justify-center" onClick={()=>dialog.current?.close()}>Entendido</button>
      </div>
    </dialog>
  </Surface>;
}
function AccessForm() {
  const {login} = useAuth();
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { const result = await login(email,password); if (result.error) setError(result.error); }
    catch { setError('No pudimos iniciar sesión. Inténtelo nuevamente.'); }
    finally { setBusy(false); }
  }
  return <Surface><Lock className="mx-auto brand-text" size={32}/><h1 className="text-xl font-bold text-steel-50">Acceso autorizado</h1><p className="text-sm text-steel-400">Exclusivo para cuentas autorizadas de mantenimiento.</p>
    <form onSubmit={submit} className="space-y-4 text-left">
      <label className="block text-sm text-steel-200">Correo electrónico<input className="input mt-1" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label className="block text-sm text-steel-200">Contraseña<input className="input mt-1" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
      {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
      <button className="btn-primary w-full justify-center" disabled={busy} type="submit">{busy?'Verificando...':'Ingresar'}</button>
    </form></Surface>;
}
export default function MaintenanceGate({children}: {children: ReactNode}) {
  const {sessionUser, logout, isGhostMode, stopGhostSession} = useAuth();
  const {isLoading: brandingLoading} = useBranding();
  const {status,error,refresh} = useMaintenance();
  const special = window.location.pathname.replace(/\/+$/, '') === '/maintenance-access';
  if (brandingLoading || !status) return <Surface><p className="text-steel-300" role="status">{error?'No pudimos verificar la disponibilidad de la plataforma.':'Verificando disponibilidad...'}</p>{error && <button className="btn-primary mx-auto" onClick={()=>void refresh()}>Reintentar</button>}</Surface>;
  if (special && !sessionUser) return <AccessForm/>;
  if (special && !status.allowed) return <Surface><h1 className="text-xl font-bold text-steel-50">Acceso no autorizado</h1><p className="text-steel-400">Esta cuenta no está habilitada para el acceso de mantenimiento.</p><button className="btn-primary mx-auto" onClick={()=>void logout()}>Cerrar sesión</button></Surface>;
  if (status.enabled && (!sessionUser || !status.allowed)) return <MaintenanceNotice/>;
  if (status.enabled && isGhostMode) return <Surface><p className="text-steel-300">Salga de Ghost View para continuar con el acceso autorizado.</p><button className="btn-primary mx-auto" onClick={stopGhostSession}>Volver a Superadmin</button></Surface>;
  return <>{status.enabled && <div role="status" className="fixed bottom-0 inset-x-0 z-[100] bg-amber-200 text-amber-950 text-center text-xs font-semibold py-2 px-4 pointer-events-none">Modo mantenimiento activo · Acceso autorizado</div>}{children}</>;
}
