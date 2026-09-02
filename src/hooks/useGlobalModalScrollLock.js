import { useLayoutEffect, useRef } from 'react';

// A single document-level policy keeps independently owned dialogs from
// fighting over body styles. `aria-modal` is the primary contract; the small
// legacy selector list lets older overlays participate while they are migrated.
const MODAL_SELECTOR = [
  '[aria-modal="true"]',
  'dialog[open]',
  '.auth-modal-overlay',
  '.mobile-preview-overlay',
  '.example-modal-backdrop',
  '.template-preview-modal',
].join(',');

function isVisibleModal(element) {
  if (!(element instanceof HTMLElement) || element.hidden) return false;
  const styles = window.getComputedStyle(element);
  return styles.display !== 'none' && styles.visibility !== 'hidden';
}

function hasOpenModal() {
  return [...document.querySelectorAll(MODAL_SELECTOR)].some(isVisibleModal);
}

/**
 * Locks the background exactly once while any application modal is present.
 * Fixed-body locking is reliable on iOS and preserves the document position
 * when the final overlay closes. Modal components keep ownership of focus and
 * dismissal; this hook owns only the shared scroll boundary.
 */
export function useGlobalModalScrollLock() {
  const lockRef = useRef(null);

  useLayoutEffect(() => {
    const lock = () => {
      if (lockRef.current || !hasOpenModal()) return;

      const body = document.body;
      const root = document.documentElement;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      lockRef.current = {
        scrollX,
        scrollY,
        bodyStyle: body.getAttribute('style'),
        rootStyle: root.getAttribute('style'),
      };

      root.dataset.modalScrollLock = 'true';
      body.dataset.modalScrollLock = 'true';
      // `position: fixed` avoids iOS Safari's rubber-band scroll leak while
      // retaining the exact origin for restoration after the last dialog.
      root.style.overflow = 'hidden';
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.left = `-${scrollX}px`;
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
    };

    const unlock = () => {
      const lockState = lockRef.current;
      if (!lockState || hasOpenModal()) return;

      const body = document.body;
      const root = document.documentElement;
      if (lockState.bodyStyle === null) body.removeAttribute('style');
      else body.setAttribute('style', lockState.bodyStyle);
      if (lockState.rootStyle === null) root.removeAttribute('style');
      else root.setAttribute('style', lockState.rootStyle);
      delete root.dataset.modalScrollLock;
      delete body.dataset.modalScrollLock;
      lockRef.current = null;

      // Restore after styles are released so browsers do not clamp the value
      // against the temporary fixed viewport.
      window.requestAnimationFrame(() => {
        window.scrollTo(lockState.scrollX, lockState.scrollY);
      });
    };

    const sync = () => {
      if (hasOpenModal()) lock();
      else unlock();
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-modal', 'class', 'hidden', 'open', 'style'],
    });
    sync();

    return () => {
      observer.disconnect();
      const lockState = lockRef.current;
      if (!lockState) return;
      const body = document.body;
      const root = document.documentElement;
      if (lockState.bodyStyle === null) body.removeAttribute('style');
      else body.setAttribute('style', lockState.bodyStyle);
      if (lockState.rootStyle === null) root.removeAttribute('style');
      else root.setAttribute('style', lockState.rootStyle);
      delete root.dataset.modalScrollLock;
      delete body.dataset.modalScrollLock;
      lockRef.current = null;
      window.scrollTo(lockState.scrollX, lockState.scrollY);
    };
  }, []);
}
