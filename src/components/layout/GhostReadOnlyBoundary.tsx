import type { FormEvent, MouseEvent, ReactNode } from 'react';
import { Eye, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const WRITE_WORDS = /crear|guardar|activar|desactivar|aprobar|rechazar|asignar|enviar|firmar|importar|subir|eliminar|borrar|habilitar|deshabilitar|emitir|finalizar|completar|rendir|reintentar|actualizar|modificar|registrar|agregar|quitar|recordatorio/i;

export default function GhostReadOnlyBoundary({ children }: { children: ReactNode }) {
  const { isGhostMode, ghostSession } = useAuth();

  function blockSubmit(event: FormEvent<HTMLDivElement>) {
    if (!isGhostMode) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function blockWriteClicks(event: MouseEvent<HTMLDivElement>) {
    if (!isGhostMode) return;
    const target = event.target as HTMLElement;
    const button = target.closest('button, [role="button"]') as HTMLElement | null;
    if (!button) return;
    const text = `${button.textContent || ''} ${button.getAttribute('aria-label') || ''} ${button.getAttribute('title') || ''}`;
    const isSubmit = button instanceof HTMLButtonElement && button.type === 'submit';
    if (isSubmit || WRITE_WORDS.test(text)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  return (
    <div onSubmitCapture={blockSubmit} onClickCapture={blockWriteClicks}>
      {isGhostMode && ghostSession && (
        <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Eye size={18} className="text-amber-300 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-amber-100">Ghost View · Solo lectura</div>
              <div className="text-xs text-amber-200/70">Observando a {ghostSession.profile.full_name || ghostSession.profile.email} en {ghostSession.tenant.name}.</div>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-200"><Lock size={13} /> No se guardará ningún cambio</div>
        </div>
      )}
      {children}
    </div>
  );
}
