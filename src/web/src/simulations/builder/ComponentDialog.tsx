import { type ReactNode, useEffect, useRef } from "react";

/** One focused settings surface, with native focus trapping and Escape dismissal. */
export function ComponentDialog({
  open,
  title,
  onClose,
  children,
  wide = false,
  footerLabel = "Done",
  footerPrimary = true,
  className = "",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  footerLabel?: string;
  footerPrimary?: boolean;
  className?: string;
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
      className={`component-dialog ${wide ? "is-wide" : ""} ${className}`}
      aria-label={title}
      onKeyDown={(e) => {
        if (
          e.key === "Escape" &&
          (e.target as Element).closest("dialog") === e.currentTarget
        ) {
          e.preventDefault();
          onClose();
        }
      }}
      onCancel={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button type="button" aria-label={`Close ${title}`} onClick={onClose}>
          ×
        </button>
      </header>
      <div className="component-dialog-body">{children}</div>
      <footer>
        <button
          type="button"
          className={footerPrimary ? "builder-primary" : undefined}
          onClick={onClose}
        >
          {footerLabel}
        </button>
      </footer>
    </dialog>
  );
}
