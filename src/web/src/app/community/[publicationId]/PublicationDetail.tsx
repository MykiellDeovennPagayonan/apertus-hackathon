"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  downloadPublication,
  getPublication,
  listCommunity,
  projectFetch,
} from "../../../lib/projects/client";
import type {
  Publication,
  PublicationSummary,
} from "../../../lib/projects/types";
import { parseDocument } from "../../../simulations/builder/document/serialization";
import { editableDocument } from "../../../simulations/builder/persistence/recovery";
import { RecipeLesson } from "../../../simulations/creation-and-editing/simulation/RecipeLesson";
import type {
  AuthoredDocument,
  CompositeRecipe,
} from "../../../simulations/creation-and-editing/authoring-engine/document";
import LoadingState from "../../_components/LoadingState";
import SiteHeader from "../../_components/SiteHeader";
export default function PublicationDetail({ id }: { id: string }) {
  const { data } = useSession(),
    owner = data?.user.id;
  const [publication, setPublication] = useState<Publication | null>(null),
    [versions, setVersions] = useState<PublicationSummary[]>([]),
    [document, setDocument] = useState<AuthoredDocument | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false);
  useEffect(() => {
    let disposed = false;
    setPublication(null);
    setError("");
    setPreview(false);
    void getPublication(id)
      .then(async (p) => {
        if (disposed) return;
        setPublication(p);
        try {
          const authored =
            p.projectType === "composition"
              ? (p.payload as CompositeRecipe).document
              : editableDocument(parseDocument(JSON.stringify(p.payload)))
                  .authored;
          setDocument(authored ?? null);
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "This format cannot be previewed.",
          );
        }
        const r = await listCommunity(
          undefined,
          "",
          "",
          null,
          undefined,
          p.seriesId,
        );
        if (!disposed) setVersions(r.entries);
      })
      .catch((e) => {
        if (!disposed) setError(e.message);
      });
    return () => {
      disposed = true;
    };
  }, [id]);
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
  const recipe =
    publication?.projectType === "composition"
      ? (publication.payload as CompositeRecipe)
      : null;
  return (
    <>
      <SiteHeader active="community" />
      <main className="community-page">
        <Link href="/community">← Community</Link>
        {error && <p role="alert">{error}</p>}
        {notice && <output>{notice}</output>}
        {!publication ? (
          !error && (
            <LoadingState
              variant="inline"
              title="Opening this shared project…"
              description="Getting the experiment and its details ready."
            />
          )
        ) : (
          <>
            <span className="project-kind">{publication.projectType}</span>
            <h1>{publication.name}</h1>
            <p>
              By {publication.authorName} · Version {publication.versionNumber}{" "}
              ·{" "}
              <time dateTime={publication.publishedAt}>
                {new Date(publication.publishedAt).toLocaleDateString()}
              </time>
            </p>
            <p>{publication.description}</p>
            <p>{publication.tags.join(" · ")}</p>
            <p>
              Shared under CC BY 4.0. Attribute {publication.authorName} when
              reusing this work.
            </p>
            {publication.basedOn && (
              <p>
                Remixed from{" "}
                <Link href={`/community/${publication.basedOn.publicationId}`}>
                  {publication.basedOn.name}
                </Link>{" "}
                by {publication.basedOn.authorName}.
              </p>
            )}
            {publication.attributions?.map((source) => (
              <p key={source.publicationId}>
                Includes{" "}
                <Link href={`/community/${source.publicationId}`}>
                  {source.name}
                </Link>{" "}
                by {source.authorName}.
              </p>
            ))}
            <div className="project-actions">
              <button type="button" onClick={() => setPreview((p) => !p)}>
                {preview
                  ? "Stop preview"
                  : publication.projectType === "experiment"
                    ? "Run experiment"
                    : "Preview composition"}
              </button>
              <Link
                href={`/experiments/builder?community=${publication.publicationId}`}
              >
                Remix in builder
              </Link>
              {recipe && (
                <Link
                  href={`/experiments/builder?insert=${publication.publicationId}`}
                >
                  Add to builder
                </Link>
              )}
              <button
                type="button"
                onClick={() => downloadPublication(publication)}
              >
                Download recipe
              </button>
              {owner === publication.authorId && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(
                        "Withdraw this publication from public browsing? Its snapshot will remain preserved.",
                      )
                    )
                      void act(async () => {
                        await projectFetch(
                          `/api/community/${id}/withdraw`,
                          owner,
                          "POST",
                          {},
                        );
                        setPublication(null);
                        setNotice("Publication withdrawn.");
                      });
                  }}
                >
                  Withdraw publication
                </button>
              )}
              {owner && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const reason = prompt(
                      "Why should this project be reviewed?",
                    );
                    if (reason)
                      void act(async () => {
                        await projectFetch(
                          `/api/community/${id}/report`,
                          owner,
                          "POST",
                          { reason },
                        );
                        setNotice("Report submitted for review.");
                      });
                  }}
                >
                  Report project
                </button>
              )}
            </div>
            {preview && document && (
              <section
                className="publication-preview"
                aria-label="Project preview"
              >
                <RecipeLesson key={id} document={document} />
              </section>
            )}
            {recipe && (
              <section>
                <h2>Composition interface</h2>
                <h3>Parameters</h3>
                {recipe.parameters.length ? (
                  <ul>
                    {recipe.parameters.map((p) => (
                      <li key={p.name}>
                        {p.name} · {p.field} · default{" "}
                        {JSON.stringify(p.default)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No exposed parameters.</p>
                )}
                <h3>Ports</h3>
                {recipe.externalPorts.length ? (
                  <ul>
                    {recipe.externalPorts.map((p) => (
                      <li key={`${p.direction}/${p.name}`}>
                        {p.name} · {p.direction}
                        {p.required ? " · required" : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No exposed ports.</p>
                )}
                <h3>Registered dependencies</h3>
                <ul>
                  {recipe.dependencies.map((d) => (
                    <li key={`${d.id}/${d.version}`}>
                      {d.id} · version {d.version}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <h2>Published versions</h2>
              <ul>
                {versions.map((p) => (
                  <li key={p.publicationId}>
                    <Link href={`/community/${p.publicationId}`}>{p.name}</Link>{" "}
                    · Version {p.versionNumber}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </>
  );
}
