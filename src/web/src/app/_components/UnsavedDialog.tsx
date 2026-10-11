"use client";
import { useEffect, useRef } from "react";
export default function UnsavedDialog({
  account,
  busy,
  onSave,
  onDiscard,
  onCancel,
  onDownload,
  onPublish,
}: {
  account: boolean;
  busy: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  onDownload: () => void;
  onPublish?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="project-dialog"
      aria-labelledby="unsaved-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id="unsaved-title">Keep your changes first?</h2>
      <p>
        Your canvas has unsaved changes. Save them before continuing, or discard
        them. Existing community publications stay unchanged.
      </p>
      <div className="project-actions">
        <button type="button" disabled={busy} onClick={onSave}>
          {busy
            ? "Saving…"
            : account
              ? "Save to account & continue"
              : "Save on device & continue"}
        </button>
        <button type="button" disabled={busy} onClick={onDownload}>
          Download recipe
        </button>
        {onPublish && (
          <button type="button" disabled={busy} onClick={onPublish}>
            Publish & continue
          </button>
        )}
        <button type="button" disabled={busy} onClick={onDiscard}>
          Discard changes
        </button>
        <button type="button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
      <p>
        Downloading keeps this dialog open so you can decide when to continue.
      </p>
    </dialog>
  );
}
