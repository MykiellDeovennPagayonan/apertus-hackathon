import { type ReactNode, useEffect, useRef } from "react";

/** One focused settings surface, with native focus trapping and Escape dismissal. */
export function ComponentDialog({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) {
      opener.current = document.activeElement as HTMLElement;
      if (!dialog.current?.open) dialog.current?.showModal();
    } else if (dialog.current?.open) {
      dialog.current.close();
      if (opener.current?.isConnected) opener.current.focus();
    }
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className={`component-dialog ${wide ? "is-wide" : ""}`}
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button type="button" aria-label="Close settings" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="component-dialog-body">{children}</div>
      <footer>
        <button type="button" className="builder-primary" onClick={onClose}>
          Done
        </button>
      </footer>
    </dialog>
  );
}
