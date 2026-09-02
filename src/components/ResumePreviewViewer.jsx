import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import ResumeIcon from './ResumeIcon';
import { useDialogFocus } from '../hooks/useDialogFocus';
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
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
  const pinchRef = useRef(null);
  const fitFrameRef = useRef(0);
  const pageMeasureFrameRef = useRef(0);
  const scrollFrameRef = useRef(0);
  const pinchFrameRef = useRef(0);
  const pendingPinchZoomRef = useRef(null);
  const canvasPaddingRef = useRef(0);
  const [zoom, setZoom] = useState(100);
  const [fitMode, setFitMode] = useState('width');
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const dismiss = useCallback(() => onClose?.(), [onClose]);

  useDialogFocus(dialogRef, { onClose: dismiss, initialFocusRef: closeButtonRef });

  useEffect(() => () => {
    window.cancelAnimationFrame(pinchFrameRef.current);
  }, []);

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
      if (!fitMode) return;
      window.cancelAnimationFrame(fitFrameRef.current);
      fitFrameRef.current = window.requestAnimationFrame(() => fit(fitMode));
    });
    resizeObserver.observe(viewport);
    if (fitMode) fit(fitMode);
    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(fitFrameRef.current);
    };
  }, [fit, fitMode]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const measurePages = () => {
      const page = canvas.querySelector('.preview-page');
      const nextCount = Math.max(1, Math.ceil((page?.scrollHeight || A4_HEIGHT) / A4_HEIGHT));
      setPageCount(nextCount);
      setCurrentPage(current => Math.min(current, nextCount));
      const styles = window.getComputedStyle(canvas);
      canvasPaddingRef.current = parseFloat(styles.paddingTop) || 0;
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(pageMeasureFrameRef.current);
      pageMeasureFrameRef.current = window.requestAnimationFrame(measurePages);
    };

    measurePages();
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(canvas);
    const page = canvas.querySelector('.preview-page');
    if (page) observer.observe(page);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(pageMeasureFrameRef.current);
    };
  }, [zoom]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const updateCurrentPage = () => {
      scrollFrameRef.current = 0;
      const pageHeight = A4_HEIGHT * (zoom / 100);
      const relativeTop = Math.max(0, viewport.scrollTop - canvasPaddingRef.current);
      setCurrentPage(Math.min(pageCount, Math.max(1, Math.floor((relativeTop + pageHeight * 0.35) / pageHeight) + 1)));
    };

    const scheduleCurrentPage = () => {
      if (scrollFrameRef.current) return;
      scrollFrameRef.current = window.requestAnimationFrame(updateCurrentPage);
    };

    viewport.addEventListener('scroll', scheduleCurrentPage, { passive: true });
    updateCurrentPage();
    return () => {
      viewport.removeEventListener('scroll', scheduleCurrentPage);
      window.cancelAnimationFrame(scrollFrameRef.current);
    };
  }, [pageCount, zoom]);

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
    if (!viewport || !canvasRef.current) return;
    const nextPage = Math.min(pageCount, Math.max(1, pageNumber));
    viewport.scrollTo({
      top: canvasPaddingRef.current + ((nextPage - 1) * A4_HEIGHT * (zoom / 100)),
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
    pendingPinchZoomRef.current = clampZoom(pinchRef.current.zoom * scale);
    if (pinchFrameRef.current) return;
    pinchFrameRef.current = window.requestAnimationFrame(() => {
      pinchFrameRef.current = 0;
      if (pendingPinchZoomRef.current !== null) setZoom(pendingPinchZoomRef.current);
      pendingPinchZoomRef.current = null;
    });
  };

  const handleTouchEnd = (event) => {
    if (event.touches.length >= 2) return;
    pinchRef.current = null;
    if (!pinchFrameRef.current) return;
    window.cancelAnimationFrame(pinchFrameRef.current);
    pinchFrameRef.current = 0;
    if (pendingPinchZoomRef.current !== null) setZoom(pendingPinchZoomRef.current);
    pendingPinchZoomRef.current = null;
  };

  return (
    <div className="resume-viewer-backdrop" role="presentation" onMouseDown={dismiss}>
      <section ref={dialogRef} className="resume-viewer" role="dialog" aria-modal="true" aria-label={title} tabIndex="-1" onMouseDown={event => event.stopPropagation()}>
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
            <button ref={closeButtonRef} type="button" className="resume-viewer-icon-button resume-viewer-close" onClick={dismiss} aria-label="Close preview" title="Close preview">
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
