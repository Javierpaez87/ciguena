import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Clock,
  Award,
  Edit,
  ToggleLeft,
  ToggleRight,
  Eye,
  Building2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { baseTrainings } from '../../data/baseTrainings';
import type { Training } from '../../types';
import { supabase } from '../../lib/supabase';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';

const CATEGORIES = ['Todos', 'HSE', 'Seguridad', 'Transporte', 'Eléctrico', 'Emergencias', 'Ambiental', 'Compliance'];

interface TenantOption {
  id: string;
  name: string;
  status: string;
}

export default function SaTrainings() {
  const [trainings, setTrainings] = useState<Training[]>(baseTrainings);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Training | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Training | null>(null);

  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [enabledTrainingIds, setEnabledTrainingIds] = useState<Set<string>>(new Set());
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [isLoadingTenantTrainings, setIsLoadingTenantTrainings] = useState(false);
  const [savingTrainingId, setSavingTrainingId] = useState<string | null>(null);
  const [tenantError, setTenantError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'HSE',
    duration_minutes: 60,
    validity_months: 12 as number | '',
    certificate_enabled: true,
    passing_score: 70,
    max_attempts: 3 as number | '',
  });

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);

  const filtered = trainings.filter(t =>
    (category === 'Todos' || t.category === category) &&
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const loadTenants = async () => {
      setIsLoadingTenants(true);
      setTenantError(null);

      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, status')
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) {
        setTenantError('No pudimos cargar las empresas desde Supabase.');
        setTenants([]);
        setSelectedTenantId('');
        setIsLoadingTenants(false);
        return;
      }

      const loadedTenants = (data ?? []) as TenantOption[];

      setTenants(loadedTenants);

      if (loadedTenants.length > 0) {
        setSelectedTenantId(current => current || loadedTenants[0].id);
      }

      setIsLoadingTenants(false);
    };

    loadTenants();
  }, []);

  useEffect(() => {
    const loadTenantTrainings = async () => {
      if (!selectedTenantId) {
        setEnabledTrainingIds(new Set());
        return;
      }

      setIsLoadingTenantTrainings(true);
      setTenantError(null);

      const { data, error } = await supabase
        .from('tenant_trainings')
        .select('training_id, enabled')
        .eq('tenant_id', selectedTenantId);

      if (error) {
        setTenantError('No pudimos cargar los trainings habilitados para esta empresa. Verificá que exista la tabla tenant_trainings.');
        setEnabledTrainingIds(new Set());
        setIsLoadingTenantTrainings(false);
        return;
      }

      const enabledIds = new Set(
        (data ?? [])
          .filter(row => row.enabled)
          .map(row => row.training_id as string)
      );

      setEnabledTrainingIds(enabledIds);
      setIsLoadingTenantTrainings(false);
    };

    loadTenantTrainings();
  }, [selectedTenantId]);

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      category: 'HSE',
      duration_minutes: 60,
      validity_months: 12,
      certificate_enabled: true,
      passing_score: 70,
      max_attempts: 3,
    });
  };

  const toggleStatus = (id: string) => {
    setTrainings(ts =>
      ts.map(t =>
        t.id === id
          ? { ...t, status: t.status === 'active' ? 'inactive' : 'active' }
          : t
      )
    );
  };

  const toggleTenantTraining = async (training: Training) => {
    if (!selectedTenantId) {
      setTenantError('Seleccioná una empresa antes de habilitar trainings.');
      return;
    }

    const currentlyEnabled = enabledTrainingIds.has(training.id);
    const nextEnabled = !currentlyEnabled;

    setSavingTrainingId(training.id);
    setTenantError(null);

    const { error } = await supabase
      .from('tenant_trainings')
      .upsert(
        {
          tenant_id: selectedTenantId,
          training_id: training.id,
          enabled: nextEnabled,
        },
        {
          onConflict: 'tenant_id,training_id',
        }
      );

    if (error) {
      setTenantError('No pudimos guardar el cambio en Supabase.');
      setSavingTrainingId(null);
      return;
    }

    setEnabledTrainingIds(prev => {
      const next = new Set(prev);

      if (nextEnabled) {
        next.add(training.id);
      } else {
        next.delete(training.id);
      }

      return next;
    });

    setSavingTrainingId(null);
  };

  const openEdit = (tr: Training) => {
    setEditTarget(tr);
    setForm({
      title: tr.title,
      description: tr.description,
      category: tr.category,
      duration_minutes: tr.duration_minutes,
      validity_months: tr.validity_months ?? '',
      certificate_enabled: tr.certificate_enabled,
      passing_score: tr.passing_score,
      max_attempts: tr.max_attempts ?? '',
    });
  };

  const closeModal = () => {
    setShowCreate(false);
    setEditTarget(null);
    resetForm();
  };

  const handleSave = () => {
    if (editTarget) {
      setTrainings(ts =>
        ts.map(t =>
          t.id === editTarget.id
            ? {
                ...t,
                ...form,
                validity_months: form.validity_months === '' ? null : Number(form.validity_months),
                max_attempts: form.max_attempts === '' ? null : Number(form.max_attempts),
              }
            : t
        )
      );
      setEditTarget(null);
    } else {
      const newTr: Training = {
        id: `tr${Date.now()}`,
        ...form,
        validity_months: form.validity_months === '' ? null : Number(form.validity_months),
        max_attempts: form.max_attempts === '' ? null : Number(form.max_attempts),
        status: 'active',
        created_at: new Date().toISOString(),
        module_count: 0,
        tenant_count: 0,
        content_type: null,
        content_url: null,
        thumbnail_url: null,
      };

      setTrainings(ts => [...ts, newTr]);
      setShowCreate(false);
    }

    resetForm();
  };

  const renderPreviewContent = (training: Training) => {
    if (!training.content_url) {
      return (
        <div className="rounded-xl border border-steel-700 bg-steel-900 p-6 text-center">
          <p className="text-sm font-medium text-steel-200 mb-1">Este training todavía no tiene contenido cargado.</p>
          <p className="text-xs text-steel-500">
            Podés agregar una URL de video, documento o recurso externo más adelante.
          </p>
        </div>
      );
    }

    if (training.content_type === 'local_video' || training.content_type === 'video') {
      return (
        <video
          src={training.content_url}
          controls
          className="w-full rounded-xl border border-steel-700 bg-black"
        />
      );
    }

    if (training.content_type === 'youtube') {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-steel-700 bg-black">
          <iframe
            src={training.content_url}
            title={training.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-steel-700 bg-steel-900 p-6">
        <p className="text-sm text-steel-300 mb-4">
          Este contenido se abre como recurso externo.
        </p>
        <a
          href={training.content_url}
          target="_blank"
          rel="noreferrer"
          className="btn-primary inline-flex"
        >
          Abrir contenido
        </a>
      </div>
    );
  };

  const TrainingForm = () => (
    <div className="space-y-4">
      <div>
        <label className="label">Título *</label>
        <input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          className="input"
          placeholder="Ej: Inducción HSE"
        />
      </div>

      <div>
        <label className="label">Descripción</label>
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="input"
          rows={3}
          placeholder="Descripción del training..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Categoría</label>
          <select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="select"
          >
            {CATEGORIES.filter(c => c !== 'Todos').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Duración (min)</label>
          <input
            type="number"
            value={form.duration_minutes}
            onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
            className="input"
            min={1}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Vigencia (meses)</label>
          <input
            type="number"
            value={form.validity_months}
            onChange={e =>
              setForm(f => ({
                ...f,
                validity_months: e.target.value === '' ? '' : Number(e.target.value),
              }))
            }
            className="input"
            min={1}
            placeholder="Sin vigencia"
          />
        </div>

        <div>
          <label className="label">Puntaje mínimo (%)</label>
          <input
            type="number"
            value={form.passing_score}
            onChange={e => setForm(f => ({ ...f, passing_score: Number(e.target.value) }))}
            className="input"
            min={0}
            max={100}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Intentos máx.</label>
          <input
            type="number"
            value={form.max_attempts}
            onChange={e =>
              setForm(f => ({
                ...f,
                max_attempts: e.target.value === '' ? '' : Number(e.target.value),
              }))
            }
            className="input"
            min={1}
            placeholder="Ilimitado"
          />
        </div>

        <div className="flex items-end pb-0.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setForm(f => ({ ...f, certificate_enabled: !f.certificate_enabled }))}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                form.certificate_enabled ? 'bg-amber-500' : 'bg-steel-600'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  form.certificate_enabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </div>
            <span className="text-sm text-steel-300">Emite certificado</span>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col xl:flex-row gap-3 items-start xl:items-center justify-between">
        <div className="flex flex-col md:flex-row gap-3 flex-1 w-full">
          <div className="relative flex-1 max-w-xl">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9"
              placeholder="Buscar training..."
            />
          </div>

          <div className="relative w-full md:w-80">
            <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
            <select
              value={selectedTenantId}
              onChange={e => setSelectedTenantId(e.target.value)}
              className="select pl-9"
              disabled={isLoadingTenants}
            >
              {isLoadingTenants && <option value="">Cargando empresas...</option>}
              {!isLoadingTenants && tenants.length === 0 && <option value="">Sin empresas activas</option>}
              {!isLoadingTenants && tenants.map(tenant => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowCreate(true);
          }}
          className="btn-primary flex-shrink-0"
        >
          <Plus size={16} /> Nuevo training
        </button>
      </div>

      {selectedTenant && (
        <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-steel-100">
                Administrando trainings para: {selectedTenant.name}
              </p>
              <p className="text-xs text-steel-500">
                Los trainings habilitados acá serán los que verá el Admin de esta empresa.
              </p>
            </div>
            <div className="text-xs text-steel-400">
              {isLoadingTenantTrainings
                ? 'Cargando habilitaciones...'
                : `${enabledTrainingIds.size} training(s) habilitado(s)`}
            </div>
          </div>
        </div>
      )}

      {tenantError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {tenantError}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              category === cat
                ? 'bg-amber-500 text-petroleum-950'
                : 'bg-steel-800 text-steel-300 hover:bg-steel-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-steel-500">
          <p className="text-sm">No hay trainings para mostrar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(tr => {
            const isEnabledForTenant = enabledTrainingIds.has(tr.id);
            const isSavingThisTraining = savingTrainingId === tr.id;

            return (
              <div key={tr.id} className="card hover:border-steel-600 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="text-base font-semibold text-steel-100 mb-1">{tr.title}</div>
                    <p className="text-xs text-steel-400 line-clamp-2">{tr.description}</p>
                  </div>
                  <StatusBadge status={tr.status} />
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="badge badge-info">{tr.category}</span>
                  <span className="badge badge-neutral flex items-center gap-1">
                    <Clock size={10} /> {tr.duration_minutes} min
                  </span>
                  {tr.certificate_enabled && (
                    <span className="badge badge-warning flex items-center gap-1">
                      <Award size={10} /> Certifica
                    </span>
                  )}
                  {tr.validity_months && (
                    <span className="badge badge-neutral">{tr.validity_months} meses</span>
                  )}
                  {tr.content_type && (
                    <span className="badge badge-neutral">
                      {tr.content_type === 'local_video'
                        ? 'Video local'
                        : tr.content_type === 'youtube'
                          ? 'YouTube'
                          : tr.content_type === 'document'
                            ? 'Documento'
                            : 'Contenido'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-steel-900 rounded-lg p-2">
                    <div className="text-sm font-bold text-steel-100">{tr.module_count}</div>
                    <div className="text-xs text-steel-500">Módulos</div>
                  </div>

                  <div className="bg-steel-900 rounded-lg p-2">
                    <div className="text-sm font-bold text-steel-100">{tr.passing_score}%</div>
                    <div className="text-xs text-steel-500">Min. aprobación</div>
                  </div>

                  <div className="bg-steel-900 rounded-lg p-2">
                    <div className="text-sm font-bold text-steel-100">{tr.tenant_count}</div>
                    <div className="text-xs text-steel-500">Empresas</div>
                  </div>
                </div>

                <div className="mb-4 rounded-lg border border-steel-700 bg-steel-900 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {isEnabledForTenant ? (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      ) : (
                        <XCircle size={16} className="text-steel-500" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-steel-200">
                          {isEnabledForTenant ? 'Habilitado para esta empresa' : 'No habilitado para esta empresa'}
                        </div>
                        <div className="text-xs text-steel-500">
                          {selectedTenant ? selectedTenant.name : 'Seleccioná una empresa'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleTenantTraining(tr)}
                      disabled={!selectedTenantId || isSavingThisTraining || isLoadingTenantTrainings}
                      className={`btn-ghost text-xs justify-center ${
                        isEnabledForTenant
                          ? 'text-red-400 hover:text-red-300'
                          : 'text-emerald-400 hover:text-emerald-300'
                      }`}
                    >
                      {isSavingThisTraining
                        ? 'Guardando...'
                        : isEnabledForTenant
                          ? 'Deshabilitar'
                          : 'Habilitar'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewTarget(tr)}
                    className="btn-ghost text-xs flex-1 justify-center"
                  >
                    <Eye size={13} /> Ver contenido
                  </button>

                  <button
                    onClick={() => openEdit(tr)}
                    className="btn-ghost text-xs flex-1 justify-center"
                  >
                    <Edit size={13} /> Editar
                  </button>

                  <button
                    onClick={() => toggleStatus(tr.id)}
                    className={`btn-ghost text-xs flex-1 justify-center ${
                      tr.status === 'active'
                        ? 'text-red-400 hover:text-red-300'
                        : 'text-emerald-400 hover:text-emerald-300'
                    }`}
                  >
                    {tr.status === 'active' ? (
                      <>
                        <ToggleRight size={13} /> Desactivar
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={13} /> Activar
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={showCreate || !!editTarget}
        onClose={closeModal}
        title={editTarget ? `Editar: ${editTarget.title}` : 'Nuevo training'}
        size="lg"
        footer={
          <>
            <button onClick={closeModal} className="btn-ghost">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={!form.title} className="btn-primary">
              {editTarget ? (
                'Guardar cambios'
              ) : (
                <>
                  <Plus size={15} /> Crear training
                </>
              )}
            </button>
          </>
        }
      >
        <TrainingForm />
      </Modal>

      {previewTarget && (
        <Modal
          open={!!previewTarget}
          onClose={() => setPreviewTarget(null)}
          title={`Contenido: ${previewTarget.title}`}
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-steel-300">{previewTarget.description}</p>
            </div>

            {renderPreviewContent(previewTarget)}
          </div>
        </Modal>
      )}
    </div>
  );
}
