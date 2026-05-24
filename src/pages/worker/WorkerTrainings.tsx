import React, { useState } from 'react';
import { Play, BookOpen, Clock, Award, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getAssignmentsByUser } from '../../lib/mockData';
import type { TrainingAssignment } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';

interface WorkerTrainingsProps {
  onNavigate: (view: string, data?: unknown) => void;
}

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'not_started', label: 'Pendientes' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'pending_test', label: 'Para rendir' },
  { value: 'certificate_issued', label: 'Completados' },
];

export default function WorkerTrainings({ onNavigate }: WorkerTrainingsProps) {
  const { user } = useAuth();
  const assignments = getAssignmentsByUser(user?.id ?? 'u1');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = assignments.filter(a =>
    statusFilter === 'all' || a.status === statusFilter
  );

  const getActionLabel = (a: TrainingAssignment) => {
    if (a.status === 'not_started') return 'Comenzar';
    if (a.status === 'pending_test') return 'Rendir test';
    if (a.status === 'certificate_issued') return 'Ver certificado';
    return 'Continuar';
  };

  const getActionView = (a: TrainingAssignment) => {
    if (a.status === 'pending_test') return 'worker-test';
    if (a.status === 'certificate_issued') return 'worker-certificates';
    return 'worker-player';
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(sf => (
          <button
            key={sf.value}
            onClick={() => setStatusFilter(sf.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === sf.value ? 'bg-amber-500 text-petroleum-950' : 'bg-steel-800 text-steel-300 hover:bg-steel-700'}`}
          >
            {sf.label} ({sf.value === 'all' ? assignments.length : assignments.filter(a => a.status === sf.value).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<BookOpen size={28} />} title="Sin trainings" description="No tenés trainings con ese estado." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(a => (
            <div key={a.id} className="card hover:border-steel-600 transition-all">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-petroleum-700 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookOpen size={20} className="text-petroleum-200" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-steel-100 mb-1">{a.training?.title}</div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="badge badge-neutral flex items-center gap-1">
                      <Clock size={9} /> {a.training?.duration_minutes} min
                    </span>
                    {a.training?.certificate_enabled && (
                      <span className="badge badge-warning flex items-center gap-1"><Award size={9} /> Certifica</span>
                    )}
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs text-steel-400 mb-1.5">
                  <span>Progreso</span>
                  <span>{a.progress_percentage}%</span>
                </div>
                <div className="progress-bar h-2">
                  <div className="progress-fill h-full" style={{ width: `${a.progress_percentage}%` }} />
                </div>
              </div>

              {a.due_date && (
                <div className="text-xs text-steel-500 mb-3">
                  Fecha límite: {new Date(a.due_date).toLocaleDateString('es-AR')}
                </div>
              )}

              <button
                onClick={() => onNavigate(getActionView(a), { assignment: a })}
                className="btn-primary w-full justify-center py-2.5"
              >
                <Play size={14} /> {getActionLabel(a)}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
