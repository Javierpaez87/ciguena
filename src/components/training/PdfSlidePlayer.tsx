import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';

interface PdfSlidePlayerProps {
  slidesPath: string;
  totalSlides: number;
  initialSlide?: number;
  title?: string;
  onSlideChange?: (slide: number) => void;
  onReachEnd?: () => void;
}

function clampSlide(slide: number, totalSlides: number) {
  if (totalSlides <= 0) return 1;
  return Math.min(Math.max(slide, 1), totalSlides);
}

export default function PdfSlidePlayer({
  slidesPath,
  totalSlides,
  initialSlide = 1,
  title = 'Material de capacitación',
  onSlideChange,
  onReachEnd,
}: PdfSlidePlayerProps) {
  const [currentSlide, setCurrentSlide] = useState(() => clampSlide(initialSlide, totalSlides));
  const [imageError, setImageError] = useState(false);

  const normalizedPath = useMemo(() => slidesPath.replace(/\/$/, ''), [slidesPath]);
  const currentSlideUrl = `${normalizedPath}/slide-${String(currentSlide).padStart(2, '0')}.webp`;

  const goToSlide = useCallback((nextSlide: number) => {
    const safeSlide = clampSlide(nextSlide, totalSlides);
    setImageError(false);
    setCurrentSlide(safeSlide);
    onSlideChange?.(safeSlide);

    if (safeSlide === totalSlides) {
      onReachEnd?.();
    }
  }, [onReachEnd, onSlideChange, totalSlides]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && currentSlide > 1) {
        goToSlide(currentSlide - 1);
      }

      if (event.key === 'ArrowRight' && currentSlide < totalSlides) {
        goToSlide(currentSlide + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, goToSlide, totalSlides]);

  if (totalSlides <= 0) {
    return (
      <div className="min-h-[260px] flex items-center justify-center p-6 text-center">
        <div>
          <FileText size={36} className="mx-auto mb-3 text-steel-500" />
          <p className="text-sm text-steel-300">No hay slides disponibles para este material.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-petroleum-950">
      <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden bg-black sm:min-h-[320px] lg:min-h-[460px]">
        {imageError ? (
          <div className="p-6 text-center">
            <FileText size={36} className="mx-auto mb-3 text-steel-500" />
            <p className="text-sm text-steel-300">No pudimos cargar este slide.</p>
            <p className="mt-1 text-xs text-steel-500">Slide {currentSlide} de {totalSlides}</p>
          </div>
        ) : (
          <img
            key={currentSlideUrl}
            src={currentSlideUrl}
            alt={`${title} · slide ${currentSlide} de ${totalSlides}`}
            className="block h-auto max-h-[72vh] w-full object-contain"
            draggable={false}
            onError={() => setImageError(true)}
          />
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-steel-800 bg-steel-950 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <button
          type="button"
          onClick={() => goToSlide(currentSlide - 1)}
          disabled={currentSlide === 1}
          className="btn-secondary justify-center text-xs disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[120px]"
        >
          <ChevronLeft size={15} /> Anterior
        </button>

        <div className="order-first text-center sm:order-none">
          <div className="text-sm font-semibold text-steel-100">
            {currentSlide} / {totalSlides}
          </div>
          <div className="text-[11px] text-steel-500">Usá los botones o las flechas del teclado</div>
        </div>

        <button
          type="button"
          onClick={() => goToSlide(currentSlide + 1)}
          disabled={currentSlide === totalSlides}
          className="btn-primary justify-center text-xs disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[120px]"
        >
          Siguiente <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
