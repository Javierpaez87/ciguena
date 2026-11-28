// Central gate for service-role Netlify functions. Never trusts a role from the body.
// Public status is read fresh for every invocation; failures fail closed.
const verifiedActors = new WeakMap();
/** Server-internal header; never copies a browser-supplied actor header. */
export function maintenanceClientHeaders(event) {
  const actor = verifiedActors.get(event);
  return actor ? {'x-ciguena-maintenance-actor':actor} : {};
}
function config() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!/^https:\/\/[^/]+\.supabase\.co$/.test(url) || !key) throw new Error('maintenance_config_missing');
  return {url,key};
}
async function rpc(name, body, fetcher) {
  const {url,key}=config();
  const res=await fetcher(`${url}/rest/v1/rpc/${name}`, {
    method:'POST', headers:{apikey:key, ...(!key.startsWith('sb_secret_')?{Authorization:`Bearer ${key}`}:{ }), 'Content-Type':'application/json'},
    body:JSON.stringify(body), cache:'no-store', signal:AbortSignal.timeout(8000)
  });
  if(!res.ok) throw new Error('maintenance_rpc_failed');
  return res.json();
}
export async function maintenanceEnabled(fetcher=fetch) {
  const status=await rpc('get_platform_maintenance',{},fetcher);
  if(typeof status?.enabled!=='boolean') throw new Error('maintenance_status_invalid');
  return status.enabled;
}
const unavailable=()=>({statusCode:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Retry-After':'60','Access-Control-Allow-Origin':'*'},body:JSON.stringify({error:'Estamos realizando tareas de mantenimiento. Inténtelo nuevamente más tarde.',code:'MAINTENANCE_ACTIVE'})});
/** @param {any} event @param {'authorized'|'superadmin'|'public'} mode */
export async function maintenanceResponse(event,mode='authorized',fetcher=fetch) {
  if(event && typeof event==='object') verifiedActors.delete(event);
  if(event?.httpMethod==='OPTIONS') return null;
  try {
    if(!await maintenanceEnabled(fetcher)) return null;
    if(mode==='public') return unavailable();
    const headers=event?.headers||{};
    const authorization=Object.entries(headers).find(([name])=>name.toLowerCase()==='authorization')?.[1];
    if(typeof authorization!=='string'||!/^Bearer\s+\S+$/i.test(authorization)) return unavailable();
    const {url,key}=config();
    const identity=await fetcher(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:authorization},cache:'no-store',signal:AbortSignal.timeout(8000)});
    if(!identity.ok) return unavailable();
    const user=await identity.json();
    if(typeof user?.id!=='string'||!user.id) return unavailable();
    const allowed=await rpc('maintenance_actor_authorized',{p_auth_user_id:user.id,p_superadmin_only:mode==='superadmin'},fetcher);
    if(allowed!==true) return unavailable();
    verifiedActors.set(event,user.id);
    return null;
  } catch { return unavailable(); }
}
