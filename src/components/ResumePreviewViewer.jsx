import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import ResumeIcon from './ResumeIcon';
import './ResumePreviewViewer.css';

// The native CSS A4 canvas used by ResumePreview (210mm x 297mm at 96dpi).
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const MIN_ZOOM = 25;
const MAX_ZOOM = 150;

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value)));
}

/**
 * Shared document-viewer chrome for every rendered resume. Templates only
 * render the document; this component owns fit, zoom, centering and scrolling.
 */
export default function ResumePreviewViewer({
  title = 'Resume preview',
  onClose,
  renderResume,
  footer,
}) {
  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
  const pinchRef = useRef(null);
  const [zoom, setZoom] = useState(100);
  const [fitMode, setFitMode] = useState('width');
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const fit = useCallback((mode) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const canvas = canvasRef.current;
    const canvasStyle = canvas ? window.getComputedStyle(canvas) : null;
    const horizontalPadding = canvasStyle
      ? parseFloat(canvasStyle.paddingLeft) + parseFloat(canvasStyle.paddingRight)
      : 0;
    const verticalPadding = canvasStyle
      ? parseFloat(canvasStyle.paddingTop) + parseFloat(canvasStyle.paddingBottom)
      : 0;
    const safeWidth = Math.max(1, viewport.clientWidth - horizontalPadding);
    const safeHeight = Math.max(1, viewport.clientHeight - verticalPadding);
    const widthScale = safeWidth / A4_WIDTH;
    const nextZoom = mode === 'page'
      ? Math.min(widthScale, safeHeight / A4_HEIGHT) * 100
      : widthScale * 100;
    // Fit modes must never round upward: even a sub-percent overshoot can add
    // a horizontal scrollbar at narrow phone and laptop widths.
    setZoom(clampZoom(Math.floor(nextZoom)));
    setFitMode(mode);
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const resizeObserver = new ResizeObserver(() => {
      if (fitMode) fit(fitMode);
    });
    resizeObserver.observe(viewport);
    if (fitMode) fit(fitMode);
    return () => resizeObserver.disconnect();
  }, [fit, fitMode]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const measurePages = () => {
      const page = canvas.querySelector('.preview-page');
      const nextCount = Math.max(1, Math.ceil((page?.scrollHeight || A4_HEIGHT) / A4_HEIGHT));
      setPageCount(nextCount);
      setCurrentPage(current => Math.min(current, nextCount));
    };

    measurePages();
    const observer = new ResizeObserver(measurePages);
    observer.observe(canvas);
    const page = canvas.querySelector('.preview-page');
    if (page) observer.observe(page);
    return () => observer.disconnect();
  }, [renderResume, zoom]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const updateCurrentPage = () => {
      const canvas = canvasRef.current;
      const canvasStyle = canvas ? window.getComputedStyle(canvas) : null;
      const paddingTop = canvasStyle ? parseFloat(canvasStyle.paddingTop) || 0 : 0;
      const pageHeight = A4_HEIGHT * (zoom / 100);
      const relativeTop = Math.max(0, viewport.scrollTop - paddingTop);
      setCurrentPage(Math.min(pageCount, Math.max(1, Math.floor((relativeTop + pageHeight * 0.35) / pageHeight) + 1)));
    };

    viewport.addEventListener('scroll', updateCurrentPage, { passive: true });
    updateCurrentPage();
    return () => viewport.removeEventListener('scroll', updateCurrentPage);
  }, [pageCount, zoom]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;

    // The page behind the modal must not keep a second, detached scrollbar.
    // Only the document viewport inside this viewer is scrollable while open.
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  const changeZoom = (amount) => {
    setFitMode('');
    setZoom(current => clampZoom(current + amount));
  };

  const resetZoom = () => {
    setFitMode('');
    setZoom(100);
  };

  const goToPage = (pageNumber) => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) return;
    const nextPage = Math.min(pageCount, Math.max(1, pageNumber));
    const canvasStyle = window.getComputedStyle(canvas);
    const paddingTop = parseFloat(canvasStyle.paddingTop) || 0;
    viewport.scrollTo({
      top: paddingTop + ((nextPage - 1) * A4_HEIGHT * (zoom / 100)),
      behavior: 'smooth',
    });
    setCurrentPage(nextPage);
  };

  const touchDistance = (touches) => {
    const first = touches[0];
    const second = touches[1];
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
  };

  const handleTouchStart = (event) => {
    if (event.touches.length !== 2) return;
    pinchRef.current = { distance: touchDistance(event.touches), zoom };
    setFitMode('');
  };

  const handleTouchMove = (event) => {
    if (event.touches.length !== 2 || !pinchRef.current) return;
    event.preventDefault();
    const scale = touchDistance(event.touches) / Math.max(1, pinchRef.current.distance);
    setZoom(clampZoom(pinchRef.current.zoom * scale));
  };

  const handleTouchEnd = (event) => {
    if (event.touches.length < 2) pinchRef.current = null;
  };

  return (
    <div className="resume-viewer-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="resume-viewer" role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()}>
        <header className="resume-viewer-toolbar">
          <h2>{title}</h2>
          <div className="resume-viewer-controls" role="toolbar" aria-label="Resume preview controls">
            <div className="resume-viewer-scroll-controls">
              <button type="button" className="resume-viewer-icon-button" onClick={() => changeZoom(-10)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out" title="Zoom out">
                <ResumeIcon name="zoomOut" size={18} />
              </button>
              <output className="resume-viewer-zoom" aria-live="polite">{zoom}%</output>
              <button type="button" className="resume-viewer-icon-button" onClick={() => changeZoom(10)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in" title="Zoom in">
                <ResumeIcon name="zoomIn" size={18} />
              </button>
              <span className="resume-viewer-divider" aria-hidden="true" />
              <button type="button" className={`resume-viewer-control ${fitMode === 'width' ? 'is-active' : ''}`} onClick={() => fit('width')}>Fit width</button>
              <button type="button" className={`resume-viewer-control ${fitMode === 'page' ? 'is-active' : ''}`} onClick={() => fit('page')}>Fit page</button>
              <button type="button" className="resume-viewer-control resume-viewer-reset" onClick={resetZoom}>100%</button>
              <span className="resume-viewer-divider" aria-hidden="true" />
              <button type="button" className="resume-viewer-icon-button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} aria-label="Previous resume page" title="Previous page">
                <ResumeIcon name="arrowLeft" size={17} />
              </button>
              <output className="resume-viewer-page" aria-live="polite">Page {currentPage} of {pageCount}</output>
              <button type="button" className="resume-viewer-icon-button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= pageCount} aria-label="Next resume page" title="Next page">
                <ResumeIcon name="arrowRight" size={17} />
              </button>
            </div>
            <button type="button" className="resume-viewer-icon-button resume-viewer-close" onClick={onClose} aria-label="Close preview" title="Close preview">
              <ResumeIcon name="close" size={19} />
            </button>
          </div>
        </header>
        <div
          className="resume-viewer-viewport"
          ref={viewportRef}
          tabIndex="0"
          aria-label="Scrollable resume preview"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div className="resume-viewer-canvas" ref={canvasRef}>
            {renderResume?.({ viewerScale: zoom / 100 })}
          </div>
        </div>
        {footer && <footer className="resume-viewer-footer">{footer}</footer>}
      </section>
    </div>
  );
}
