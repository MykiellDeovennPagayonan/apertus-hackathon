"use client";
import { useState } from "react";
import { BuilderIcon } from "../../simulations/builder/BuilderIcon";
import { ComponentDialog } from "../../simulations/builder/ComponentDialog";
export default function UnsavedDialog({
  account,
  busy,
  experimentName,
  error,
  onSave,
  onDiscard,
  onCancel,
  onDownload,
  onPublish,
}: {
  account: boolean;
  busy: boolean;
  experimentName?: string;
  error?: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  onDownload: () => void;
  onPublish?: () => void;
}) {
  const [attempted, setAttempted] = useState(false);
  return (
    <ComponentDialog
      open
      title="Save changes before leaving?"
      subtitle="Unsaved changes"
      icon="warning"
      className="unsaved-dialog"
      dismissDisabled={busy}
      onClose={onCancel}
      footerLabel="Keep editing"
      footerActions={
        <button
          type="button"
          className="builder-primary"
          disabled={busy}
          onClick={() => {
            setAttempted(true);
            onSave();
          }}
        >
          {busy ? "Saving…" : "Save & continue"}
        </button>
      }
    >
      <p className="unsaved-intro">
        Your changes to{" "}
        <strong>{experimentName || "Untitled experiment"}</strong> haven’t been
        saved.
      </p>
      <p className="unsaved-destination">
        <BuilderIcon name="folder" />{" "}
        {account
          ? "Save a private copy to your account before continuing."
          : "Save a copy on this device before continuing."}
      </p>
      {attempted && !busy && error && (
        <div className="unsaved-error" role="alert">
          <BuilderIcon name="warning" />
          <div>
            <strong>Your changes still need saving</strong>
            <p>{error}</p>
          </div>
        </div>
      )}
      <div className="unsaved-copy">
        <BuilderIcon name="download" />
        <div>
          <h3>Keep a portable copy</h3>
          <p>
            Download a recipe to reopen your experiment later. This dialog stays
            open.
          </p>
        </div>
        <button type="button" disabled={busy} onClick={onDownload}>
          Download a copy
        </button>
      </div>
      <div className="unsaved-alternatives">
        {onPublish && (
          <button type="button" disabled={busy} onClick={onPublish}>
            <BuilderIcon name="share" /> Publish & continue
          </button>
        )}
        <button
          type="button"
          className="unsaved-discard"
          style={{ padding: "14px 22px", gap: 12 }}
          disabled={busy}
          onClick={onDiscard}
        >
          <BuilderIcon name="trash" /> <span>Discard changes</span>
        </button>
      </div>
    </ComponentDialog>
  );
}
