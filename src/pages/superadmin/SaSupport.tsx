import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Image as ImageIcon,
  LifeBuoy,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';

type SupportRequestType = 'problem' | 'suggestion';
type SupportPriority = 'urgent' | 'high' | 'medium' | 'low';
type SupportStatus = 'new' | 'in_review' | 'resolved' | 'closed';
type SupportSource = 'platform' | 'login' | 'register';

type SupportRequest = {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  auth_user_id: string | null;
  request_type: SupportRequestType;
  priority: SupportPriority;
  source: SupportSource;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  description: string;
  attachment_path: string | null;
  attachment_mime_type: string | null;
  attachment_original_name: string | null;
  attachment_original_size: number | null;
  attachment_compressed_size: number | null;
  status: SupportStatus;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  tenant_name: string | null;
};

type ManageSupportResult = {
  ok?: boolean;
  requests?: SupportRequest[];
  request?: Pick<SupportRequest, 'id' | 'status' | 'updated_at'>;
  signedUrl?: string;
  expiresIn?: number;
  error?: string;
};

const STATUS_OPTIONS: Array<{ value: SupportStatus; label: string }> = [
  { value: 'new', label: 'Nuevo' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'resolved', label: 'Resuelto' },
  { value: 'closed', label: 'Cerrado' },
];

const PRIORITY_ORDER: Record<SupportPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function getTypeLabel(type: SupportRequestType) {
  return type === 'problem' ? 'Problema' : 'Sugerencia';
}

function getPriorityLabel(priority: SupportPriority) {
  if (priority === 'urgent') return 'Urgente';
  if (priority === 'high') return 'Alta';
  if (priority === 'medium') return 'Media';
  return 'Baja';
}

function getStatusLabel(status: SupportStatus) {
  return STATUS_OPTIONS.find(option => option.value === status)?.label ?? status;
}

function getSourceLabel(source: SupportSource) {
  if (source === 'login') return 'Login';
  if (source === 'register') return 'Registro';
  return 'Plataforma';
}

function getPriorityClass(priority: SupportPriority) {
  if (priority === 'urgent') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (priority === 'high') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  if (priority === 'medium') return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
  return 'border-steel-600 bg-steel-700/60 text-steel-300';
}

function getStatusClass(status: SupportStatus) {
  if (status === 'new') return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
  if (status === 'in_review') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  if (status === 'resolved') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  return 'border-steel-600 bg-steel-700/60 text-steel-300';
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function callSupportAdminApi(payload: Record<string, unknown>) {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error('La sesión de Superadmin no está disponible. Volvé a iniciar sesión.');
  }

  const response = await fetch('/.netlify/functions/manage-support-request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({})) as ManageSupportResult;

  if (!response.ok) {
    throw new Error(result.error || 'No pudimos completar la operación de soporte.');
  }

  return result;
}

export default function SaSupport() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tenantFilter, setTenantFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [statusDraft, setStatusDraft] = useState<SupportStatus>('new');
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');

  const loadRequests = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await callSupportAdminApi({ action: 'list' });
      const loadedRequests = Array.isArray(result.requests) ? result.requests : [];
      setRequests(loadedRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar los reportes de soporte.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  useEffect(() => {
    if (!selectedRequest) {
      setAttachmentUrl('');
      setAttachmentError('');
      setAttachmentLoading(false);
      return;
    }

    setStatusDraft(selectedRequest.status);
    setStatusError('');
    setAttachmentUrl('');
    setAttachmentError('');

    if (!selectedRequest.attachment_path) {
      setAttachmentLoading(false);
      return;
    }

    let cancelled = false;
    setAttachmentLoading(true);

    callSupportAdminApi({
      action: 'get_attachment_url',
      requestId: selectedRequest.id,
    })
      .then(result => {
        if (cancelled) return;
        if (result.signedUrl) {
          setAttachmentUrl(result.signedUrl);
        } else {
          setAttachmentError('No pudimos generar el acceso temporal a la captura.');
        }
      })
      .catch(err => {
        if (cancelled) return;
        setAttachmentError(err instanceof Error ? err.message : 'No pudimos cargar la captura.');
      })
      .finally(() => {
        if (!cancelled) setAttachmentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRequest?.id, selectedRequest?.attachment_path]);

  const tenants = useMemo(() => {
    const map = new Map<string, string>();

    requests.forEach(request => {
      if (request.tenant_id) {
        map.set(request.tenant_id, request.tenant_name || 'Empresa sin nombre');
      }
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return requests
      .filter(request =>
        tenantFilter === 'all'
        || (tenantFilter === 'unassigned' ? !request.tenant_id : request.tenant_id === tenantFilter)
      )
      .filter(request => typeFilter === 'all' || request.request_type === typeFilter)
      .filter(request => priorityFilter === 'all' || request.priority === priorityFilter)
      .filter(request => statusFilter === 'all' || request.status === statusFilter)
      .filter(request => {
        if (!normalizedSearch) return true;
        return [
          request.contact_name,
          request.contact_email,
          request.contact_phone || '',
          request.description,
          request.tenant_name || '',
        ].some(value => value.toLowerCase().includes(normalizedSearch));
      })
      .sort((a, b) => {
        if (a.status !== b.status) {
          const openA = a.status === 'new' || a.status === 'in_review';
          const openB = b.status === 'new' || b.status === 'in_review';
          if (openA !== openB) return openA ? -1 : 1;
        }

        const priorityDifference = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (priorityDifference !== 0) return priorityDifference;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [requests, tenantFilter, typeFilter, priorityFilter, statusFilter, search]);

  const metrics = useMemo(() => ({
    new: requests.filter(request => request.status === 'new').length,
    urgent: requests.filter(request =>
      request.priority === 'urgent' && (request.status === 'new' || request.status === 'in_review')
    ).length,
    inReview: requests.filter(request => request.status === 'in_review').length,
    resolved: requests.filter(request => request.status === 'resolved').length,
  }), [requests]);

  const saveStatus = async () => {
    if (!selectedRequest || statusDraft === selectedRequest.status) return;

    setSavingStatus(true);
    setStatusError('');

    try {
      const result = await callSupportAdminApi({
        action: 'update_status',
        requestId: selectedRequest.id,
        status: statusDraft,
      });

      const updatedAt = result.request?.updated_at || new Date().toISOString();
      const updatedStatus = (result.request?.status || statusDraft) as SupportStatus;

      setRequests(current => current.map(request =>
        request.id === selectedRequest.id
          ? { ...request, status: updatedStatus, updated_at: updatedAt }
          : request
      ));

      setSelectedRequest(current => current
        ? { ...current, status: updatedStatus, updated_at: updatedAt }
        : current
      );
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'No pudimos actualizar el estado.');
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="metric-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-bold text-steel-50">{metrics.new}</div>
              <div className="text-xs text-steel-400 mt-1">Nuevos</div>
            </div>
            <MessageSquare size={20} className="text-sky-300" />
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-bold text-red-300">{metrics.urgent}</div>
              <div className="text-xs text-steel-400 mt-1">Urgentes abiertos</div>
            </div>
            <AlertCircle size={20} className="text-red-300" />
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-bold text-amber-300">{metrics.inReview}</div>
              <div className="text-xs text-steel-400 mt-1">En revisión</div>
            </div>
            <Clock size={20} className="text-amber-300" />
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-bold text-emerald-300">{metrics.resolved}</div>
              <div className="text-xs text-steel-400 mt-1">Resueltos</div>
            </div>
            <CheckCircle2 size={20} className="text-emerald-300" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-500" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="input pl-9"
              placeholder="Buscar por persona, email, empresa o descripción..."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select value={tenantFilter} onChange={event => setTenantFilter(event.target.value)} className="select w-auto min-w-[170px]">
              <option value="all">Todas las empresas</option>
              <option value="unassigned">Sin empresa</option>
              {tenants.map(tenant => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>

            <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} className="select w-auto">
              <option value="all">Todos los tipos</option>
              <option value="problem">Problemas</option>
              <option value="suggestion">Sugerencias</option>
            </select>

            <select value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)} className="select w-auto">
              <option value="all">Toda prioridad</option>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>

            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="select w-auto">
              <option value="all">Todos los estados</option>
              {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>

            <button type="button" className="btn-secondary" onClick={() => void loadRequests()} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualizar
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 flex items-start gap-3">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">No pudimos cargar Soporte / Issues</p>
            <p className="text-red-200/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card py-14 text-center text-steel-400">
          <Loader2 size={24} className="animate-spin mx-auto mb-3" />
          <p className="text-sm">Cargando reportes...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="card py-14 text-center text-steel-500">
          <LifeBuoy size={34} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium text-steel-300">No hay reportes con estos filtros.</p>
          <p className="text-xs mt-1">Los problemas y sugerencias enviados desde la plataforma aparecerán acá.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs text-steel-500 px-1">
            <div className="flex items-center gap-2"><Filter size={13} /> {filteredRequests.length} reporte{filteredRequests.length === 1 ? '' : 's'}</div>
            <div>Abiertos primero · prioridad más alta primero</div>
          </div>

          {filteredRequests.map(request => (
            <button
              type="button"
              key={request.id}
              onClick={() => setSelectedRequest(request)}
              className="card w-full text-left hover:border-steel-600 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityClass(request.priority)}`}>
                      {getPriorityLabel(request.priority)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusClass(request.status)}`}>
                      {getStatusLabel(request.status)}
                    </span>
                    <span className="badge badge-neutral text-xs">{getTypeLabel(request.request_type)}</span>
                    {request.attachment_path && (
                      <span className="text-xs text-steel-400 flex items-center gap-1">
                        <ImageIcon size={13} /> Captura
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <h3 className="text-sm font-semibold text-steel-100">{request.contact_name}</h3>
                    <span className="text-xs text-steel-500">· {request.tenant_name || 'Sin empresa identificada'}</span>
                  </div>

                  <p className="text-sm text-steel-300 mt-2 line-clamp-2 whitespace-pre-wrap">{request.description}</p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-steel-500">
                    <span>{request.contact_email}</span>
                    <span>Origen: {getSourceLabel(request.source)}</span>
                    <span>{formatDateTime(request.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-petroleum-300 flex-shrink-0">
                  <Eye size={15} /> Ver detalle
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        title="Detalle de soporte"
        size="lg"
        stickyFooter
        footer={selectedRequest ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
            <div className="text-xs text-steel-500">
              Última actualización: {formatDateTime(selectedRequest.updated_at)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="select w-auto"
                value={statusDraft}
                onChange={event => setStatusDraft(event.target.value as SupportStatus)}
                disabled={savingStatus}
              >
                {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void saveStatus()}
                disabled={savingStatus || statusDraft === selectedRequest.status}
              >
                {savingStatus ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Guardar estado
              </button>
            </div>
          </div>
        ) : undefined}
      >
        {selectedRequest && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full border ${getPriorityClass(selectedRequest.priority)}`}>
                Prioridad {getPriorityLabel(selectedRequest.priority)}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${getStatusClass(selectedRequest.status)}`}>
                {getStatusLabel(selectedRequest.status)}
              </span>
              <span className="badge badge-neutral">{getTypeLabel(selectedRequest.request_type)}</span>
              <span className="badge badge-neutral">Origen: {getSourceLabel(selectedRequest.source)}</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-steel-700 bg-steel-900/40 p-4">
                <p className="text-xs uppercase tracking-wide text-steel-500">Reportado por</p>
                <p className="text-sm font-semibold text-steel-100 mt-1">{selectedRequest.contact_name}</p>
                <a href={`mailto:${selectedRequest.contact_email}`} className="text-sm text-petroleum-300 hover:underline mt-1 flex items-center gap-1.5">
                  <Mail size={13} /> {selectedRequest.contact_email}
                </a>
                {selectedRequest.contact_phone && (
                  <a href={`tel:${selectedRequest.contact_phone}`} className="text-xs text-steel-400 hover:text-steel-200 mt-1 inline-block">
                    {selectedRequest.contact_phone}
                  </a>
                )}
              </div>

              <div className="rounded-xl border border-steel-700 bg-steel-900/40 p-4">
                <p className="text-xs uppercase tracking-wide text-steel-500">Contexto</p>
                <p className="text-sm text-steel-200 mt-1">{selectedRequest.tenant_name || 'Sin empresa identificada'}</p>
                <p className="text-xs text-steel-500 mt-1">Enviado: {formatDateTime(selectedRequest.created_at)}</p>
                <p className="text-xs text-steel-500 mt-1">ID: {selectedRequest.id}</p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-steel-500 mb-2">Descripción</p>
              <div className="rounded-xl border border-steel-700 bg-steel-900/40 p-4 text-sm text-steel-200 whitespace-pre-wrap leading-relaxed">
                {selectedRequest.description}
              </div>
            </div>

            {selectedRequest.attachment_path && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-xs uppercase tracking-wide text-steel-500">Captura adjunta</p>
                  <span className="text-xs text-steel-500">
                    {selectedRequest.attachment_original_name || 'captura'} · {formatBytes(selectedRequest.attachment_compressed_size)}
                  </span>
                </div>

                {attachmentLoading ? (
                  <div className="rounded-xl border border-steel-700 bg-steel-900/40 p-8 text-center text-steel-400">
                    <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                    <p className="text-xs">Generando acceso privado temporal...</p>
                  </div>
                ) : attachmentError ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                    {attachmentError}
                  </div>
                ) : attachmentUrl ? (
                  <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="block group">
                    <div className="rounded-xl overflow-hidden border border-steel-700 bg-steel-900/40">
                      <img
                        src={attachmentUrl}
                        alt="Captura adjunta al reporte"
                        className="w-full max-h-[420px] object-contain bg-steel-950"
                      />
                      <div className="flex items-center justify-center gap-2 p-3 text-xs text-petroleum-300 group-hover:text-petroleum-200">
                        <ExternalLink size={14} /> Abrir captura en una pestaña nueva
                      </div>
                    </div>
                  </a>
                ) : null}
              </div>
            )}

            {statusError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {statusError}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
