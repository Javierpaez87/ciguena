import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FlaskConical,
  MailCheck,
  RefreshCw,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type TenantRow = {
  id: string;
  name: string;
  status?: string | null;
};

type TemplateDefinition = {
  key: string;
  label: string;
  description: string;
};

const TEMPLATES: TemplateDefinition[] = [
  { key: 'invitation', label: 'Invitación de trabajador', description: 'Primer acceso desde nómina / invitación.' },
  { key: 'registration_auto', label: 'Registro autoaprobado', description: 'Usuario encontrado en nómina y habilitado automáticamente.' },
  { key: 'registration_pending_worker', label: 'Registro pendiente · Worker', description: 'Registro que requiere aprobación del administrador.' },
  { key: 'registration_pending_admin', label: 'Registro pendiente · Admin', description: 'Solicitud de acceso administrativo pendiente.' },
  { key: 'registration_internal', label: 'Aviso interno de registro', description: 'Notificación operativa enviada por un nuevo registro.' },
  { key: 'approval', label: 'Cuenta aprobada', description: 'Confirmación posterior a una aprobación manual.' },
  { key: 'training_assignment', label: 'Training asignado', description: 'Nueva asignación de capacitación.' },
  { key: 'training_reminder', label: 'Reminder de training', description: 'Recordatorio de capacitación pendiente.' },
  { key: 'training_unassignment', label: 'Training desasignado', description: 'Aviso por desasignación.' },
  { key: 'training_reassignment', label: 'Training reasignado', description: 'Aviso por reasignación.' },
  { key: 'live_assigned', label: 'Capacitación en vivo asignada', description: 'Invitación a una capacitación sincrónica.' },
  { key: 'live_cancelled', label: 'Capacitación en vivo cancelada', description: 'Aviso de cancelación de capacitación sincrónica.' },
];

type AuditResponse = {
  ok?: boolean;
  tenant?: { id: string; name: string };
  brandName?: string;
  from?: string;
  recipient?: string;
  sent?: number;
  failed?: number;
  templates?: Array<{
    key: string;
    label: string;
    subject: string;
    providerId?: string | null;
  }>;
  providerErrors?: unknown[];
  note?: string;
  error?: string;
};

export default function SaEmailQa() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>(TEMPLATES.map((item) => item.key));
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResponse | null>(null);

  async function loadTenants() {
    setLoadingTenants(true);
    setError(null);

    const { data, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, status')
      .order('name', { ascending: true });

    if (tenantsError) {
      console.error('Error loading tenants for email QA:', tenantsError);
      setError('No pudimos cargar los tenants.');
      setLoadingTenants(false);
      return;
    }

    const rows = (data ?? []) as TenantRow[];
    setTenants(rows);
    setTenantId((current) => current || rows[0]?.id || '');
    setLoadingTenants(false);
  }

  useEffect(() => {
    loadTenants();
  }, []);

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === tenantId) ?? null,
    [tenants, tenantId],
  );

  const allSelected = selectedKeys.length === TEMPLATES.length;

  function toggleTemplate(key: string) {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  function toggleAll() {
    setSelectedKeys(allSelected ? [] : TEMPLATES.map((item) => item.key));
  }

  async function sendSuite(keys: string[]) {
    const cleanRecipient = recipient.trim().toLowerCase();

    if (!tenantId) {
      setError('Seleccioná un tenant.');
      return;
    }

    if (!cleanRecipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanRecipient)) {
      setError('Ingresá un email de prueba válido.');
      return;
    }

    if (keys.length === 0) {
      setError('Seleccioná al menos un template.');
      return;
    }

    setSending(true);
    setError(null);
    setResult(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Tu sesión venció. Volvé a iniciar sesión.');
      }

      const response = await fetch('/.netlify/functions/send-email-audit-suite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tenantId,
          recipient: cleanRecipient,
          templateKeys: keys,
        }),
      });

      const body = (await response.json().catch(() => null)) as AuditResponse | null;

      if (!response.ok || !body?.ok) {
        throw new Error(body?.error || 'No pudimos enviar la suite de auditoría.');
      }

      setResult(body);
    } catch (sendError) {
      console.error('Error sending email QA suite:', sendError);
      setError(
        sendError instanceof Error
          ? sendError.message
          : 'No pudimos enviar la suite de auditoría.',
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-steel-800 border border-steel-700 rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-300 text-sm font-semibold mb-2">
              <FlaskConical size={17} />
              QA Email Audit
            </div>
            <h2 className="text-lg font-bold text-steel-50">Auditar todos los emails en minutos</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-steel-400">
              Elegí un tenant y un único destinatario controlado. La herramienta genera los templates reales con datos mock y los envía solamente a esa casilla.
            </p>
          </div>

          <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-xs leading-relaxed text-amber-100 max-w-sm">
            <div className="flex gap-2">
              <ShieldAlert size={17} className="flex-shrink-0 mt-0.5" />
              <div>
                <strong>Solo QA + Superadmin.</strong><br />
                El endpoint queda bloqueado en producción aunque esta pantalla llegara a desplegarse allí.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-steel-800 border border-steel-700 rounded-2xl p-5 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <label className="space-y-2">
            <span className="text-sm font-medium text-steel-200">Tenant a auditar</span>
            <div className="flex gap-2">
              <select
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
                disabled={loadingTenants || sending}
                className="input w-full"
              >
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-steel-600 px-3 text-steel-300 hover:bg-steel-700 disabled:opacity-50"
                onClick={loadTenants}
                disabled={loadingTenants || sending}
                title="Actualizar tenants"
              >
                <RefreshCw size={16} className={loadingTenants ? 'animate-spin' : ''} />
              </button>
            </div>
            {selectedTenant && (
              <span className="text-xs text-steel-500">Branding real del tenant: {selectedTenant.name}</span>
            )}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-steel-200">Único destinatario de prueba</span>
            <input
              type="email"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="tu-alias-qa@dominio.com"
              disabled={sending}
              className="input w-full"
            />
            <span className="text-xs text-steel-500">
              Ningún trabajador del tenant recibe estos emails: todos se redirigen a esta única casilla.
            </span>
          </label>
        </div>

        <div className="border-t border-steel-700 pt-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-steel-100">Templates de la app / Resend</h3>
              <p className="text-xs text-steel-500 mt-1">Seleccionados: {selectedKeys.length} de {TEMPLATES.length}</p>
            </div>
            <button
              type="button"
              onClick={toggleAll}
              disabled={sending}
              className="text-sm text-cyan-300 hover:text-cyan-200 disabled:opacity-50"
            >
              {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {TEMPLATES.map((template) => {
              const checked = selectedKeys.includes(template.key);
              return (
                <label
                  key={template.key}
                  className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                    checked
                      ? 'border-cyan-400/35 bg-cyan-400/10'
                      : 'border-steel-700 bg-steel-900/50 hover:border-steel-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTemplate(template.key)}
                      disabled={sending}
                      className="mt-1 h-4 w-4 accent-cyan-400"
                    />
                    <div>
                      <div className="text-sm font-semibold text-steel-100">{template.label}</div>
                      <div className="mt-1 text-xs leading-relaxed text-steel-500">{template.description}</div>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="button"
            className="btn-primary justify-center"
            onClick={() => void sendSuite(selectedKeys)}
            disabled={sending || selectedKeys.length === 0}
          >
            {sending ? <RefreshCw size={17} className="animate-spin" /> : <Send size={17} />}
            {sending ? 'Enviando...' : `Enviar seleccionados (${selectedKeys.length})`}
          </button>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/15 disabled:opacity-50"
            onClick={() => void sendSuite(TEMPLATES.map((item) => item.key))}
            disabled={sending}
          >
            <MailCheck size={17} />
            Enviar suite completa ({TEMPLATES.length})
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {result?.ok && (
        <section className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={21} className="text-emerald-300 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-emerald-100">Suite enviada</h3>
              <p className="mt-1 text-sm text-emerald-100/80">
                {result.sent ?? 0} emails enviados a <strong>{result.recipient}</strong>
                {(result.failed ?? 0) > 0 ? ` · ${result.failed} fallidos` : ''}.
              </p>
              <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-2 text-xs text-steel-300">
                <div className="rounded-lg bg-steel-950/40 px-3 py-2 break-all"><strong>Sender:</strong> {result.from}</div>
                <div className="rounded-lg bg-steel-950/40 px-3 py-2"><strong>Tenant:</strong> {result.tenant?.name}</div>
              </div>

              <div className="mt-4 space-y-2">
                {result.templates?.map((template, index) => (
                  <div key={`${template.key}-${index}`} className="rounded-lg border border-emerald-400/15 bg-steel-950/30 px-3 py-2 text-xs">
                    <span className="font-semibold text-steel-100">{template.label}</span>
                    <span className="text-steel-500"> · {template.subject}</span>
                  </div>
                ))}
              </div>

              {result.note && (
                <p className="mt-4 text-xs leading-relaxed text-amber-100/85">
                  {result.note}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-steel-700 bg-steel-800 p-5">
        <h3 className="font-semibold text-steel-100">Supabase Auth · chequeo separado</h3>
        <p className="mt-2 text-sm leading-relaxed text-steel-400">
          La confirmación de email y la recuperación de contraseña no salen de nuestros templates de Resend: las genera Supabase Auth. Para completar la auditoría, probá una creación de cuenta QA y un “Olvidé mi contraseña” con el mismo alias.
        </p>
      </section>
    </div>
  );
}
