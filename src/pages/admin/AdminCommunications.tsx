import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Filter,
  Mail,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  getOperationalRole,
  getWorkerDisplayName,
  mergeProfilesWithDirectory,
  normalizeWorkerValue,
  type EmployeeDirectoryRecord,
  type WorkerRecord,
} from '../../lib/workerRoster';
import Modal from '../../components/ui/Modal';

type TenantRow = { id: string; name: string; status?: string | null };
type TrainingRow = { id: string; title: string };
type TenantTrainingRow = { training_id: string; enabled?: boolean | null };
type AssignmentRow = {
  id: string;
  user_id: string;
  training_id: string;
  status?: string | null;
};
type CampaignRow = {
  id: string;
  tenant_id: string;
  subject: string;
  created_by_name?: string | null;
  created_by_email?: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: string;
  created_at: string;
  completed_at?: string | null;
  filters?: Record<string, unknown> | null;
};

type Props = {
  superAdmin?: boolean;
};

type AssignmentStatusFilter = 'all' | 'pending' | 'completed';

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => (value || '').trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'es', { sensitivity: 'base' })
  );
}

function normalizedStatus(worker: WorkerRecord) {
  return normalizeWorkerValue(worker.directory_status || worker.status || 'active') || 'active';
}

function isPendingAssignment(status?: string | null) {
  const normalized = normalizeWorkerValue(status);
  return ['not_started', 'in_progress', 'pending_test', 'failed'].includes(normalized);
}

function isCompletedAssignment(status?: string | null) {
  const normalized = normalizeWorkerValue(status);
  return ['passed', 'completed', 'certificate_issued'].includes(normalized);
}

function getFirstName(worker?: WorkerRecord | null) {
  return (
    worker?.first_name?.trim() ||
    getWorkerDisplayName(worker).trim().split(/\s+/)[0] ||
    'Usuario'
  );
}

function getLastName(worker?: WorkerRecord | null) {
  if (worker?.last_name?.trim()) return worker.last_name.trim();
  const parts = getWorkerDisplayName(worker).trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function renderVariables(
  template: string,
  worker: WorkerRecord | null,
  tenantName: string,
  trainingTitle: string
) {
  return template
    .replaceAll('{{nombre}}', getFirstName(worker))
    .replaceAll('{{apellido}}', getLastName(worker))
    .replaceAll('{{empresa}}', tenantName)
    .replaceAll('{{training}}', trainingTitle);
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function campaignStatusLabel(status: string) {
  if (status === 'sent') return 'Enviado';
  if (status === 'partial') return 'Parcial';
  if (status === 'failed') return 'Fallido';
  return 'Enviando';
}

function campaignStatusClass(status: string) {
  if (status === 'sent') return 'badge badge-success';
  if (status === 'partial') return 'badge badge-warning';
  if (status === 'failed') return 'badge badge-danger';
  return 'badge badge-info';
}

export default function AdminCommunications({ superAdmin = false }: Props) {
  const { user } = useAuth();
  const fixedTenantId = superAdmin ? '' : user?.tenant_id || '';

  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState(fixedTenantId);
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
  const [trainings, setTrainings] = useState<TrainingRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [history, setHistory] = useState<CampaignRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [trainingFilter, setTrainingFilter] = useState('all');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<AssignmentStatusFilter>('all');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [includePlatformButton, setIncludePlatformButton] = useState(true);
  const [testRecipient, setTestRecipient] = useState(user?.email || '');
  const [sendingTest, setSendingTest] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const activeTenantId = superAdmin ? selectedTenantId : fixedTenantId;
  const selectedTenant = tenants.find((tenant) => tenant.id === activeTenantId) || null;
  const tenantName = selectedTenant?.name || (superAdmin ? 'Tenant' : 'Tu empresa');

  useEffect(() => {
    if (!superAdmin) {
      setSelectedTenantId(fixedTenantId);
      return;
    }

    let mounted = true;
    supabase
      .from('tenants')
      .select('id, name, status')
      .order('name')
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setErrorMessage(`No pudimos cargar los tenants: ${error.message}`);
          return;
        }
        const rows = (data ?? []) as TenantRow[];
        setTenants(rows);
        setSelectedTenantId((current) => current || rows.find((row) => row.status !== 'inactive')?.id || rows[0]?.id || '');
      });

    return () => {
      mounted = false;
    };
  }, [fixedTenantId, superAdmin]);

  useEffect(() => {
    if (superAdmin) return;
    if (!fixedTenantId) return;

    supabase
      .from('tenants')
      .select('id, name, status')
      .eq('id', fixedTenantId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setTenants([data as TenantRow]);
      });
  }, [fixedTenantId, superAdmin]);

  async function loadData() {
    if (!activeTenantId) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const [profilesResult, directoryResult, tenantTrainingsResult, trainingsResult, assignmentsResult, historyResult] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('tenant_id', activeTenantId),
          supabase.from('employee_directory').select('*').eq('tenant_id', activeTenantId),
          supabase.from('tenant_trainings').select('training_id, enabled').eq('tenant_id', activeTenantId),
          supabase.from('trainings').select('id, title').order('title'),
          supabase.from('training_assignments').select('id, user_id, training_id, status').eq('tenant_id', activeTenantId),
          supabase
            .from('bulk_email_campaigns')
            .select('id, tenant_id, subject, created_by_name, created_by_email, recipient_count, sent_count, failed_count, status, created_at, completed_at, filters')
            .eq('tenant_id', activeTenantId)
            .order('created_at', { ascending: false })
            .limit(20),
        ]);

      if (profilesResult.error) throw profilesResult.error;
      if (directoryResult.error) throw directoryResult.error;
      if (tenantTrainingsResult.error) throw tenantTrainingsResult.error;
      if (trainingsResult.error) throw trainingsResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;

      const mergedWorkers = mergeProfilesWithDirectory(
        (profilesResult.data ?? []) as WorkerRecord[],
        (directoryResult.data ?? []) as EmployeeDirectoryRecord[]
      ).filter((worker) => Boolean(worker.email?.trim()));

      const enabledTrainingIds = new Set(
        ((tenantTrainingsResult.data ?? []) as TenantTrainingRow[])
          .filter((row) => row.enabled !== false)
          .map((row) => row.training_id)
      );

      const loadedTrainings = ((trainingsResult.data ?? []) as TrainingRow[]).filter((training) =>
        enabledTrainingIds.has(training.id)
      );

      setWorkers(mergedWorkers);
      setTrainings(loadedTrainings);
      setAssignments((assignmentsResult.data ?? []) as AssignmentRow[]);
      setHistory(historyResult.error ? [] : ((historyResult.data ?? []) as CampaignRow[]));
      setSelectedEmails(new Set());
    } catch (error) {
      console.error('Error loading communications:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No pudimos cargar la información para Comunicaciones.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!activeTenantId) return;
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTenantId]);

  const areas = useMemo(() => uniqueSorted(workers.map((worker) => worker.area)), [workers]);
  const roles = useMemo(() => uniqueSorted(workers.map((worker) => getOperationalRole(worker))), [workers]);
  const userStatuses = useMemo(() => uniqueSorted(workers.map(normalizedStatus)), [workers]);

  const trainingTitle = useMemo(
    () => trainings.find((training) => training.id === trainingFilter)?.title || '',
    [trainingFilter, trainings]
  );

  const assignmentsByUser = useMemo(() => {
    const map = new Map<string, AssignmentRow[]>();
    assignments.forEach((assignment) => {
      const list = map.get(assignment.user_id) ?? [];
      list.push(assignment);
      map.set(assignment.user_id, list);
    });
    return map;
  }, [assignments]);

  const filteredWorkers = useMemo(() => {
    const q = normalizeWorkerValue(search);

    return workers.filter((worker) => {
      const email = normalizeWorkerValue(worker.email);
      const displayName = normalizeWorkerValue(getWorkerDisplayName(worker));
      const role = getOperationalRole(worker);
      const status = normalizedStatus(worker);

      if (q && !`${displayName} ${email} ${normalizeWorkerValue(role)} ${normalizeWorkerValue(worker.area)}`.includes(q)) {
        return false;
      }
      if (areaFilter !== 'all' && (worker.area || '').trim() !== areaFilter) return false;
      if (roleFilter !== 'all' && role !== roleFilter) return false;
      if (userStatusFilter !== 'all' && status !== userStatusFilter) return false;

      if (trainingFilter !== 'all') {
        if (String(worker.id).startsWith('directory:')) return false;
        const userAssignments = assignmentsByUser.get(worker.id) ?? [];
        const matching = userAssignments.filter((assignment) => assignment.training_id === trainingFilter);
        if (matching.length === 0) return false;
        if (assignmentStatusFilter === 'pending' && !matching.some((assignment) => isPendingAssignment(assignment.status))) return false;
        if (assignmentStatusFilter === 'completed' && !matching.some((assignment) => isCompletedAssignment(assignment.status))) return false;
      }

      return true;
    });
  }, [
    workers,
    search,
    areaFilter,
    roleFilter,
    userStatusFilter,
    trainingFilter,
    assignmentStatusFilter,
    assignmentsByUser,
  ]);

  const selectedWorkers = useMemo(() => {
    const selected = selectedEmails;
    return workers.filter((worker) => selected.has(normalizeWorkerValue(worker.email)));
  }, [selectedEmails, workers]);

  const previewWorker = selectedWorkers[0] || filteredWorkers[0] || workers[0] || null;
  const previewSubject = renderVariables(subject || 'Asunto del mensaje', previewWorker, tenantName, trainingTitle);
  const previewBody = renderVariables(
    body || 'Hola {{nombre}},\n\nEste es un ejemplo de cómo se verá tu comunicación.',
    previewWorker,
    tenantName,
    trainingTitle
  );

  const allFilteredSelected =
    filteredWorkers.length > 0 &&
    filteredWorkers.every((worker) => selectedEmails.has(normalizeWorkerValue(worker.email)));

  function toggleWorker(emailValue?: string | null) {
    const email = normalizeWorkerValue(emailValue);
    if (!email) return;
    setSelectedEmails((current) => {
      const next = new Set(current);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  function toggleFilteredSelection() {
    setSelectedEmails((current) => {
      const next = new Set(current);
      if (allFilteredSelected) {
        filteredWorkers.forEach((worker) => next.delete(normalizeWorkerValue(worker.email)));
      } else {
        filteredWorkers.forEach((worker) => {
          const email = normalizeWorkerValue(worker.email);
          if (email) next.add(email);
        });
      }
      return next;
    });
  }

  function resetFilters() {
    setSearch('');
    setAreaFilter('all');
    setRoleFilter('all');
    setUserStatusFilter('all');
    setTrainingFilter('all');
    setAssignmentStatusFilter('all');
  }

  function insertVariable(variable: string) {
    setBody((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}${variable}`);
  }

  function getFilterSummary() {
    return {
      search: search || null,
      area: areaFilter === 'all' ? null : areaFilter,
      role: roleFilter === 'all' ? null : roleFilter,
      user_status: userStatusFilter === 'all' ? null : userStatusFilter,
      training_id: trainingFilter === 'all' ? null : trainingFilter,
      training_title: trainingTitle || null,
      assignment_status: trainingFilter === 'all' || assignmentStatusFilter === 'all' ? null : assignmentStatusFilter,
      selected_count: selectedEmails.size,
    };
  }

  async function callBulkEmail(payload: Record<string, unknown>) {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error('Tu sesión venció. Volvé a ingresar antes de enviar emails.');

    const response = await fetch('/.netlify/functions/send-bulk-communication', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || 'No pudimos enviar la comunicación.');
    return result;
  }

  async function sendTest() {
    if (!activeTenantId) return;
    if (!subject.trim() || !body.trim()) {
      setErrorMessage('Completá asunto y cuerpo antes de enviar una prueba.');
      return;
    }
    if (!testRecipient.trim()) {
      setErrorMessage('Ingresá un destinatario de prueba.');
      return;
    }

    setSendingTest(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await callBulkEmail({
        mode: 'test',
        tenantId: activeTenantId,
        subject,
        body,
        testRecipient,
        sampleRecipientEmail: previewWorker?.email || null,
        trainingTitle,
        includePlatformButton,
        filters: getFilterSummary(),
      });
      setSuccessMessage(`Email de prueba enviado a ${testRecipient.trim()}. Revisalo antes del envío final.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No pudimos enviar la prueba.');
    } finally {
      setSendingTest(false);
    }
  }

  function openSendConfirmation() {
    if (selectedEmails.size === 0) {
      setErrorMessage('Seleccioná al menos un destinatario.');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setErrorMessage('Completá asunto y cuerpo antes de enviar.');
      return;
    }
    setErrorMessage(null);
    setConfirmText('');
    setShowConfirm(true);
  }

  async function confirmSend() {
    if (!activeTenantId || confirmText.trim().toUpperCase() !== 'ENVIAR') return;

    setSending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await callBulkEmail({
        mode: 'send',
        tenantId: activeTenantId,
        recipientEmails: Array.from(selectedEmails),
        subject,
        body,
        trainingTitle,
        includePlatformButton,
        filters: getFilterSummary(),
      });

      setShowConfirm(false);
      setConfirmText('');
      setSuccessMessage(
        result.failed > 0
          ? `Envío terminado: ${result.sent} enviados y ${result.failed} fallidos.`
          : `Comunicación enviada correctamente a ${result.sent} persona${result.sent === 1 ? '' : 's'}.`
      );
      setSelectedEmails(new Set());
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No pudimos completar el envío.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-steel-100 font-semibold">
              <Mail size={20} className="brand-text" />
              Comunicaciones masivas
            </div>
            <p className="text-sm text-steel-400 mt-2 max-w-3xl">
              Segmentá trabajadores, enviá una prueba y confirmá el envío final. Admin solo puede comunicarse con su propia empresa; Superadmin elige un tenant por vez.
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100 max-w-md">
            <div className="flex gap-2">
              <ShieldCheck size={16} className="shrink-0 mt-0.5" />
              <span>Antes del envío final siempre revisá la cantidad de destinatarios y usá “Enviar prueba”.</span>
            </div>
          </div>
        </div>

        {superAdmin && (
          <label className="block mt-5 max-w-lg">
            <span className="label">Tenant</span>
            <select
              className="select"
              value={selectedTenantId}
              onChange={(event) => setSelectedTenantId(event.target.value)}
              disabled={loading || sending}
            >
              <option value="">Seleccionar tenant...</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
              ))}
            </select>
          </label>
        )}
      </section>

      {errorMessage && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 flex gap-3">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200 flex gap-3">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <section className="card space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-steel-100 flex items-center gap-2"><Filter size={17} /> 1. Destinatarios</h3>
            <p className="text-xs text-steel-500 mt-1">Filtrá primero y luego seleccioná exactamente quiénes recibirán el email.</p>
          </div>
          <button className="btn-ghost" onClick={() => void loadData()} disabled={loading || !activeTenantId}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <div className="xl:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-3 text-steel-500" />
            <input className="input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nombre, email, rol..." />
          </div>
          <select className="select" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
            <option value="all">Todas las áreas</option>
            {areas.map((area) => <option key={area} value={area}>{area}</option>)}
          </select>
          <select className="select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">Todos los roles</option>
            {roles.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
          <select className="select" value={userStatusFilter} onChange={(e) => setUserStatusFilter(e.target.value)}>
            <option value="all">Todos los estados</option>
            {userStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <button className="btn-ghost justify-center" onClick={resetFilters}>Limpiar filtros</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border border-steel-700 bg-steel-900/40 p-4">
          <label>
            <span className="label">Training asignado</span>
            <select
              className="select"
              value={trainingFilter}
              onChange={(e) => {
                setTrainingFilter(e.target.value);
                if (e.target.value === 'all') setAssignmentStatusFilter('all');
              }}
            >
              <option value="all">No filtrar por training</option>
              {trainings.map((training) => <option key={training.id} value={training.id}>{training.title}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Estado del training</span>
            <select
              className="select"
              value={assignmentStatusFilter}
              onChange={(e) => setAssignmentStatusFilter(e.target.value as AssignmentStatusFilter)}
              disabled={trainingFilter === 'all'}
            >
              <option value="all">Cualquier estado</option>
              <option value="pending">Pendiente / en curso</option>
              <option value="completed">Completado</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="text-sm text-steel-300">
            <strong>{filteredWorkers.length}</strong> visibles · <strong className="brand-text">{selectedEmails.size}</strong> seleccionados
          </div>
          <button type="button" className="btn-brand-outline" onClick={toggleFilteredSelection} disabled={filteredWorkers.length === 0}>
            <Users size={16} /> {allFilteredSelected ? 'Quitar filtrados' : `Seleccionar filtrados (${filteredWorkers.length})`}
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-steel-700 max-h-[370px] overflow-y-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-steel-900 sticky top-0 z-10">
              <tr>
                <th className="table-header w-12">Sel.</th>
                <th className="table-header">Trabajador</th>
                <th className="table-header">Email</th>
                <th className="table-header">Rol</th>
                <th className="table-header">Área</th>
                <th className="table-header">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkers.map((worker) => {
                const email = normalizeWorkerValue(worker.email);
                const checked = selectedEmails.has(email);
                return (
                  <tr key={`${worker.id}-${email}`} className="table-row cursor-pointer" onClick={() => toggleWorker(email)}>
                    <td className="table-cell" onClick={(event) => event.stopPropagation()}>
                      <input type="checkbox" checked={checked} onChange={() => toggleWorker(email)} className="h-4 w-4 accent-cyan-400" />
                    </td>
                    <td className="table-cell font-medium text-steel-100">{getWorkerDisplayName(worker)}</td>
                    <td className="table-cell text-steel-400">{worker.email}</td>
                    <td className="table-cell">{getOperationalRole(worker)}</td>
                    <td className="table-cell">{worker.area || '-'}</td>
                    <td className="table-cell"><span className="badge badge-neutral">{normalizedStatus(worker)}</span></td>
                  </tr>
                );
              })}
              {!loading && filteredWorkers.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-sm text-steel-500">No hay trabajadores para estos filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card space-y-5">
        <div>
          <h3 className="font-semibold text-steel-100">2. Mensaje</h3>
          <p className="text-xs text-steel-500 mt-1">Las variables se personalizan individualmente al enviar.</p>
        </div>

        <label className="block">
          <span className="label">Asunto</span>
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={180} placeholder="Ej.: Información importante sobre capacitaciones" />
        </label>

        <div>
          <span className="label">Variables disponibles</span>
          <div className="flex flex-wrap gap-2">
            {['{{nombre}}', '{{apellido}}', '{{empresa}}', '{{training}}'].map((variable) => (
              <button key={variable} type="button" className="rounded-lg border border-steel-600 bg-steel-900 px-2.5 py-1.5 text-xs text-steel-300 hover:border-steel-500" onClick={() => insertVariable(variable)}>
                {variable}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="label">Cuerpo del email</span>
          <textarea
            className="input min-h-[180px] resize-y"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={20000}
            placeholder={'Hola {{nombre}},\n\nEscribí aquí tu comunicación...'}
          />
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-steel-700 bg-steel-900/40 p-4 cursor-pointer">
          <input type="checkbox" checked={includePlatformButton} onChange={(e) => setIncludePlatformButton(e.target.checked)} className="mt-1 h-4 w-4 accent-cyan-400" />
          <div>
            <div className="text-sm font-medium text-steel-100">Incluir botón para ingresar a la plataforma</div>
            <div className="text-xs text-steel-500 mt-1">Usa automáticamente el dominio y branding del tenant.</div>
          </div>
        </label>

        <div className="flex flex-wrap gap-3">
          <button className="btn-brand-outline" type="button" onClick={() => setShowPreview(true)}>
            <Eye size={16} /> Vista previa
          </button>
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <h3 className="font-semibold text-steel-100">3. Probar y enviar</h3>
          <p className="text-xs text-steel-500 mt-1">La prueba nunca se envía a la selección real.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end">
          <label>
            <span className="label">Email de prueba</span>
            <input type="email" className="input" value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} placeholder="tu-email@dominio.com" />
          </label>
          <button className="btn-secondary justify-center" type="button" onClick={() => void sendTest()} disabled={sendingTest || sending || !activeTenantId}>
            {sendingTest ? <RefreshCw size={16} className="animate-spin" /> : <Mail size={16} />}
            {sendingTest ? 'Enviando prueba...' : 'Enviar prueba'}
          </button>
        </div>

        <div className="rounded-xl border border-steel-700 bg-steel-900/40 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-sm text-steel-200">Envío final</div>
            <div className="text-2xl font-bold text-steel-50 mt-1">{selectedEmails.size} destinatarios</div>
            <div className="text-xs text-steel-500 mt-1">No se envía hasta completar una confirmación adicional.</div>
          </div>
          <button className="btn-primary justify-center" type="button" onClick={openSendConfirmation} disabled={sending || selectedEmails.size === 0}>
            <Send size={17} /> Preparar envío final
          </button>
        </div>
      </section>

      <section className="card">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold text-steel-100">Historial reciente</h3>
            <p className="text-xs text-steel-500 mt-1">Últimas 20 comunicaciones de este tenant.</p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-steel-700">
          <table className="w-full min-w-[760px]">
            <thead className="bg-steel-900">
              <tr>
                <th className="table-header">Fecha</th>
                <th className="table-header">Asunto</th>
                <th className="table-header">Enviado por</th>
                <th className="table-header">Destinatarios</th>
                <th className="table-header">Enviados</th>
                <th className="table-header">Fallidos</th>
                <th className="table-header">Estado</th>
              </tr>
            </thead>
            <tbody>
              {history.map((campaign) => (
                <tr key={campaign.id} className="table-row">
                  <td className="table-cell text-steel-400">{formatDate(campaign.created_at)}</td>
                  <td className="table-cell font-medium text-steel-100 max-w-[320px] truncate" title={campaign.subject}>{campaign.subject}</td>
                  <td className="table-cell text-steel-400">
                    <div>{campaign.created_by_name || '-'}</div>
                    {campaign.created_by_email && <div className="text-xs text-steel-600 mt-0.5">{campaign.created_by_email}</div>}
                  </td>
                  <td className="table-cell">{campaign.recipient_count}</td>
                  <td className="table-cell text-emerald-300">{campaign.sent_count}</td>
                  <td className="table-cell text-red-300">{campaign.failed_count}</td>
                  <td className="table-cell"><span className={campaignStatusClass(campaign.status)}>{campaignStatusLabel(campaign.status)}</span></td>
                </tr>
              ))}
              {!loading && history.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-sm text-steel-500">Todavía no hay comunicaciones registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Vista previa de la comunicación" size="lg">
        <div className="space-y-4">
          <div className="rounded-xl border border-steel-700 bg-steel-900 p-5">
            <div className="text-xs uppercase tracking-wider text-steel-500 mb-2">Asunto</div>
            <div className="font-semibold text-steel-100">{previewSubject}</div>
          </div>
          <div className="rounded-xl border border-steel-700 bg-steel-900 p-5">
            <div className="text-xs uppercase tracking-wider text-steel-500 mb-3">Cuerpo · ejemplo con {getWorkerDisplayName(previewWorker)}</div>
            <div className="text-sm leading-relaxed text-steel-200 whitespace-pre-wrap">{previewBody}</div>
            {includePlatformButton && <div className="mt-5 inline-flex rounded-lg brand-bg px-4 py-2 text-sm font-semibold">Ingresar a la plataforma</div>}
          </div>
          <p className="text-xs text-steel-500">El email real incorpora logo, colores, remitente y footer del tenant.</p>
        </div>
      </Modal>

      <Modal
        open={showConfirm}
        onClose={() => { if (!sending) setShowConfirm(false); }}
        title="Confirmar envío masivo"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn-ghost" onClick={() => setShowConfirm(false)} disabled={sending}>Cancelar</button>
            <button className="btn-primary" onClick={() => void confirmSend()} disabled={sending || confirmText.trim().toUpperCase() !== 'ENVIAR'}>
              {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              {sending ? 'Enviando...' : `Enviar a ${selectedEmails.size}`}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4">
            <div className="text-sm font-semibold text-red-100">Este email será enviado a {selectedEmails.size} persona{selectedEmails.size === 1 ? '' : 's'}.</div>
            <div className="text-xs text-red-200/70 mt-1">Tenant: {tenantName}. Esta acción no puede deshacerse.</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-steel-500">Asunto</div>
            <div className="mt-1 text-sm text-steel-100">{previewSubject}</div>
          </div>
          <label>
            <span className="label">Escribí ENVIAR para confirmar</span>
            <input className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
          </label>
        </div>
      </Modal>
    </div>
  );
}
