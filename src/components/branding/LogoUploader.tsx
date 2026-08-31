import { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';

interface LogoUploaderProps {
  label: string;
  description: string;
  currentUrl: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  recommended?: string;
  compact?: boolean;
}

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

const MAX_FILE_SIZE = 2 * 1024 * 1024;

export default function LogoUploader({
  label,
  description,
  currentUrl,
  file,
  onFileChange,
  recommended,
  compact = false,
}: LogoUploaderProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  const previewUrl = useMemo(
    () => objectUrl || currentUrl || null,
    [objectUrl, currentUrl],
  );

  function handleFile(fileCandidate?: File) {
    setLocalError(null);

    if (!fileCandidate) return;

    if (!ALLOWED_TYPES.has(fileCandidate.type)) {
      setLocalError('Formato no soportado. Usá PNG, JPG, WEBP, SVG o ICO.');
      return;
    }

    if (fileCandidate.size > MAX_FILE_SIZE) {
      setLocalError('El archivo supera el máximo de 2 MB.');
      return;
    }

    onFileChange(fileCandidate);
  }

  return (
    <div className="rounded-xl border border-steel-700 bg-steel-900/55 p-4">
      <div className="flex items-start gap-4">
        <div
          className={`flex-shrink-0 rounded-xl border border-steel-700 bg-steel-950 flex items-center justify-center overflow-hidden ${
            compact ? 'w-16 h-16' : 'w-24 h-16'
          }`}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={label}
              className="w-full h-full object-contain p-2"
            />
          ) : (
            <ImageIcon size={22} className="text-steel-600" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-steel-100">{label}</div>
          <p className="text-xs text-steel-500 mt-1">{description}</p>
          {recommended && (
            <p className="text-[11px] text-steel-600 mt-1">{recommended}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-steel-600 bg-steel-800 text-steel-200 hover:bg-steel-700 transition-colors text-xs font-medium cursor-pointer">
              <Upload size={14} />
              {file ? 'Cambiar archivo' : 'Subir archivo'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,.ico"
                className="hidden"
                onChange={(event) => {
                  handleFile(event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
            </label>

            {file && (
              <button
                type="button"
                onClick={() => onFileChange(null)}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs text-steel-400 hover:text-steel-100 hover:bg-steel-800 transition-colors"
              >
                <X size={13} />
                Descartar cambio
              </button>
            )}
          </div>

          {file && (
            <div className="text-[11px] text-emerald-300 mt-2 truncate">
              Nuevo: {file.name}
            </div>
          )}

          {localError && (
            <div className="text-[11px] text-red-300 mt-2">{localError}</div>
          )}
        </div>
      </div>
    </div>
  );
}
