"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { listCommunity, publishProject } from "../../lib/projects/client";
import type { Project, Publication } from "../../lib/projects/types";
import { publicPayload } from "../../lib/projects/validation";
import { ComponentDialog } from "../../simulations/builder/ComponentDialog";
import { HTMLComponentImport } from "../../simulations/builder/composition/HTMLComponentImport";
import type { ExperimentDocument } from "../../simulations/builder/document/types";
import type { CompositeRecipe } from "../../simulations/creation-and-editing/authoring-engine/document";
import type { VerificationReport } from "../../simulations/creation-and-editing/runtime-engine/imported/contract";
import { importedNodes } from "../../simulations/creation-and-editing/validator/componentEvidence";
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
  const [name, setName] = useState(project.name),
    [description, setDescription] = useState(project.description),
    [tags, setTags] = useState(project.tags.join(", "));
  const [license, setLicense] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [published, setPublished] = useState<Publication | null>(null);
  const [componentChecks, setComponentChecks] = useState<
    Record<string, VerificationReport>
  >({});
  const htmlNodes = importedNodes(
    project.projectType === "composition"
      ? (project.payload as CompositeRecipe).document
      : (project.payload as ExperimentDocument).authored,
  );
  const candidate = useMemo(() => {
    try {
      const checked = structuredClone(project.payload);
      const document =
        project.projectType === "composition"
          ? (checked as CompositeRecipe).document
          : (checked as ExperimentDocument).authored;
      for (const node of importedNodes(document)) {
        if (!componentChecks[node.id])
          throw new Error("Finish component checks before publishing.");
        node.configuration.verification = JSON.stringify(
          componentChecks[node.id],
        );
      }
      return {
        payload: publicPayload(project.projectType, checked),
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
  }, [project.projectType, project.payload, componentChecks]);
  const key = useRef(crypto.randomUUID());
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
        ...(htmlNodes.length ? { componentChecks } : {}),
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
    <ComponentDialog
      open
      title={
        published
          ? "Published to the community"
          : "Review community publication"
      }
      subtitle={project.name}
      icon="share"
      className="project-dialog publication-dialog"
      onClose={onClose}
      dismissDisabled={busy}
      footerLabel={published ? "Done" : "Cancel"}
      footerActions={
        !published && (
          <button
            type="button"
            className="builder-primary"
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
        )
      }
    >
      {published ? (
        <>
          <p>
            Your published snapshot stays unchanged when you edit your private
            project.
          </p>
          <Link href={`/community/${published.publicationId}`}>
            View {published.name}
          </Link>
        </>
      ) : (
        <>
          <p>
            Publishing shares a copy of your saved{" "}
            {project.contentKind ?? project.projectType}. Editing it later
            requires publishing a new version with a different name.
          </p>
          <p>
            Saved revision {project.saveRevision} · {project.projectType} ·{" "}
            {project.basedOn
              ? `Remixed from ${project.basedOn.name}`
              : "Original project"}
          </p>
          {!!htmlNodes.length && (
            <section aria-label="Publication component checks">
              <p>
                Checking the HTML in this saved snapshot. These are
                contributor-reported technical checks.
              </p>
              {htmlNodes.map((node) => (
                <HTMLComponentImport
                  key={`${node.id}/${String(node.configuration.source)}`}
                  source={String(node.configuration.source)}
                  initialInputs={
                    node.configuration.inputs as Record<string, unknown>
                  }
                  initialSettings={
                    node.configuration.settings as Record<string, unknown>
                  }
                  verificationOnly
                  onVerified={(recipe) => {
                    const report = recipe
                      ? (JSON.parse(
                          String(
                            recipe.document.nodes[0].configuration.verification,
                          ),
                        ) as VerificationReport)
                      : undefined;
                    setComponentChecks((previous) => {
                      if (
                        JSON.stringify(previous[node.id]) ===
                        JSON.stringify(report)
                      )
                        return previous;
                      const next = { ...previous };
                      if (report) next[node.id] = report;
                      else delete next[node.id];
                      return next;
                    });
                  }}
                />
              ))}
            </section>
          )}
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
            <span>
              I have permission to share all included content under{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY 4.0
              </a>
              , including attribution when others reuse it.
            </span>
          </label>
          {candidate.error && <p role="alert">{candidate.error}</p>}
          {error && <p role="alert">{error}</p>}
        </>
      )}
    </ComponentDialog>
  );
}
