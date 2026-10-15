import { type ReactNode, useEffect, useRef } from "react";
import { BuilderIcon, type BuilderIconName } from "./BuilderIcon";
import "./surfaces.css";

/** One focused settings surface, with native focus trapping and Escape dismissal. */
export function ComponentDialog({
  open,
  title,
  subtitle,
  onClose,
  children,
  wide = false,
  footerLabel = "Close",
  footerPrimary = false,
  className = "",
  icon = "settings",
  footerNote,
  footerActions,
  dismissDisabled = false,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  footerLabel?: string;
  footerPrimary?: boolean;
  className?: string;
  icon?: BuilderIconName;
  footerNote?: string;
  footerActions?: ReactNode;
  dismissDisabled?: boolean;
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
          if (!dismissDisabled) onClose();
        }
      }}
      onCancel={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        if (!dismissDisabled) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !dismissDisabled) onClose();
      }}
    >
      <header>
        <span className="component-dialog-icon">
          <BuilderIcon name={icon} />
        </span>
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="component-dialog-type">{subtitle}</p>}
        </div>
        <button
          type="button"
          aria-label={`Close ${title}`}
          disabled={dismissDisabled}
          onClick={onClose}
        >
          <BuilderIcon name="close" />
        </button>
      </header>
      <div className="component-dialog-body">{children}</div>
      <footer>
        {footerNote && <p className="component-dialog-note">{footerNote}</p>}
        {footerActions}
        <button
          type="button"
          className={
            footerPrimary
              ? "builder-primary component-dialog-close"
              : "component-dialog-close"
          }
          disabled={dismissDisabled}
          onClick={onClose}
        >
          {footerLabel}
        </button>
      </footer>
    </dialog>
  );
}
