"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  downloadPayload,
  getProject,
  listCommunity,
  listProjects,
  projectFetch,
  saveProject,
} from "../../lib/projects/client";
import type {
  Project,
  ProjectSummary,
  ProjectType,
  PublicationSummary,
} from "../../lib/projects/types";
import { RecipeRepository } from "../../simulations/builder/library/RecipeRepository";
import { readLibrary } from "../../simulations/builder/persistence/storage";
import AccountControl from "../_components/AccountControl";
import NameAvailability from "../_components/NameAvailability";
import PublishDialog from "../_components/PublishDialog";
export default function Projects() {
  const { data } = useSession(),
    owner = data?.user.id;
  const [entries, setEntries] = useState<ProjectSummary[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [query, setQuery] = useState(""),
    [type, setType] = useState<ProjectType | undefined>();
  const [editing, setEditing] = useState<Project | null>(null),
    [publishing, setPublishing] = useState<Project | null>(null),
    [publications, setPublications] = useState<PublicationSummary[]>([]);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState("");
  const [local, setLocal] = useState<
    Array<{
      id: string;
      name: string;
      type: ProjectType;
      payload: Project["payload"];
      source?: string;
    }>
  >([]);
  const [recoverable, setRecoverable] = useState<
    Array<{
      id: string;
      projectType: string;
      payload: unknown;
      reason: string;
      recovery?: string;
    }>
  >([]);
  useEffect(() => {
    if (owner)
      void projectFetch<{ entries: typeof recoverable }>(
        "/api/projects/recovery",
        owner,
      )
        .then((result) => setRecoverable(result.entries))
        .catch(() => {});
  }, [owner]);
  const importKeys = useRef(new Map<string, { id: string; key: string }>());
  const refresh = async () => {
    if (!owner) return;
    const result = await listProjects(owner, type, query);
    setEntries(result.entries);
    setCursor(result.nextCursor);
  };
  useEffect(() => {
    let disposed = false;
    if (!owner) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      void listProjects(owner, type, query)
        .then((result) => {
          if (!disposed) {
            setEntries(result.entries);
            setCursor(result.nextCursor);
          }
        })
        .catch((e) => {
          if (!disposed) setError(e.message);
        })
        .finally(() => {
          if (!disposed) setLoading(false);
        });
    }, 200);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [owner, type, query]);
  useEffect(() => {
    try {
      setLocal([
        ...readLibrary().map((e) => ({
          id: e.id,
          name: e.document.lesson.title,
          type: "experiment" as const,
          payload: e.document,
          source: e.basedOnPublicationId,
        })),
        ...new RecipeRepository(localStorage).read().map((r) => ({
          id: r.id,
          name: r.title,
          type: "composition" as const,
          payload: r,
          source: JSON.parse(
            localStorage.getItem("apertus-local-composition-sources-v1") ??
              "{}",
          )[r.id],
        })),
      ]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Local library could not be read.",
      );
    }
  }, []);
  // Refresh published projects when the review dialog opens or closes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: publication dialog lifecycle refreshes this list.
  useEffect(() => {
    if (!owner) return;
    let disposed = false;
    void listCommunity(undefined, "", "", null, owner)
      .then((r) => {
        if (!disposed) setPublications(r.entries);
      })
      .catch(() => {});
    return () => {
      disposed = true;
    };
  }, [owner, publishing]);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="community-page">
      <header className="community-header">
        <Link href="/">Apertus</Link>
        <nav>
          <Link href="/experiments/builder?new=1">New experiment</Link>
          <Link href="/community">Community</Link>
          <AccountControl navigation={false} />
        </nav>
      </header>
      <h1>My projects</h1>
      <p>Save privately. Publish a snapshot when you are ready to share.</p>
      {error && (
        <p role="alert" className="project-error">
          {error}
        </p>
      )}
      {notice && <output>{notice}</output>}
      {!owner && (
        <p className="local-notice">
          You're working locally. Browser data can be cleared; download recipes
          to keep a portable copy. <Link href="/auth/sign-in">Sign in</Link> to
          save to your account and publish.
        </p>
      )}
      {owner && (
        <>
          <div className="project-filters">
            <label>
              Find projects
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label>
              Type
              <select
                value={type ?? ""}
                onChange={(e) =>
                  setType(
                    e.target.value
                      ? (e.target.value as ProjectType)
                      : undefined,
                  )
                }
              >
                <option value="">All projects</option>
                <option value="experiment">Experiments</option>
                <option value="composition">Compositions</option>
              </select>
            </label>
          </div>
          {loading ? (
            <p>Opening your library…</p>
          ) : entries.length === 0 ? (
            <p>
              No matching projects.{" "}
              <Link href="/experiments/builder?new=1">
                Create an experiment
              </Link>
              .
            </p>
          ) : (
            <div className="project-grid">
              {entries.map((e) => (
                <article key={`${e.projectType}/${e.projectId}`}>
                  <span className="project-kind">{e.projectType}</span>
                  <h2>{e.name}</h2>
                  <p>{e.description || "Private project"}</p>
                  <p>
                    Saved revision {e.saveRevision}
                    {e.lastPublishedRevision
                      ? ` · ${e.saveRevision === e.lastPublishedRevision ? "Published revision" : "Changes since publication"}`
                      : ""}
                  </p>
                  <div className="project-actions">
                    <Link
                      href={`/experiments/builder?project=${encodeURIComponent(e.projectId)}&type=${e.projectType}`}
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void act(async () => {
                          setEditing(
                            await getProject(e.projectId, owner, e.projectType),
                          );
                        })
                      }
                    >
                      Details & sharing
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void act(async () =>
                          downloadPayload(
                            (
                              await getProject(
                                e.projectId,
                                owner,
                                e.projectType,
                              )
                            ).payload,
                            e.name,
                          ),
                        )
                      }
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          confirm(
                            `Delete private project “${e.name}”? Its community publications stay unchanged.`,
                          )
                        )
                          void act(async () => {
                            await projectFetch(
                              `/api/projects/${encodeURIComponent(e.projectId)}?type=${e.projectType}`,
                              owner,
                              "DELETE",
                              { expectedRevision: e.saveRevision },
                            );
                            await refresh();
                          });
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          {cursor && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  const result = await listProjects(owner, type, query, cursor);
                  setEntries((old) => [...old, ...result.entries]);
                  setCursor(result.nextCursor);
                })
              }
            >
              More projects
            </button>
          )}
        </>
      )}
      {local.length > 0 && (
        <section>
          <h2>Saved on this device</h2>
          <p>
            Import is explicit. Local originals are retained after a successful
            account save.
          </p>
          <div className="project-grid">
            {local.map((item) => (
              <article key={`${item.type}/${item.id}`}>
                <h3>{item.name}</h3>
                <p>{item.type}</p>
                <div className="project-actions">
                  <button
                    type="button"
                    onClick={() => downloadPayload(item.payload, item.name)}
                  >
                    Download recipe
                  </button>
                  {owner && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const name = prompt(
                          "Name for the account copy",
                          item.name,
                        );
                        if (name)
                          void act(async () => {
                            const source = `${item.type}:${item.id}`;
                            let retry = importKeys.current.get(source);
                            if (!retry) {
                              retry = {
                                id: crypto.randomUUID(),
                                key: crypto.randomUUID(),
                              };
                              importKeys.current.set(source, retry);
                            }
                            await saveProject(
                              {
                                projectId: retry.id,
                                projectType: item.type,
                                name,
                                description: "",
                                tags: [],
                                payload: item.payload,
                                sharingAllowed: false,
                              },
                              owner,
                              null,
                              item.source,
                              retry.key,
                            );
                            setNotice(
                              `Imported ${name}. Local original retained.`,
                            );
                            await refresh();
                          });
                      }}
                    >
                      Import into account
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {owner && publications.length > 0 && (
        <section>
          <h2>Your publications</h2>
          <ul>
            {publications.map((p) => (
              <li key={p.publicationId}>
                <Link href={`/community/${p.publicationId}`}>{p.name}</Link> ·
                Version {p.versionNumber}
              </li>
            ))}
          </ul>
        </section>
      )}
      {recoverable.length > 0 && (
        <section>
          <h2>Preserved legacy projects</h2>
          <p>
            These records could not be migrated. Download their original content
            for repair; nothing was deleted.
          </p>
          {recoverable.map((item) => (
            <article key={item.id}>
              <p>
                {item.projectType}: {item.reason}
              </p>
              <button
                type="button"
                onClick={() =>
                  downloadPayload(item.payload, `legacy-${item.id}`)
                }
              >
                Download original
              </button>
              {item.recovery && (
                <button
                  type="button"
                  onClick={() =>
                    downloadPayload(
                      { recovery: item.recovery },
                      `recovery-${item.id}`,
                    )
                  }
                >
                  Download recovery text
                </button>
              )}
            </article>
          ))}
        </section>
      )}
      {editing && owner && (
        <section className="project-editor" aria-labelledby="project-details">
          <h2 id="project-details">Project details</h2>
          <label>
            Name
            <input
              maxLength={100}
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </label>
          <NameAvailability
            name={editing.name}
            owner={owner}
            type={editing.projectType}
            exclude={editing.projectId}
          />
          <label>
            Description
            <textarea
              maxLength={2000}
              value={editing.description}
              onChange={(e) =>
                setEditing({ ...editing, description: e.target.value })
              }
            />
          </label>
          <label>
            Tags
            <input
              value={editing.tags.join(",")}
              onChange={(e) =>
                setEditing({ ...editing, tags: e.target.value.split(",") })
              }
            />
          </label>
          <label className="project-check">
            <input
              type="checkbox"
              checked={editing.sharingAllowed}
              onChange={(e) =>
                setEditing({ ...editing, sharingAllowed: e.target.checked })
              }
            />
            Allow this project to be published to the community
          </label>
          <p>
            This permission does not publish anything. Disabling it prevents
            future publications; use Withdraw on existing publications to remove
            them from browsing.
          </p>
          <div className="project-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  const saved = await saveProject(
                    {
                      projectId: editing.projectId,
                      projectType: editing.projectType,
                      name: editing.name,
                      description: editing.description,
                      tags: editing.tags,
                      payload: editing.payload,
                      sharingAllowed: editing.sharingAllowed,
                    },
                    owner,
                    editing.saveRevision,
                  );
                  setEditing(saved);
                  setNotice("Project details saved privately.");
                  await refresh();
                })
              }
            >
              Save details
            </button>
            <button
              type="button"
              disabled={busy || !editing.sharingAllowed}
              onClick={() =>
                void act(async () => {
                  const saved = await saveProject(
                    {
                      projectId: editing.projectId,
                      projectType: editing.projectType,
                      name: editing.name,
                      description: editing.description,
                      tags: editing.tags,
                      payload: editing.payload,
                      sharingAllowed: editing.sharingAllowed,
                    },
                    owner,
                    editing.saveRevision,
                  );
                  setEditing(saved);
                  setPublishing(saved);
                  await refresh();
                })
              }
            >
              Save & review publication
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              Close details
            </button>
          </div>
        </section>
      )}
      {publishing && owner && (
        <PublishDialog
          project={publishing}
          ownerId={owner}
          onClose={() => setPublishing(null)}
          onPublished={() => {
            void refresh();
            setNotice(
              "Published snapshot created. Private edits will not change it.",
            );
          }}
        />
      )}
    </main>
  );
}
