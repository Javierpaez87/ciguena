import React, { useEffect, useState } from 'react';
import { Search, BookOpen, Clock, Award, Plus, ChevronRight, PlayCircle, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { baseTrainings } from '../../data/baseTrainings';
import type { Profile, Training } from '../../types';
import Modal from '../../components/ui/Modal';

export default function AdminTrainings() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? '';

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [showDetail, setShowDetail] = useState<Training | null>(null);
  const [showAssign, setShowAssign] = useState<Training | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [assignAll, setAssignAll] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadAdminTrainings = async () => {
      if (!tenantId) {
        setTrainings([]);
        setUsers([]);
        setIsLoading(false);
        setLoadError('Tu usuario no tiene una empresa asociada.');
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      const { data: tenantTrainings, error: tenantTrainingsError } = await supabase
        .from('tenant_trainings')
        .select('training_id, enabled')
        .eq('tenant_id', tenantId)
        .eq('enabled', true);

      if (tenantTrainingsError) {
        console.error('tenantTrainingsError:', tenantTrainingsError);
        setTrainings([]);
        setIsLoading(false);
        setLoadError(`No pudimos cargar los trainings habilitados: ${tenantTrainingsError.message}`);
        return;
      }

      const enabledTrainingIds = new Set(
        (tenantTrainings ?? []).map(row => row.training_id as string)
      );

      const enabledTrainings = baseTrainings.filter(training =>
        training.status === 'active' && enabledTrainingIds.has(training.id)
      );

      setTrainings(enabledTrainings);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('role', 'worker')
        .eq('status', 'active')
        .order('full_name', { ascending: true });

      if (profilesError) {
        console.error('profilesError:', profilesError);
        setUsers([]);
        setLoadError('Cargamos los trainings, pero no pudimos cargar los usuarios de tu empresa.');
        setIsLoading(false);
        return;
      }

      setUsers((profiles ?? []) as Profile[]);
      setIsLoading(false);
    };

    loadAdminTrainings();
  }, [tenantId]);

  const filtered = trainings.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

 const handleAssign = async () => {
  if (!showAssign || !tenantId || !user?.id) {
    alert('No pudimos asignar el training. Falta información del usuario o empresa.');
    return;
  }

  const targets = assignAll ? users.map(u => u.id) : Array.from(selectedUsers);

  if (targets.length === 0) {
    alert('Seleccioná al menos un usuario.');
    return;
  }

  const assignments = targets.map(userId => ({
    tenant_id: tenantId,
    training_id: showAssign.id,
    user_id: userId,
    assigned_by: user.id,
    status: 'not_started',
    progress_percentage: 0,
    assigned_at: new Date().toISOString(),
    due_date: null,
    started_at: null,
    completed_at: null,
    expires_at: null,
  }));

  const { error } = await supabase
    .from('training_assignments')
    .upsert(assignments, {
      onConflict: 'tenant_id,training_id,user_id',
    });

  if (error) {
    console.error('Error asignando training:', error);
    alert(`No pudimos asignar el training: ${error.message}`);
    return;
  }

  alert(`Training "${showAssign.title}" asignado a ${targets.length} usuario(s).`);

  setShowAssign(null);
  setSelectedUsers(new Set());
  setAssignAll(false);
};

  const getContentLabel = (training: Training) => {
    if (training.content_type === 'local_video') return 'Video local';
    if (training.content_type === 'video') return 'Video';
    if (training.content_type === 'youtube') return 'YouTube';
    if (training.content_type === 'document') return 'Documento';
    if (training.content_type === 'external') return 'Recurso externo';
    return 'No definido';
  };

  const renderPreviewContent = (training: Training) => {
    if (!training.content_url) {
      return (
        <div className="rounded-xl border border-steel-700 bg-steel-900 p-6 text-center">
          <PlayCircle size={28} className="mx-auto mb-3 text-steel-500" />
          <p className="text-sm font-medium text-steel-200 mb-1">
            Este training todavía no tiene contenido cargado.
          </p>
          <p className="text-xs text-steel-500">
            El contenido podrá ser un video, documento o recurso externo.
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

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9"
          placeholder="Buscar training..."
        />
      </div>

      {isLoading && (
        <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-4 text-sm text-steel-300">
          Cargando trainings habilitados para tu empresa...
        </div>
      )}

      {loadError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {loadError}
        </div>
      )}

      {!isLoading && !loadError && (
        <>
          <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-3">
            <div className="text-sm font-semibold text-steel-100">
              Trainings habilitados para tu empresa
            </div>
            <div className="text-xs text-steel-500">
              Estos son los cursos que BondiApps habilitó para este tenant desde SuperAdmin.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(tr => (
              <div key={tr.id} className="card hover:border-steel-600 transition-all">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-petroleum-700 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BookOpen size={18} className="text-petroleum-200" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold text-steel-100 mb-1">
                      {tr.title}
                    </div>
                    <p className="text-xs text-steel-400 line-clamp-2">
                      {tr.description}
                    </p>
                  </div>
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
                    <span className="badge badge-neutral">
                      {tr.validity_months}m vigencia
                    </span>
                  )}

                  {tr.content_type && (
                    <span className="badge badge-neutral">
                      {getContentLabel(tr)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-steel-900 rounded-lg p-2.5 text-center">
                    <div className="text-sm font-bold text-steel-100">
                      {tr.passing_score}%
                    </div>
                    <div className="text-xs text-steel-500">Min. aprobación</div>
                  </div>

                  <div className="bg-steel-900 rounded-lg p-2.5 text-center">
                    <div className="text-sm font-bold text-steel-100">
                      {tr.max_attempts ?? '∞'}
                    </div>
                    <div className="text-xs text-steel-500">Intentos</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDetail(tr)}
                    className="btn-ghost text-xs flex-1 justify-center"
                  >
                    <ChevronRight size={13} /> Detalle
                  </button>

                  <button
                    onClick={() => {
                      setShowAssign(tr);
                      setSelectedUsers(new Set());
                      setAssignAll(false);
                    }}
                    className="btn-primary text-xs flex-1 justify-center"
                  >
                    <Plus size={13} /> Asignar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-steel-500">
              <BookOpen size={28} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay trainings habilitados para tu empresa.</p>
            </div>
          )}
        </>
      )}

      {showDetail && (
        <Modal
          open={!!showDetail}
          onClose={() => setShowDetail(null)}
          title={showDetail.title}
          size="lg"
        >
          <div className="space-y-5">
            <div>
              <p className="text-sm text-steel-300">
                {showDetail.description}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PlayCircle size={16} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-steel-100">
                  Contenido del training
                </h3>
              </div>

              {renderPreviewContent(showDetail)}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck size={16} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-steel-100">
                  Evaluación
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Requiere examen', value: showDetail.passing_score > 0 ? 'Sí' : 'No' },
                  { label: 'Preguntas configuradas', value: 'Próximamente' },
                  { label: 'Puntaje mínimo', value: `${showDetail.passing_score}%` },
                  { label: 'Intentos máx.', value: showDetail.max_attempts?.toString() ?? 'Ilimitado' },
                ].map(item => (
                  <div key={item.label} className="bg-steel-900 rounded-lg p-3">
                    <div className="text-xs text-steel-500 mb-1">{item.label}</div>
                    <div className="text-sm font-medium text-steel-200">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-steel-100">
                  Certificación
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Categoría', value: showDetail.category },
                  { label: 'Duración', value: `${showDetail.duration_minutes} minutos` },
                  { label: 'Vigencia', value: showDetail.validity_months ? `${showDetail.validity_months} meses` : 'Sin vigencia' },
                  { label: 'Emite certificado', value: showDetail.certificate_enabled ? 'Sí' : 'No' },
                  { label: 'Tipo de contenido', value: getContentLabel(showDetail) },
                ].map(item => (
                  <div key={item.label} className="bg-steel-900 rounded-lg p-3">
                    <div className="text-xs text-steel-500 mb-1">{item.label}</div>
                    <div className="text-sm font-medium text-steel-200">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showAssign && (
        <Modal
          open={!!showAssign}
          onClose={() => setShowAssign(null)}
          title={`Asignar: ${showAssign.title}`}
          size="lg"
          footer={
            <>
              <button onClick={() => setShowAssign(null)} className="btn-ghost">
                Cancelar
              </button>

              <button
                onClick={handleAssign}
                disabled={!assignAll && selectedUsers.size === 0}
                className="btn-primary"
              >
                <Plus size={15} /> Asignar {assignAll ? 'a todos' : `(${selectedUsers.size})`}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg cursor-pointer hover:bg-amber-500/15 transition-colors">
              <input
                type="checkbox"
                checked={assignAll}
                onChange={e => setAssignAll(e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />

              <div>
                <div className="text-sm font-semibold text-amber-300">
                  Asignar a todos los usuarios activos
                </div>
                <div className="text-xs text-steel-400">
                  {users.length} usuarios activos
                </div>
              </div>
            </label>

            {!assignAll && (
              <div className="space-y-1.5">
                <p className="text-xs text-steel-400 font-medium">
                  O seleccioná usuarios individuales:
                </p>

                {users.length === 0 && (
                  <div className="rounded-lg border border-steel-700 bg-steel-900 p-3 text-sm text-steel-400">
                    No hay usuarios activos para asignar en esta empresa.
                  </div>
                )}

                {users.map(u => (
                  <label
                    key={u.id}
                    className="flex items-center gap-3 p-2.5 bg-steel-900 rounded-lg border border-steel-700 hover:border-steel-600 transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(u.id)}
                      onChange={e => {
                        setSelectedUsers(prev => {
                          const s = new Set(prev);

                          if (e.target.checked) {
                            s.add(u.id);
                          } else {
                            s.delete(u.id);
                          }

                          return s;
                        });
                      }}
                      className="w-4 h-4 accent-amber-500"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-steel-100">
                        {u.full_name}
                      </div>
                      <div className="text-xs text-steel-400">
                        {u.position ?? u.email}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
