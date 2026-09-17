import { useState } from 'react';
import { LifeBuoy, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBranding } from '../../contexts/BrandingContext';
import SupportRequestModal from '../../components/support/SupportRequestModal';

export default function WorkerFeedback() {
  const { user } = useAuth();
  const { branding } = useBranding();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="mx-auto max-w-2xl">
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border brand-border brand-bg-soft">
              <LifeBuoy size={22} className="brand-text" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-steel-100">¿Encontraste un problema o tenés una sugerencia?</h2>
              <p className="mt-2 text-sm leading-relaxed text-steel-400">
                Contanos qué pasó o qué podríamos mejorar. Podés indicar la prioridad y adjuntar una captura para ayudarnos a entenderlo mejor.
              </p>

              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="btn-primary mt-5 justify-center"
              >
                <MessageSquare size={16} />
                Reportar problema o sugerencia
              </button>
            </div>
          </div>
        </div>
      </div>

      <SupportRequestModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        source="platform"
        tenantId={user?.tenant_id || branding.tenantId}
        defaultName={user?.full_name || ''}
        defaultEmail={user?.email || ''}
        defaultPhone={user?.profile.phone || ''}
      />
    </>
  );
}
