import React, { useEffect, useState } from 'react';
import {
BookOpen,
Award,
TrendingUp,
Clock,
AlertTriangle,
CheckCircle,
Play,
AlertCircle,
RefreshCw,
} from 'lucide-react';
import MetricCard from '../../components/ui/MetricCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { baseTrainings } from '../../data/baseTrainings';
import type { Training, TrainingAssignment } from '../../types';

interface WorkerDashboardProps {
onNavigate: (view: string, data?: unknown) => void;
}

type WorkerTrainingAssignment = TrainingAssignment & {
training?: Training;
};

export default function WorkerDashboard({ onNavigate }: WorkerDashboardProps) {
const { user } = useAuth();

const [assignments, setAssignments] = useState<WorkerTrainingAssignment[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [loadError, setLoadError] = useState<string | null>(null);

const loadDashboardData = async () => {
setIsLoading(true);
setLoadError(null);

```
const { data: authData, error: authError } = await supabase.auth.getUser();

if (authError || !authData.user) {
  console.error('authError:', authError);
  setAssignments([]);
  setLoadError('No pudimos identificar tu sesión.');
  setIsLoading(false);
  return;
}

const authUserId = authData.user.id;

const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id, auth_user_id, email, full_name, tenant_id')
  .eq('auth_user_id', authUserId)
  .single();

if (profileError || !profile) {
  console.error('profileError:', profileError);
  setAssignments([]);
  setLoadError('No pudimos encontrar tu perfil de trabajador.');
  setIsLoading(false);
  return;
}

const { data, error } = await supabase
  .from('training_assignments')
  .select('*')
  .eq('user_id', profile.id)
  .order('assigned_at', { ascending: false });

if (error) {
  console.error('Error cargando dashboard worker:', error);
  setAssignments([]);
  setLoadError('No pudimos cargar tus trainings asignados: ' + error.message);
  setIsLoading(false);
  return;
}

const trainingById = new Map(baseTrainings.map(training => [training.id, training]));

const hydratedAssignments = (data ?? [])
  .map(row => ({
    ...(row as TrainingAssignment),
    training: trainingById.get(row.training_id as string),
  }))
  .filter(a => Boolean(a.training)) as WorkerTrainingAssignment[];

setAssignments(hydratedAssignments);
setIsLoading(false);
```

};

useEffect(() => {
loadDashboardData();
}, [user?.id]);

const pending = assignments.filter(a => a.status === 'not_started').length;

const inProgress = assignments.filter(a =>
a.status === 'in_progress'
).length;

const completed = assignments.filter(a =>
['completed', 'passed', 'certificate_issued'].includes(a.status)
).length;

const certificates = assignments.filter(a =>
a.status === 'certificate_issued'
);

const now = new Date();
const inThirtyDays = new Date();
inThirtyDays.setDate(now.getDate() + 30);

const expiringSoon = certificates.filter(a => {
if (!a.expires_at) return false;

```
const expiresAt = new Date(a.expires_at);

return expiresAt >= now && expiresAt <= inThirtyDays;
```

}).length;

const avgProgress = assignments.length
? Math.round(
assignments.reduce((sum, assignment) => {
return sum + (assignment.progress_percentage ?? 0);
}, 0) / assignments.length
)
: 0;

const activeAssignments = assignments.filter(a =>
!['certificate_issued', 'completed'].includes(a.status)
);

const getActionLabel = (assignment: WorkerTrainingAssignment) => {
if (assignment.status === 'not_started') return 'Comenzar';
if (assignment.status === 'pending_test') return 'Rendir test';
if (assignment.status === 'certificate_issued') return 'Ver certificado';
return 'Continuar';
};

const getActionView = (assignment: WorkerTrainingAssignment) => {
if (assignment.status === 'pending_test') return 'worker-test';
if (assignment.status === 'certificate_issued') return 'worker-certificates';
return 'worker-player';
};

if (isLoading) {
return ( <div className="space-y-6"> <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-4 text-sm text-steel-300">
Cargando tu dashboard... </div> </div>
);
}

if (loadError) {
return ( <div className="space-y-6"> <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"> <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />

```
      <div>
        <div className="font-semibold">No pudimos cargar tu dashboard</div>
        <div className="text-red-200/90">{loadError}</div>

        <button
          onClick={loadDashboardData}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/10"
        >
          <RefreshCw size={13} />
          Reintentar
        </button>
      </div>
    </div>
  </div>
);
```

}

return ( <div className="space-y-6"> <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
<MetricCard
title="Pendientes"
value={pending}
icon={<Clock size={20} />}
accent="amber"
/>

```
    <MetricCard
      title="En curso"
      value={inProgress}
      icon={<Play size={20} />}
      accent="blue"
    />

    <MetricCard
      title="Completados"
      value={completed}
      icon={<CheckCircle size={20} />}
      accent="green"
    />

    <MetricCard
      title="Certificados"
      value={certificates.length}
      icon={<Award size={20} />}
      accent="amber"
      subtitle={expiringSoon > 0 ? `${expiringSoon} próximos a vencer` : undefined}
    />
  </div>

  <div className="card">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-semibold text-steel-100 flex items-center gap-2">
        <TrendingUp size={16} className="text-amber-400" />
        Tu progreso general
      </h3>

      <span className="text-2xl font-bold text-amber-400">
        {avgProgress}%
      </span>
    </div>

    <div className="progress-bar h-2.5">
      <div className="progress-fill h-full" style={{ width: `${avgProgress}%` }} />
    </div>

    <div className="flex justify-between text-xs text-steel-500 mt-2">
      <span>{completed} completados</span>
      <span>{assignments.length} total</span>
    </div>
  </div>

  {assignments.length === 0 && (
    <div className="card text-center py-10">
      <BookOpen size={32} className="mx-auto mb-3 text-steel-500 opacity-60" />

      <div className="text-sm font-semibold text-steel-200 mb-1">
        Todavía no tenés trainings asignados
      </div>

      <p className="text-xs text-steel-500">
        Cuando tu empresa te asigne un training, va a aparecer acá.
      </p>
    </div>
  )}

  {activeAssignments.length > 0 && (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-steel-300">
        Continuar donde lo dejaste
      </h3>

      {activeAssignments.map(assignment => (
        <div
          key={assignment.id}
          className="card hover:border-amber-500/40 transition-all cursor-pointer"
          onClick={() =>
            onNavigate(getActionView(assignment), { assignment })
          }
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-petroleum-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen size={20} className="text-petroleum-200" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-steel-100 mb-1">
                {assignment.training?.title}
              </div>

              <p className="text-xs text-steel-500 line-clamp-1 mb-2">
                {assignment.training?.description}
              </p>

              <div className="flex items-center gap-3">
                <div className="progress-bar flex-1">
                  <div
                    className="progress-fill"
                    style={{ width: `${assignment.progress_percentage ?? 0}%` }}
                  />
                </div>

                <span className="text-xs text-steel-400 flex-shrink-0">
                  {assignment.progress_percentage ?? 0}%
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={assignment.status} />

              <button
                className="btn-primary text-xs py-1 px-3"
                onClick={event => {
                  event.stopPropagation();
                  onNavigate(getActionView(assignment), { assignment });
                }}
              >
                {getActionLabel(assignment)}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )}

  {expiringSoon > 0 && (
    <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
      <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />

      <div>
        <div className="text-sm font-semibold text-amber-300">
          Certificados próximos a vencer
        </div>

        <p className="text-xs text-steel-400 mt-1">
          Tenés {expiringSoon} certificado(s) que vencen pronto. Verificá tus certificados y renovalos a tiempo.
        </p>
      </div>
    </div>
  )}
</div>
```

);
}
