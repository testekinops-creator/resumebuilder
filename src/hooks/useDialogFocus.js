import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(dialog) {
  return [...(dialog?.querySelectorAll(FOCUSABLE_SELECTOR) || [])]
    .filter(element => element.getAttribute('aria-hidden') !== 'true');
}

/** Provides the common Escape, focus trap, and focus-return dialog behavior. */
export function useDialogFocus(dialogRef, { onClose, initialFocusRef, enabled = true } = {}) {
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!enabled) return undefined;

    previousFocusRef.current = document.activeElement;
    const focusFrame = window.requestAnimationFrame(() => {
      const initialTarget = initialFocusRef?.current;
      if (initialTarget?.isConnected) initialTarget.focus({ preventScroll: true });
      else dialogRef.current?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusable(dialogRef.current);
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current?.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [dialogRef, enabled, initialFocusRef]);
}
