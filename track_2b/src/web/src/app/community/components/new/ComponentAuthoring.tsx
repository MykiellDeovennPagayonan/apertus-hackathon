"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRef, useState } from "react";
import { getProject, saveProject } from "../../../../lib/projects/client";
import {
  authoringBrief,
  downloadComponentText,
  readComponentFile,
} from "../../../../lib/projects/componentAuthoring";
import type { Project } from "../../../../lib/projects/types";
import { HTMLComponentImport } from "../../../../simulations/builder/composition/HTMLComponentImport";
import {
  loadComponentLibrary,
  saveComponentRecipe,
} from "../../../../simulations/builder/library/persistence";
import type { CompositeRecipe } from "../../../../simulations/creation-and-editing/authoring-engine/document";
import {
  diagnostic,
  inspectSource,
} from "../../../../simulations/creation-and-editing/runtime-engine/imported/contract";
import { useAccountFeaturesEnabled } from "../../../_components/DeploymentProvider";
import PublishDialog from "../../../_components/PublishDialog";
import SiteHeader from "../../../_components/SiteHeader";
import "../../community.css";

export default function ComponentAuthoring() {
  const { data: session } = useSession();
  const accountsDisabled = !useAccountFeaturesEnabled();
  const owner = accountsDisabled ? undefined : session?.user.id;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [upload, setUpload] = useState(false);
  const [retained, setRetained] = useState("");
  const [source, setSource] = useState("");
  const [verified, setVerified] = useState<CompositeRecipe | null>(null);
  const [saved, setSaved] = useState<CompositeRecipe | null>(null);
  const [publishing, setPublishing] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const sequence = useRef(0);
  const inspect = (text: string) => {
    setRetained(text);
    setSource("");
    setVerified(null);
    setSaved(null);
    setNotice("");
    try {
      inspectSource(text);
      setSource(text);
      setError("");
    } catch (e) {
      setError(diagnostic(e).message);
    }
  };
  const read = async (file: File) => {
    const current = ++sequence.current;
    setBusy(true);
    setError("");
    setSource("");
    setVerified(null);
    setSaved(null);
    try {
      const text = await readComponentFile(file);
      if (current === sequence.current) inspect(text);
    } catch (e) {
      if (current === sequence.current)
        setError(
          e instanceof Error ? e.message : "Could not read this HTML file.",
        );
    } finally {
      if (current === sequence.current) setBusy(false);
    }
  };
  const save = async (recipe: CompositeRecipe) => {
    const account = owner;
    const library = await loadComponentLibrary(account);
    const copy = structuredClone(recipe);
    if (library.some((r) => r.id === copy.id))
      copy.id = `user/${crypto.randomUUID()}`;
    let suffix = 2;
    while (
      library.some((r) => r.title.toLowerCase() === copy.title.toLowerCase())
    )
      copy.title = `${recipe.title} (copy ${suffix++})`;
    copy.document.lesson.title = copy.title;
    await saveComponentRecipe(copy, account);
    setSaved(copy);
    setNotice(
      account
        ? "Saved to My components in your account."
        : "Saved to My components on this device.",
    );
    return copy;
  };
  return (
    <>
      <SiteHeader active="community" />
      <main className="community-page component-authoring-page">
        <Link href={accountsDisabled ? "/projects" : "/community"}>
          {accountsDisabled ? "← My projects" : "← Community"}
        </Link>
        <h1>Create an HTML component</h1>
        <p>
          Describe a new component, give the downloaded brief to your AI, then
          upload its HTML to try it.
        </p>
        {!upload ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const [guide, starter] = await Promise.all(
                  [
                    "component-authoring-v1.md",
                    "component-starter-v1.html",
                  ].map(async (file) => {
                    const response = await fetch(
                      `/component-authoring/v1/${file}`,
                    );
                    if (!response.ok)
                      throw new Error(
                        "Could not load component instructions. Try again.",
                      );
                    return response.text();
                  }),
                );
                downloadComponentText(
                  authoringBrief(name, description, guide, starter),
                  name,
                  "md",
                );
                setUpload(true);
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Could not prepare instructions.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Component name
              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              What should it do?
              <textarea
                required
                maxLength={1000}
                rows={5}
                placeholder="Describe the visual, what users can change, and what it should output."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <div className="project-actions">
              <button
                className="builder-primary"
                disabled={busy || !name.trim() || !description.trim()}
                type="submit"
              >
                {busy ? "Preparing brief…" : "Download AI brief (.md)"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setUpload(true)}
              >
                I already have HTML
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="project-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => setUpload(false)}
              >
                Edit brief
              </button>
            </div>
            <label className="component-upload">
              Upload component HTML
              <input
                type="file"
                accept=".html,.htm,text/html"
                disabled={busy}
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  e.currentTarget.value = "";
                  if (file) void read(file);
                }}
              />
            </label>
            {retained && (
              <details>
                <summary>Review or replace retained HTML</summary>
                <textarea
                  aria-label="Retained component HTML"
                  disabled={busy}
                  rows={10}
                  value={retained}
                  onChange={(e) => {
                    setRetained(e.target.value);
                    setSource("");
                    setVerified(null);
                    setSaved(null);
                  }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inspect(retained)}
                >
                  Check replacement HTML
                </button>
              </details>
            )}
            {source && (
              <HTMLComponentImport
                key={source}
                source={source}
                onVerified={setVerified}
                onSave={async (recipe) => {
                  await save(recipe);
                }}
              />
            )}
            {verified && (
              <div className="project-actions">
                <button
                  type="button"
                  onClick={() =>
                    downloadComponentText(source, verified.title, "html")
                  }
                >
                  Download HTML
                </button>
                {owner && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        const recipe =
                          saved &&
                          JSON.stringify(
                            saved.document.nodes[0].configuration,
                          ) ===
                            JSON.stringify(
                              verified.document.nodes[0].configuration,
                            )
                            ? saved
                            : await save(verified);
                        const project = await getProject(
                          recipe.id,
                          owner,
                          "composition",
                        );
                        const enabled = project.sharingAllowed
                          ? project
                          : await saveProject(
                              {
                                projectId: project.projectId,
                                projectType: project.projectType,
                                name: project.name,
                                description: project.description,
                                tags: project.tags,
                                payload: project.payload,
                                sharingAllowed: true,
                              },
                              owner,
                              project.saveRevision,
                            );
                        setPublishing(enabled);
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Could not prepare publication.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Review community publication
                  </button>
                )}
                {!owner && !accountsDisabled && (
                  <Link href="/auth/sign-in">Sign in to publish</Link>
                )}
              </div>
            )}
          </>
        )}
        {error && <p role="alert">{error}</p>}
        {notice && <output aria-live="polite">{notice}</output>}
        {publishing && owner && (
          <PublishDialog
            project={publishing}
            ownerId={owner}
            onClose={() => setPublishing(null)}
            onPublished={(p) =>
              setNotice(`Published ${p.name} to Community components.`)
            }
          />
        )}
      </main>
    </>
  );
}
