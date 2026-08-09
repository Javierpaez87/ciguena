import React, { useEffect, useMemo, useState } from 'react';
import { CheckSquare, Download, Square } from 'lucide-react';
import Modal from './Modal';

export type CsvExportColumn<T> = {
  key: string;
  label: string;
  getValue: (row: T) => string | number | boolean | null | undefined;
  defaultSelected?: boolean;
};

type CsvExportModalProps<T> = {
  open: boolean;
  onClose: () => void;
  title: string;
  filename: string;
  rows: T[];
  columns: CsvExportColumn<T>[];
  description?: string;
};

function csvEscape(value: string | number | boolean | null | undefined) {
  const safeValue = value === null || value === undefined ? '' : String(value);
  return `"${safeValue.replace(/"/g, '""')}"`;
}

function downloadCsv<T>({
  filename,
  rows,
  columns,
}: {
  filename: string;
  rows: T[];
  columns: CsvExportColumn<T>[];
}) {
  const header = columns.map((column) => csvEscape(column.label)).join(',');
  const body = rows.map((row) =>
    columns.map((column) => csvEscape(column.getValue(row))).join(',')
  );
  const csvContent = `\uFEFF${[header, ...body].join('\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function CsvExportModal<T>({
  open,
  onClose,
  title,
  filename,
  rows,
  columns,
  description,
}: CsvExportModalProps<T>) {
  const defaultKeys = useMemo(
    () => columns.filter((column) => column.defaultSelected !== false).map((column) => column.key),
    [columns]
  );
  const [selectedKeys, setSelectedKeys] = useState<string[]>(defaultKeys);

  useEffect(() => {
    if (open) setSelectedKeys(defaultKeys);
  }, [open, defaultKeys]);

  const selectedColumns = columns.filter((column) => selectedKeys.includes(column.key));
  const allSelected = selectedKeys.length === columns.length && columns.length > 0;

  function toggleColumn(key: string) {
    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }

  function handleExport() {
    if (selectedColumns.length === 0 || rows.length === 0) return;
    downloadCsv({ filename, rows, columns: selectedColumns });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary text-xs">
            Cancelar
          </button>
          <button
            onClick={handleExport}
            className="btn-primary text-xs"
            disabled={selectedColumns.length === 0 || rows.length === 0}
          >
            <Download size={14} />
            Exportar {rows.length} fila(s)
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-3 text-sm text-steel-300">
          {description || 'Elegí las columnas que querés incluir. Se exportarán los datos correspondientes a la vista actual.'}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-steel-100">Columnas</div>
            <div className="text-xs text-steel-500 mt-0.5">
              {selectedColumns.length} de {columns.length} seleccionadas
            </div>
          </div>

          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => setSelectedKeys(allSelected ? [] : columns.map((column) => column.key))}
          >
            {allSelected ? <Square size={14} /> : <CheckSquare size={14} />}
            {allSelected ? 'Quitar todas' : 'Seleccionar todas'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {columns.map((column) => {
            const checked = selectedKeys.includes(column.key);
            return (
              <label
                key={column.key}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                  checked
                    ? 'border-amber-500/40 bg-amber-500/10 text-steel-100'
                    : 'border-steel-700 bg-steel-900/50 text-steel-400 hover:border-steel-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleColumn(column.key)}
                  className="accent-amber-500"
                />
                <span className="text-sm">{column.label}</span>
              </label>
            );
          })}
        </div>

        {rows.length === 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            No hay filas en la vista actual para exportar.
          </div>
        )}
      </div>
    </Modal>
  );
}
