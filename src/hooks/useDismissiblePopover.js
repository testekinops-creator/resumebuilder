import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  '[role="menuitem"]:not([disabled])',
  'button:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Gives small anchored menus one predictable dismissal model without turning
 * them into modals: outside pointer-down closes them, Escape restores the
 * trigger focus, and keyboard opening moves focus into the menu.
 */
export function useDismissiblePopover({ open, onClose, triggerRef, popoverRef }) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const focusFrame = window.requestAnimationFrame(() => {
      popoverRef.current?.querySelector(FOCUSABLE_SELECTOR)?.focus({ preventScroll: true });
    });

    const close = ({ restoreFocus = false } = {}) => {
      onCloseRef.current?.();
      if (restoreFocus) {
        window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
      }
    };

    const onPointerDown = (event) => {
      if (triggerRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) return;
      close();
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close({ restoreFocus: true });
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, popoverRef, triggerRef]);
}
