import type { KeyboardEvent } from "react";

/** Arrow keys, Enter, and Escape for a combobox whose listbox is not focused. */
export function onComboKeyDown(
  event: KeyboardEvent<HTMLElement>,
  active: number,
  count: number,
  setActive: (index: number) => void,
  onCommit: (index: number) => void,
  onEscape: () => void,
): void {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    onEscape();
    return;
  }
  if (!count) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    setActive(Math.min(active + 1, count - 1));
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    setActive(Math.max(active - 1, 0));
  } else if (event.key === "Home") {
    event.preventDefault();
    setActive(0);
  } else if (event.key === "End") {
    event.preventDefault();
    setActive(count - 1);
  } else if (event.key === "Enter") {
    event.preventDefault();
    onCommit(active);
  }
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keep Tab inside a dialog. Options with tabindex="-1" stay out of the cycle. */
export function trapTab(event: KeyboardEvent<HTMLElement>, root: HTMLElement | null): void {
  if (event.key !== "Tab" || !root) return;
  const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.tabIndex >= 0 && el.getClientRects().length > 0,
  );
  if (!items.length) {
    event.preventDefault();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const current = document.activeElement;
  if (event.shiftKey && (current === first || !root.contains(current))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (current === last || !root.contains(current))) {
    event.preventDefault();
    first.focus();
  }
}
