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
  const [zoom, setZoom] = useState(100);
  const [fitMode, setFitMode] = useState('width');

  const fit = useCallback((mode) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    // Leave room for the centered canvas padding so Fit width never creates a
    // horizontal scrollbar at the default zoom.
    const safeWidth = Math.max(1, viewport.clientWidth - 96);
    const safeHeight = Math.max(1, viewport.clientHeight - 96);
    const widthScale = safeWidth / A4_WIDTH;
    const nextZoom = mode === 'page'
      ? Math.min(widthScale, safeHeight / A4_HEIGHT) * 100
      : widthScale * 100;
    setZoom(clampZoom(nextZoom));
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

  return (
    <div className="resume-viewer-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="resume-viewer" role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()}>
        <header className="resume-viewer-toolbar">
          <h2>{title}</h2>
          <div className="resume-viewer-controls" role="toolbar" aria-label="Resume preview controls">
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
            <button type="button" className="resume-viewer-icon-button resume-viewer-close" onClick={onClose} aria-label="Close preview" title="Close preview">
              <ResumeIcon name="close" size={19} />
            </button>
          </div>
        </header>
        <div className="resume-viewer-viewport" ref={viewportRef} tabIndex="0" aria-label="Scrollable resume preview">
          <div className="resume-viewer-canvas">
            {renderResume?.({ viewerScale: zoom / 100 })}
          </div>
        </div>
        {footer && <footer className="resume-viewer-footer">{footer}</footer>}
      </section>
    </div>
  );
}
