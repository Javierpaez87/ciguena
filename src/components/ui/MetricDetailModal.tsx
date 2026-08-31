import React from 'react';
import Modal from './Modal';

export interface MetricDetailColumn<T> {
  key: string;
  label: string;
  render: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface MetricDetailModalProps<T> {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  context?: string;
  rows: T[];
  columns: MetricDetailColumn<T>[];
  rowKey?: (row: T, index: number) => React.Key;
  emptyMessage?: string;
}

export default function MetricDetailModal<T>({
  open,
  onClose,
  title,
  description,
  context,
  rows,
  columns,
  rowKey,
  emptyMessage = 'No hay registros para mostrar con el filtro actual.',
}: MetricDetailModalProps<T>) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xl"
      stickyFooter
      footer={
        <button type="button" onClick={onClose} className="btn-secondary">
          Cerrar
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            {description && <p className="text-sm text-steel-400">{description}</p>}
            {context && (
              <div className="mt-2 inline-flex max-w-full rounded-full border border-steel-700 bg-steel-900 px-2.5 py-1 text-xs text-steel-400">
                <span className="truncate">Filtro: {context}</span>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 rounded-lg border border-steel-700 bg-steel-900 px-3 py-2 text-right">
            <div className="text-lg font-bold text-steel-100">{rows.length}</div>
            <div className="text-[10px] uppercase tracking-wide text-steel-500">
              {rows.length === 1 ? 'registro' : 'registros'}
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-steel-700 bg-steel-900/50 p-6 text-center text-sm text-steel-500">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-steel-700">
            <table className="w-full min-w-[760px]">
              <thead className="bg-steel-900">
                <tr className="border-b border-steel-700">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={`table-header ${column.headerClassName ?? ''}`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={rowKey ? rowKey(row, index) : index} className="table-row">
                    {columns.map((column) => (
                      <td key={column.key} className={`table-cell ${column.className ?? ''}`}>
                        {column.render(row, index)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
