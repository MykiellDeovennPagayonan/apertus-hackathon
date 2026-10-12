"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { listCommunity } from "../../lib/projects/client";
import type { ProjectType, PublicationSummary } from "../../lib/projects/types";
import LoadingState from "../_components/LoadingState";
import SiteHeader from "../_components/SiteHeader";
export default function Community() {
  const [type, setType] = useState<ProjectType>("experiment"),
    [query, setQuery] = useState(""),
    [tag, setTag] = useState("");
  const [entries, setEntries] = useState<PublicationSummary[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [more, setMore] = useState(false);
  useEffect(() => {
    let disposed = false;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      void listCommunity(type, query, tag)
        .then((r) => {
          if (!disposed) {
            setEntries(r.entries);
            setCursor(r.nextCursor);
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
  }, [type, query, tag]);
  return (
    <>
      <SiteHeader active="community" />
      <main className="community-page">
        <Link href="/experiments/builder?new=1">Create manually →</Link>
        <h1>Community lab</h1>
        <p>
          Explore experiments and reusable compositions shared by their authors.
          Each version is a preserved snapshot.
        </p>
        <div className="community-tabs">
          <button
            type="button"
            aria-pressed={type === "experiment"}
            onClick={() => setType("experiment")}
          >
            Experiments
          </button>
          <button
            type="button"
            aria-pressed={type === "composition"}
            onClick={() => setType("composition")}
          >
            Compositions
          </button>
        </div>
        <div className="project-filters">
          <label>
            Search community
            <input
              type="search"
              value={query}
              maxLength={100}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label>
            Filter by tag
            <input
              value={tag}
              maxLength={40}
              onChange={(e) => setTag(e.target.value)}
            />
          </label>
          <span>Newest first</span>
        </div>
        {error ? (
          <p role="alert">{error}</p>
        ) : loading ? (
          <LoadingState
            variant="cards"
            title="Loading community projects…"
            description="Finding experiments shared by the community."
          />
        ) : entries.length === 0 ? (
          <p>
            No matching {type === "experiment" ? "experiments" : "compositions"}{" "}
            yet. Save a private project, enable sharing, and publish from{" "}
            <Link href="/projects">My projects</Link>.
          </p>
        ) : (
          <div className="project-grid">
            {entries.map((p) => (
              <article key={p.publicationId}>
                <span className="project-kind">{p.projectType}</span>
                <h2>
                  <Link href={`/community/${p.publicationId}`}>{p.name}</Link>
                </h2>
                <p>{p.description || "Explore this shared project."}</p>
                <p>
                  By {p.authorName} · Version {p.versionNumber}
                </p>
                <time dateTime={p.publishedAt}>
                  {new Date(p.publishedAt).toLocaleDateString()}
                </time>
                <p>
                  {p.tags.map((t) => (
                    <button type="button" key={t} onClick={() => setTag(t)}>
                      {t}
                    </button>
                  ))}
                </p>
                <Link href={`/community/${p.publicationId}`}>
                  {p.projectType === "experiment"
                    ? "Run & remix"
                    : "Preview & add to builder"}
                </Link>
              </article>
            ))}
          </div>
        )}
        {cursor && !loading && (
          <button
            type="button"
            disabled={more}
            onClick={async () => {
              setMore(true);
              try {
                const r = await listCommunity(type, query, tag, cursor);
                setEntries((old) => [...old, ...r.entries]);
                setCursor(r.nextCursor);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not load more.",
                );
              } finally {
                setMore(false);
              }
            }}
          >
            {more ? "Loading more projects…" : "More projects"}
          </button>
        )}
      </main>
    </>
  );
}
