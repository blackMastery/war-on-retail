import { useEffect, useRef, type RefObject } from 'react';

type InitialFocus = 'panel' | 'first' | RefObject<HTMLElement | null> | false;

type Options = {
  /** Whether the dialog/drawer is currently open. */
  open: boolean;
  /** Called when the user presses Escape. */
  onClose: () => void;
  /** The dialog panel — the focus-trap boundary. Needs `tabIndex={-1}` for `initialFocus: 'panel'`. */
  panelRef: RefObject<HTMLElement | null>;
  /** The control that opened the dialog — focus returns here when it closes. */
  triggerRef: RefObject<HTMLElement | null>;
  /** What receives focus when the dialog opens. Defaults to the panel itself. */
  initialFocus?: InitialFocus;
  /** When true, only move focus in on a fine pointer (avoids summoning the soft keyboard). */
  autoFocusFinePointerOnly?: boolean;
};

// Matches the historical selector in Chatbot.tsx so trap behaviour is identical.
const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled])';

/**
 * Gives a modal dialog/drawer its keyboard semantics: Escape to close, a Tab
 * focus-trap inside `panelRef`, focus moved in on open, and focus restored to
 * `triggerRef` on close.
 *
 * It deliberately owns *only* keyboard/focus. Scroll-lock stays with the caller's
 * own `useBodyScrollLock(...)`, and ARIA (`role="dialog"`, `aria-modal`,
 * `aria-label`) stays on the caller's markup.
 *
 * Focus restore fires the instant `open` flips true→false — not in a cleanup —
 * so it works even when the panel unmounts behind a Framer `AnimatePresence`
 * exit animation (restoring on node removal would drop focus to `<body>`). The
 * trigger lives in always-mounted chrome, so it's present at restore time.
 */
export function useDialogA11y({
  open,
  onClose,
  panelRef,
  triggerRef,
  initialFocus = 'panel',
  autoFocusFinePointerOnly = false,
}: Options): void {
  // Escape closes. Restore is handled separately so every close path funnels
  // through one place (no double-focus).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Tab focus-trap — keep Tab inside the open panel.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const focusables = panel!.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    panel.addEventListener('keydown', onKeyDown);
    return () => panel.removeEventListener('keydown', onKeyDown);
  }, [open, panelRef]);

  // Initial focus on open.
  useEffect(() => {
    if (!open) return;
    if (initialFocus === false) return;
    if (autoFocusFinePointerOnly && !window.matchMedia('(pointer: fine)').matches) return;

    if (initialFocus === 'panel') {
      panelRef.current?.focus();
    } else if (initialFocus === 'first') {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    } else {
      initialFocus.current?.focus();
    }
  }, [open, initialFocus, panelRef, autoFocusFinePointerOnly]);

  // Restore focus to the trigger the moment the dialog closes.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open, triggerRef]);
}
