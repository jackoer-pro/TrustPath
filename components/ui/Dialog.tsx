"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Native <dialog> with showModal(): focus trap, Esc and focus return come from the browser. Backdrop click closes. */
export function Dialog({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // React's autoFocus runs before showModal(), so focus the marked field once the dialog is open.
      d.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto w-[min(92vw,360px)] rounded-2xl bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40"
    >
      {open && <div className="p-5">{children}</div>}
    </dialog>
  );
}
