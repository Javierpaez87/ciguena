import {
  getOperationalRole,
  getWorkerDisplayName,
  normalizeWorkerValue,
  type WorkerRecord,
} from './workerRoster';

export type WorkerFilterKey =
  | 'work_role'
  | 'area'
  | 'oilfield'
  | 'supervisor'
  | 'base'
  | 'site'
  | 'shift';

export type WorkerFilterOption = {
  value: string;
  label: string;
  count: number;
};

export type WorkerFilterDefinition = {
  key: WorkerFilterKey;
  label: string;
  emptyLabel: string;
};

export const WORKER_FILTER_DEFINITIONS: WorkerFilterDefinition[] = [
  { key: 'work_role', label: 'Rol operativo', emptyLabel: 'Sin rol definido' },
  { key: 'area', label: 'Área', emptyLabel: 'Sin área' },
  { key: 'oilfield', label: 'Yacimiento', emptyLabel: 'Sin yacimiento' },
  { key: 'supervisor', label: 'Supervisor', emptyLabel: 'Sin supervisor' },
  { key: 'base', label: 'Base', emptyLabel: 'Sin base' },
  { key: 'site', label: 'Sede', emptyLabel: 'Sin sede' },
  { key: 'shift', label: 'Turno', emptyLabel: 'Sin turno' },
];

const definitionByKey = new Map(
  WORKER_FILTER_DEFINITIONS.map((definition) => [definition.key, definition])
);

export function getWorkerFilterDefinition(key: WorkerFilterKey) {
  return definitionByKey.get(key) ?? WORKER_FILTER_DEFINITIONS[0];
}

export function getWorkerFilterValue(worker: WorkerRecord, key: WorkerFilterKey) {
  if (key === 'work_role') return getOperationalRole(worker);

  const value = worker[key];
  if (typeof value === 'string' && value.trim()) return value.trim();

  return getWorkerFilterDefinition(key).emptyLabel;
}

export function getWorkerFilterOptions(
  workers: WorkerRecord[],
  key: WorkerFilterKey
): WorkerFilterOption[] {
  const values = new Map<string, WorkerFilterOption>();

  workers.forEach((worker) => {
    const label = getWorkerFilterValue(worker, key);
    const normalized = normalizeWorkerValue(label);
    const existing = values.get(normalized);

    if (existing) {
      existing.count += 1;
      return;
    }

    values.set(normalized, {
      value: label,
      label,
      count: 1,
    });
  });

  return Array.from(values.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })
  );
}

export function matchesWorkerFilter(
  worker: WorkerRecord,
  key: WorkerFilterKey,
  selectedValues: string[]
) {
  if (selectedValues.length === 0) return true;

  const workerValue = normalizeWorkerValue(getWorkerFilterValue(worker, key));
  return selectedValues.some((value) => normalizeWorkerValue(value) === workerValue);
}

export function filterWorkersByCriterion(
  workers: WorkerRecord[],
  key: WorkerFilterKey,
  selectedValues: string[]
) {
  if (selectedValues.length === 0) return workers;
  return workers.filter((worker) => matchesWorkerFilter(worker, key, selectedValues));
}

export function workerMatchesSearch(worker: WorkerRecord, search: string) {
  const searchValue = normalizeWorkerValue(search);
  if (!searchValue) return true;

  const searchableValues = [
    getWorkerDisplayName(worker),
    worker.first_name,
    worker.last_name,
    worker.email,
    getOperationalRole(worker),
    worker.position,
    worker.area,
    worker.employee_code,
    worker.dni,
    worker.phone,
    worker.contractor_company,
    worker.supervisor,
    worker.shift,
    worker.base,
    worker.site,
    worker.region,
    worker.oilfield,
  ];

  return searchableValues.some((value) => normalizeWorkerValue(value).includes(searchValue));
}
