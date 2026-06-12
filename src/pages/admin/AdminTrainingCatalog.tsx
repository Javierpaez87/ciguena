import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Clock,
  Award,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  MessageCircle,
  Info,
  X,
} from 'lucide-react';

import { baseTrainings } from '../../data/baseTrainings';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';

type SelectedTraining = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  duration_minutes?: number;
  validity_months?: number | null;
  certificate_enabled?: boolean;
  status?: string;
};

function normalize(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function formatDuration(minutes?: number | null) {
  if (!minutes) return 'Duración no definida';

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!remainingMinutes) return `${hours} h`;

  return `${hours} h ${remainingMinutes} min`;
}

function formatValidity(months?: number | null) {
  if (!months) return 'Sin vigencia definida';
  if (months === 1) return 'Vigencia: 1 mes';
  return `Vigencia: ${months} meses`;
}

export default function AdminTrainingCatalog() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTraining, setSelectedTraining] = useState<SelectedTraining | null>(null);

  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();

    baseTrainings.forEach((training) => {
      if (training.category) {
        uniqueCategories.add(training.category);
      }
    });

    return Array.from(uniqueCategories).sort((a, b) => a.localeCompare(b));
  }, []);

  const filteredTrainings = useMemo(() => {
    const searchValue = normalize(search);

    return baseTrainings
      .filter((training) => {
        const matchesCategory =
          categoryFilter === 'all' || training.category === categoryFilter;

        const matchesSearch =
          !searchValue ||
          normalize(training.title).includes(searchValue) ||
          normalize(training.description).includes(searchValue) ||
          normalize(training.category).includes(searchValue);

        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [search, categoryFilter]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-steel-700 bg-steel-900/70 p-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300 mb-3">
              <BookOpen size={13} />
              Catálogo Cigüeña
            </div>

            <h1 className="text-2xl font-bold text-steel-50">
              Catálogo completo de trainings
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-steel-400">
              Conocé los trainings disponibles en la plataforma. Si necesitás habilitar
              nuevos contenidos para tu empresa, alojar capacitaciones propias o generar
              material a medida, contactá a tu proveedor BondiApps.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-steel-700 bg-steel-950/70 p-3">
              <div className="text-xl font-bold text-steel-50">{baseTrainings.length}</div>
              <div className="text-xs text-steel-500">Trainings</div>
            </div>

            <div className="rounded-xl border border-steel-700 bg-steel-950/70 p-3">
              <div className="text-xl font-bold text-steel-50">{categories.length}</div>
              <div className="text-xs text-steel-500">Categorías</div>
            </div>

            <div className="rounded-xl border border-steel-700 bg-steel-950/70 p-3">
              <div className="text-xl font-bold text-emerald-400">
                {baseTrainings.filter((training) => training.certificate_enabled).length}
              </div>
              <div className="text-xs text-steel-500">Certifican</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input pl-9"
            placeholder="Buscar training, categoría o palabra clave..."
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="select md:max-w-[260px]"
        >
          <option value="all">Todas las categorías</option>

          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {filteredTrainings.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={28} />}
          title="Sin trainings"
          description="No hay trainings que coincidan con los filtros seleccionados."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTrainings.map((training) => (
            <div
              key={training.id}
              className="card hover:border-steel-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={20} className="text-amber-400" />
                  </div>

                  <div>
                    <div className="text-base font-semibold text-steel-100">
                      {training.title}
                    </div>

                    <div className="mt-1 text-xs text-steel-500">
                      {training.category || 'Sin categoría'}
                    </div>
                  </div>
                </div>

                {training.certificate_enabled ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">
                    <Award size={12} />
                    Certifica
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-steel-700 bg-steel-800 px-2 py-1 text-[11px] font-semibold text-steel-300">
                    <Info size={12} />
                    Informativo
                  </span>
                )}
              </div>

              <p className="min-h-[48px] text-sm leading-6 text-steel-400">
                {training.description || 'Training disponible en el catálogo de Cigüeña.'}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-steel-700 bg-steel-900 p-3">
                  <div className="flex items-center gap-2 text-xs text-steel-500">
                    <Clock size={13} />
                    Duración
                  </div>
                  <div className="mt-1 text-sm font-semibold text-steel-200">
                    {formatDuration(training.duration_minutes)}
                  </div>
                </div>

                <div className="rounded-xl border border-steel-700 bg-steel-900 p-3">
                  <div className="flex items-center gap-2 text-xs text-steel-500">
                    <ShieldCheck size={13} />
                    Vigencia
                  </div>
                  <div className="mt-1 text-sm font-semibold text-steel-200">
                    {formatValidity(training.validity_months)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTraining(training)}
                className="btn-secondary mt-4 w-full justify-center text-xs"
              >
                <MessageCircle size={14} />
                Solicitar acceso
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <UploadCloud size={19} className="text-amber-300" />
            </div>

            <div>
              <div className="text-sm font-semibold text-amber-200">
                Alojar trainings propios
              </div>
              <p className="mt-1 text-xs leading-5 text-steel-400">
                Cigüeña puede alojar materiales, videos, evaluaciones y certificados
                de capacitaciones que tu empresa ya utiliza.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Sparkles size={19} className="text-amber-300" />
            </div>

            <div>
              <div className="text-sm font-semibold text-amber-200">
                Generar contenido a medida
              </div>
              <p className="mt-1 text-xs leading-5 text-steel-400">
                También podemos diseñar trainings nuevos según tus procedimientos,
                riesgos, roles operativos o necesidades de cumplimiento.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <MessageCircle size={19} className="text-amber-300" />
            </div>

            <div>
              <div className="text-sm font-semibold text-amber-200">
                Contactá a tu proveedor
              </div>
              <p className="mt-1 text-xs leading-5 text-steel-400">
                Si necesitás nuevos trainings, carga de contenidos propios o servicios
                adicionales, ponete en contacto con tu proveedor BondiApps.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={!!selectedTraining}
        onClose={() => setSelectedTraining(null)}
        title="Solicitar acceso"
        footer={
          <>
            <button onClick={() => setSelectedTraining(null)} className="btn-primary">
              Entendido
            </button>
          </>
        }
      >
        {selectedTraining && (
          <div className="space-y-4">
            <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={20} className="text-amber-400" />
                </div>

                <div>
                  <div className="text-base font-semibold text-steel-100">
                    {selectedTraining.title}
                  </div>
                  <div className="mt-1 text-xs text-steel-500">
                    {selectedTraining.category || 'Sin categoría'} ·{' '}
                    {formatDuration(selectedTraining.duration_minutes)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <MessageCircle size={18} className="text-amber-300 mt-0.5" />

                <div>
                  <div className="text-sm font-semibold text-amber-200">
                    Ponete en contacto con tu proveedor BondiApps
                  </div>

                  <p className="mt-2 text-sm leading-6 text-steel-300">
                    Para solicitar acceso a este u otros trainings, contactá a tu
                    proveedor BondiApps. También podés consultar por la carga de
                    trainings propios de tu empresa o por la generación de nuevos
                    materiales a medida.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
