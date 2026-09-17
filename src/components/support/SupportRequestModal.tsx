import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Lightbulb,
  Loader2,
  ShieldAlert,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import Modal from '../ui/Modal';
import {
  compressSupportImage,
  submitSupportRequest,
  type SupportPriority,
  type SupportRequestType,
  type SupportSource,
} from '../../lib/supportRequests';

interface SupportRequestModalProps {
  open: boolean;
  onClose: () => void;
  source: SupportSource;
  tenantId?: string | null;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
}

const priorityOptions: Array<{
  value: SupportPriority;
  label: string;
  description: string;
}> = [
  { value: 'urgent', label: 'Urgente', description: 'Me impide usar la plataforma o completar una tarea.' },
  { value: 'high', label: 'Alta', description: 'Necesito una solución pronto, pero puedo continuar parcialmente.' },
  { value: 'medium', label: 'Media', description: 'Afecta la experiencia, pero no bloquea mi trabajo.' },
  { value: 'low', label: 'Baja', description: 'No es prioritario; puede revisarse más adelante.' },
];

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function SupportRequestModal({
  open,
  onClose,
  source,
  tenantId,
  defaultName = '',
  defaultEmail = '',
  defaultPhone = '',
}: SupportRequestModalProps) {
  const [requestType, setRequestType] = useState<SupportRequestType>('problem');
  const [priority, setPriority] = useState<SupportPriority>('medium');
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [website, setWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const title = useMemo(
    () => requestType === 'problem' ? 'Reportar un problema' : 'Enviar una sugerencia',
    [requestType],
  );

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setEmail(defaultEmail);
    setPhone(defaultPhone);
  }, [open, defaultName, defaultEmail, defaultPhone]);

  const resetAndClose = () => {
    if (isSubmitting) return;
    setRequestType('problem');
    setPriority('medium');
    setDescription('');
    setAttachment(null);
    setWebsite('');
    setError('');
    setSubmitted(false);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !description.trim()) {
      setError('Completá nombre, email y descripción.');
      return;
    }

    setIsSubmitting(true);

    try {
      const compressedAttachment = attachment
        ? await compressSupportImage(attachment)
        : null;

      await submitSupportRequest({
        requestType,
        priority,
        source,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        description: description.trim(),
        tenantId: tenantId || null,
        attachment: compressedAttachment,
        website,
      });

      setSubmitted(true);
      setDescription('');
      setAttachment(null);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No pudimos enviar el reporte. Intentá nuevamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title="Reportar problema o sugerencia"
      size="lg"
      stickyFooter
      footer={submitted ? (
        <button type="button" onClick={resetAndClose} className="btn-primary ml-auto justify-center">
          Cerrar
        </button>
      ) : (
        <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={resetAndClose} className="btn-secondary justify-center" disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" form="support-request-form" className="btn-primary justify-center" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 size={16} className="animate-spin" /> Enviando...</>
            ) : 'Enviar reporte'}
          </button>
        </div>
      )}
    >
      {submitted ? (
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <CheckCircle2 size={26} className="text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-steel-100">Reporte enviado</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-steel-400">
            Recibimos la información. Los datos de contacto y la captura adjunta, si agregaste una, quedaron asociados al reporte.
          </p>
        </div>
      ) : (
        <form id="support-request-form" onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-400" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          <div>
            <label className="label">¿Qué querés reportar?</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRequestType('problem')}
                className={`rounded-xl border p-4 text-left transition-all ${requestType === 'problem' ? 'brand-border brand-bg-soft' : 'border-steel-700 bg-steel-900/60 hover:border-steel-600'}`}
              >
                <div className="flex items-center gap-2 font-semibold text-steel-100">
                  <TriangleAlert size={17} className={requestType === 'problem' ? 'brand-text' : 'text-steel-400'} />
                  Problema
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-steel-400">Algo no funciona o te impide avanzar.</p>
              </button>

              <button
                type="button"
                onClick={() => setRequestType('suggestion')}
                className={`rounded-xl border p-4 text-left transition-all ${requestType === 'suggestion' ? 'brand-border brand-bg-soft' : 'border-steel-700 bg-steel-900/60 hover:border-steel-600'}`}
              >
                <div className="flex items-center gap-2 font-semibold text-steel-100">
                  <Lightbulb size={17} className={requestType === 'suggestion' ? 'brand-text' : 'text-steel-400'} />
                  Sugerencia
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-steel-400">Una mejora o idea que te gustaría proponernos.</p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="support-name">Nombre y apellido</label>
              <input id="support-name" className="input" value={name} onChange={event => setName(event.target.value)} autoComplete="name" required />
            </div>
            <div>
              <label className="label" htmlFor="support-email">Email</label>
              <input id="support-email" type="email" className="input" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="support-phone">Teléfono de contacto <span className="text-steel-500">(opcional)</span></label>
            <input id="support-phone" type="tel" className="input" value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel" placeholder="+54 9 ..." />
          </div>

          <div>
            <label className="label" htmlFor="support-description">{title}</label>
            <textarea
              id="support-description"
              className="input min-h-[120px] resize-y"
              rows={5}
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder={requestType === 'problem' ? 'Contanos qué estabas intentando hacer, qué ocurrió y qué esperabas que sucediera.' : 'Contanos qué te gustaría mejorar o incorporar.'}
              maxLength={4000}
              required
            />
            <div className="mt-1 text-right text-xs text-steel-500">{description.length}/4000</div>
          </div>

          <div>
            <label className="label">Prioridad</label>
            <div className="space-y-2">
              {priorityOptions.map(option => (
                <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 ${priority === option.value ? 'brand-border brand-bg-soft' : 'border-steel-700 bg-steel-900/40'}`}>
                  <input
                    type="radio"
                    name="support-priority"
                    value={option.value}
                    checked={priority === option.value}
                    onChange={() => setPriority(option.value)}
                    className="brand-checkbox mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="block text-sm font-medium text-steel-200">{option.label}</span>
                    <span className="block text-xs leading-relaxed text-steel-500">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Imagen adjunta <span className="text-steel-500">(opcional)</span></label>
            {attachment ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-steel-700 bg-steel-900/60 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-steel-200">{attachment.name}</div>
                  <div className="mt-0.5 text-xs text-steel-500">{formatBytes(attachment.size)} · se comprimirá antes de alojarse</div>
                </div>
                <button type="button" onClick={() => setAttachment(null)} className="rounded-lg p-2 text-steel-400 hover:bg-steel-800 hover:text-red-300" aria-label="Quitar imagen">
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-steel-600 bg-steel-900/40 px-4 py-5 text-sm text-steel-400 transition-colors hover:border-steel-500 hover:text-steel-300">
                <ImagePlus size={18} />
                Adjuntar captura o imagen
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={event => setAttachment(event.target.files?.[0] || null)}
                />
              </label>
            )}
            <p className="mt-2 text-xs leading-relaxed text-steel-500">JPG, PNG o WEBP. Máximo 10 MB antes de comprimir.</p>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-steel-700 bg-steel-950/50 px-3 py-2.5 text-xs leading-relaxed text-steel-500">
            <ShieldAlert size={15} className="mt-0.5 flex-shrink-0" />
            Usaremos estos datos únicamente para entender el reporte y poder contactarte si necesitamos más información.
          </div>

          <input
            type="text"
            value={website}
            onChange={event => setWebsite(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />
        </form>
      )}
    </Modal>
  );
}
