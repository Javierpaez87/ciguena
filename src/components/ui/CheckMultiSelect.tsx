import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

type Choice = { value: string; label: string };

type Props = {
  label: string;
  options: Choice[];
  value: string[];
  onChange: (values: string[]) => void;
  allLabel?: string;
};

/** Empty selection represents ALL. Choosing All always resets the selection. */
export default function CheckMultiSelect({ label, options, value, onChange, allLabel = 'Todos' }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = (id: string) => {
    if (id === '__all__') {
      onChange([]);
      return;
    }
    onChange(value.includes(id) ? value.filter(item => item !== id) : [...value, id]);
  };
  const selectedNames = options.filter(item => value.includes(item.value)).map(item => item.label);
  const summary = value.length === 0 ? allLabel : selectedNames.length <= 2 ? selectedNames.join(', ') : `${selectedNames.length} seleccionados`;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <label className="mb-1 block text-xs font-medium text-steel-200">{label}</label>
      <button
        type="button"
        aria-label={`${label}: ${summary}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(previous => !previous)}
        className="input w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="truncate">{summary}</span>
        <ChevronDown size={16} className="shrink-0" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[210px] max-h-64 overflow-y-auto rounded-lg border border-steel-600 bg-steel-900 p-1 shadow-xl" role="group" aria-label={label}>
          {[{ value: '__all__', label: allLabel }, ...options].map(item => {
            const checked = item.value === '__all__' ? value.length === 0 : value.includes(item.value);
            return (
              <button
                key={item.value}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggle(item.value)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-steel-100 hover:bg-steel-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? 'border-sky-400 bg-sky-500 text-white' : 'border-steel-500'}`}>
                  {checked && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
