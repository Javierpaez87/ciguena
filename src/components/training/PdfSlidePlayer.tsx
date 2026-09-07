import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface PdfSlidePlayerProps {
  slidesPath: string;
  totalSlides: number;
  initialSlide?: number;
  title?: string;
  onSlideChange?: (slide: number) => void;
  onReachEnd?: () => void;
}

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape') => Promise<void>;
  unlock?: () => void;
};

function clampSlide(slide: number, totalSlides: number) {
  if (totalSlides <= 0) return 1;
  return Math.min(Math.max(slide, 1), totalSlides);
}

function getIsPortrait() {
  if (typeof window === 'undefined') return false;
  return window.innerHeight > window.innerWidth;
}

export default function PdfSlidePlayer({
  slidesPath,
  totalSlides,
  initialSlide = 1,
  title = 'Material de capacitación',
  onSlideChange,
  onReachEnd,
}: PdfSlidePlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const nativeFullscreenRequestedRef = useRef(false);

  const [currentSlide, setCurrentSlide] = useState(() => clampSlide(initialSlide, totalSlides));
  const [imageError, setImageError] = useState(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [isPortrait, setIsPortrait] = useState(getIsPortrait);

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

  const releaseOrientationLock = useCallback(() => {
    const orientation = screen.orientation as LockableScreenOrientation | undefined;
    try {
      orientation?.unlock?.();
    } catch {
      // Algunos navegadores no permiten unlock; no afecta el fallback visual.
    }
  }, []);

  const exitFullscreenMode = useCallback(async () => {
    releaseOrientationLock();

    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Si el navegador bloquea la salida nativa, igual cerramos el modo visual.
      }
    }

    nativeFullscreenRequestedRef.current = false;
    setIsFullscreenMode(false);
  }, [releaseOrientationLock]);

  const enterFullscreenMode = useCallback(async () => {
    setIsFullscreenMode(true);
    setIsPortrait(getIsPortrait());

    const element = playerRef.current;
    if (!element) return;

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
        nativeFullscreenRequestedRef.current = true;
      }
    } catch {
      // Safari/iOS puede no permitir fullscreen nativo en todos los casos.
      // El modo fixed + rotación CSS de abajo sigue funcionando como fallback.
      nativeFullscreenRequestedRef.current = false;
    }

    try {
      const orientation = screen.orientation as LockableScreenOrientation | undefined;
      await orientation?.lock?.('landscape');
    } catch {
      // iOS/Safari suele no permitir bloquear orientación.
      // Si el teléfono sigue vertical, rotamos visualmente el player 90°.
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && currentSlide > 1) {
        goToSlide(currentSlide - 1);
      }

      if (event.key === 'ArrowRight' && currentSlide < totalSlides) {
        goToSlide(currentSlide + 1);
      }

      if (event.key === 'Escape' && isFullscreenMode && !document.fullscreenElement) {
        setIsFullscreenMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, goToSlide, isFullscreenMode, totalSlides]);

  useEffect(() => {
    const updateOrientation = () => setIsPortrait(getIsPortrait());

    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (
        nativeFullscreenRequestedRef.current &&
        !document.fullscreenElement
      ) {
        nativeFullscreenRequestedRef.current = false;
        releaseOrientationLock();
        setIsFullscreenMode(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [releaseOrientationLock]);

  useEffect(() => {
    if (!isFullscreenMode) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreenMode]);

  useEffect(() => {
    return () => {
      releaseOrientationLock();
    };
  }, [releaseOrientationLock]);

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

  const shouldRotateFullscreen = isFullscreenMode && isPortrait;

  return (
    <div
      ref={playerRef}
      className={isFullscreenMode ? 'fixed inset-0 z-[9999] bg-black' : 'w-full bg-petroleum-950'}
    >
      <div
        className={isFullscreenMode ? 'flex flex-col overflow-hidden bg-black' : 'w-full bg-petroleum-950'}
        style={
          isFullscreenMode
            ? shouldRotateFullscreen
              ? {
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: '100vh',
                  height: '100vw',
                  transform: 'translate(-50%, -50%) rotate(90deg)',
                  transformOrigin: 'center center',
                }
              : {
                  width: '100vw',
                  height: '100vh',
                }
            : undefined
        }
      >
        <div
          className={
            isFullscreenMode
              ? 'relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black'
              : 'relative flex min-h-[220px] items-center justify-center overflow-hidden bg-black sm:min-h-[320px] lg:min-h-[460px]'
          }
        >
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
              className={
                isFullscreenMode
                  ? 'block h-full w-full select-none object-contain'
                  : 'block h-auto max-h-[72vh] w-full select-none object-contain'
              }
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

          <div className="order-first flex items-center justify-center gap-3 text-center sm:order-none">
            <div>
              <div className="text-sm font-semibold text-steel-100">
                {currentSlide} / {totalSlides}
              </div>
              <div className="hidden text-[11px] text-steel-500 sm:block">
                Usá los botones o las flechas del teclado
              </div>
            </div>

            <button
              type="button"
              onClick={isFullscreenMode ? exitFullscreenMode : enterFullscreenMode}
              className="btn-secondary justify-center whitespace-nowrap text-xs"
              aria-label={isFullscreenMode ? 'Salir de pantalla completa' : 'Abrir en pantalla completa'}
            >
              {isFullscreenMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              {isFullscreenMode ? 'Salir' : 'Pantalla completa'}
            </button>
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
    </div>
  );
}
