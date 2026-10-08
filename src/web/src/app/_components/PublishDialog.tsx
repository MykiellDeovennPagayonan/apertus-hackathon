"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { listCommunity, publishProject } from "../../lib/projects/client";
import type { Project, Publication } from "../../lib/projects/types";
import { publicPayload } from "../../lib/projects/validation";
import NameAvailability from "./NameAvailability";
export default function PublishDialog({
  project,
  ownerId,
  onClose,
  onPublished,
}: {
  project: Project;
  ownerId: string;
  onClose: () => void;
  onPublished: (p: Publication) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(project.name),
    [description, setDescription] = useState(project.description),
    [tags, setTags] = useState(project.tags.join(", "));
  const [license, setLicense] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [published, setPublished] = useState<Publication | null>(null);
  const candidate = useMemo(() => {
    try {
      return {
        payload: publicPayload(project.projectType, project.payload),
        error: "",
      };
    } catch (error) {
      return {
        payload: undefined,
        error:
          error instanceof Error
            ? error.message
            : "This project is not ready to publish.",
      };
    }
  }, [project.projectType, project.payload]);
  const key = useRef(crypto.randomUUID());
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  useEffect(() => {
    let disposed = false;
    if (project.lastPublishedVersionNumber) {
      setName(
        `${Array.from(project.name).slice(0, 80).join("")} — Version ${project.lastPublishedVersionNumber + 1}`,
      );
      return;
    }
    if (project.seriesId)
      void listCommunity(undefined, "", "", null, undefined, project.seriesId)
        .then((result) => {
          if (!disposed) {
            const latest = Math.max(
              0,
              ...result.entries.map((p) => p.versionNumber),
            );
            setName(
              `${Array.from(project.name).slice(0, 80).join("")} — Version ${latest + 1}`,
            );
          }
        })
        .catch(() => {});
    return () => {
      disposed = true;
    };
  }, [project]);
  const change = () => {
    key.current = crypto.randomUUID();
    setError("");
  };
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await publishProject(project, ownerId, {
        name,
        description,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        licenseAccepted: license,
        idempotencyKey: key.current,
      });
      setPublished(result);
      onPublished(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publishing failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <dialog
      ref={dialog}
      className="project-dialog"
      aria-labelledby="publish-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id="publish-title">
        {published
          ? "Published to the community"
          : "Review community publication"}
      </h2>
      {published ? (
        <>
          <p>
            Your published snapshot stays unchanged when you edit your private
            project.
          </p>
          <Link href={`/community/${published.publicationId}`}>
            View {published.name}
          </Link>
          <button onClick={onClose} type="button">
            Done
          </button>
        </>
      ) : (
        <>
          <p>
            Publishing shares a copy of your saved {project.projectType}.
            Editing it later requires publishing a new version with a different
            name.
          </p>
          <p>
            Saved revision {project.saveRevision} · {project.projectType} ·{" "}
            {project.basedOn
              ? `Remixed from ${project.basedOn.name}`
              : "Original project"}
          </p>
          <label>
            Public name
            <input
              maxLength={100}
              value={name}
              disabled={busy}
              onChange={(e) => {
                change();
                setName(e.target.value);
              }}
            />
          </label>
          <NameAvailability
            name={name}
            owner={ownerId}
            type={project.projectType}
            publicName
          />
          <label>
            Description
            <textarea
              maxLength={2000}
              value={description}
              disabled={busy}
              onChange={(e) => {
                change();
                setDescription(e.target.value);
              }}
            />
          </label>
          <label>
            Tags, separated by commas
            <input
              value={tags}
              disabled={busy}
              onChange={(e) => {
                change();
                setTags(e.target.value);
              }}
            />
          </label>
          <details>
            <summary>Content included in this snapshot</summary>
            <p>
              All authored graph content, component settings, exposed
              parameters, ports, and embedded datasets will be public. Recovery
              copies are excluded.
            </p>
            <pre>{JSON.stringify(candidate.payload, null, 2)}</pre>
          </details>
          <label className="project-check">
            <input
              type="checkbox"
              checked={license}
              disabled={busy}
              onChange={(e) => {
                change();
                setLicense(e.target.checked);
              }}
            />
            I have permission to share all included content under{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY 4.0
            </a>
            , including attribution when others reuse it.
          </label>
          {candidate.error && <p role="alert">{candidate.error}</p>}
          {error && <p role="alert">{error}</p>}
          <div className="project-actions">
            <button type="button" disabled={busy} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              disabled={
                busy ||
                !license ||
                !name.trim() ||
                !project.sharingAllowed ||
                !candidate.payload
              }
              onClick={() => void submit()}
            >
              {busy ? "Publishing…" : "Publish snapshot"}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
