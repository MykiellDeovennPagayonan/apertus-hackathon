"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { listCommunity } from "../../lib/projects/client";
import type { ProjectType, PublicationSummary } from "../../lib/projects/types";
import { BuilderIcon } from "../../simulations/builder/BuilderIcon";
import LoadingState from "../_components/LoadingState";
import SiteHeader from "../_components/SiteHeader";
import "./gallery.css";
export default function Community() {
  const [type, setType] = useState<ProjectType>("experiment"),
    [query, setQuery] = useState(""),
    [tag, setTag] = useState("");
  const [entries, setEntries] = useState<PublicationSummary[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [more, setMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const filtered = Boolean(query.trim() || tag.trim());
  const topics = [...new Set(entries.flatMap((entry) => entry.tags))].slice(
    0,
    6,
  );
  const clearFilters = () => {
    setQuery("");
    setTag("");
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry intentionally reloads the current filters.
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
  }, [type, query, tag, retry]);
  return (
    <>
      <SiteHeader active="community" />
      <main className="community-page community-gallery">
        <header className="community-hero">
          <div className="community-hero-copy">
            <span className="community-eyebrow">THE COMMUNITY LAB</span>
            <h1>
              Ideas are better
              <br />
              when you can <em>try them.</em>
            </h1>
            <p>
              Explore experiments made by curious minds. Run one, change
              something, and make your own discovery.
            </p>
            <div className="community-hero-actions">
              <Link
                className="community-create"
                href="/experiments/builder?new=1"
              >
                <BuilderIcon name="plus" /> Create manually
              </Link>
              <Link className="community-secondary" href="/projects">
                My projects <BuilderIcon name="forward" />
              </Link>
            </div>
            <span className="community-hero-note">
              Explore freely. Remix with credit.
            </span>
          </div>
          <div className="community-hero-art" aria-hidden="true">
            <span className="community-art-label">
              A LITTLE CHANGE. A NEW DISCOVERY.
            </span>
            <svg viewBox="0 0 380 190" fill="none" aria-hidden="true">
              <path
                d="M25 155H355M55 30V165"
                stroke="currentColor"
                opacity=".2"
              />
              <path
                d="M55 149C95 149 100 48 158 48S225 145 275 145 308 75 345 68"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                d="M55 149C95 149 110 80 158 80S220 125 270 125 314 97 345 94"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="5 7"
                opacity=".4"
              />
              <circle
                cx="158"
                cy="48"
                r="9"
                fill="#c78c55"
                stroke="#fffbef"
                strokeWidth="4"
              />
              <circle cx="275" cy="145" r="6" fill="currentColor" />
            </svg>
            <div className="community-art-control">
              <BuilderIcon name="controls" />
              <span>Change a variable</span>
              <i />
              <BuilderIcon name="forward" />
            </div>
            <div className="community-art-caption">
              <span>01 / EXPLORE</span>
              <span>02 / EXPERIMENT</span>
              <span>03 / REMIX</span>
            </div>
          </div>
        </header>
        <section
          className="community-discovery"
          aria-labelledby="community-browse-title"
        >
          <div className="community-section-heading">
            <div>
              <span className="community-eyebrow">MADE TO BE EXPLORED</span>
              <h2 id="community-browse-title">Find your next experiment</h2>
            </div>
            <span className="community-sort">
              <BuilderIcon name="history" /> Newest first
            </span>
          </div>
          <div className="community-browse-bar">
            <fieldset className="community-tabs" aria-label="Project type">
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
                Compositions{" "}
                <span className="community-tab-note">Reusable pieces</span>
              </button>
            </fieldset>
            <div className="project-filters community-search-fields">
              <label className="community-search">
                <span className="community-sr-only">Search community</span>
                <BuilderIcon name="search" />
                <input
                  type="search"
                  placeholder="Search experiments, ideas…"
                  value={query}
                  maxLength={100}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <label className="community-tag-search">
                <span className="community-sr-only">Filter by tag</span>
                <input
                  placeholder="Filter by tag"
                  value={tag}
                  maxLength={40}
                  onChange={(e) => setTag(e.target.value)}
                />
              </label>
            </div>
          </div>
          <div className="community-topics">
            <span>{tag ? "Selected topic" : "Explore topics"}</span>
            {tag && !topics.includes(tag) && (
              <button
                type="button"
                aria-pressed="true"
                onClick={() => setTag("")}
              >
                {tag} ×
              </button>
            )}
            {topics.map((topic) => (
              <button
                type="button"
                key={topic}
                aria-pressed={tag === topic}
                onClick={() => setTag(tag === topic ? "" : topic)}
              >
                {topic}
              </button>
            ))}
            {!topics.length && !tag && (
              <span className="community-topic-help">
                Topics appear as projects are shared.
              </span>
            )}
            {filtered && (
              <button
                type="button"
                className="community-clear"
                onClick={clearFilters}
              >
                Clear filters <BuilderIcon name="close" />
              </button>
            )}
          </div>
          {error ? (
            <div className="community-empty">
              <BuilderIcon name="warning" />
              <h3>We couldn’t load the lab</h3>
              <p role="alert">{error}</p>
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
              >
                Try again
              </button>
            </div>
          ) : loading ? (
            <LoadingState
              variant="cards"
              title="Loading community projects…"
              description="Finding experiments shared by the community."
            />
          ) : entries.length === 0 ? (
            <div className="community-empty">
              <span className="community-empty-icon">
                <BuilderIcon name={filtered ? "search" : "experiments"} />
              </span>
              <span className="community-eyebrow">
                {filtered ? "KEEP EXPLORING" : "ROOM FOR YOUR IDEAS"}
              </span>
              <h3>
                {filtered
                  ? "No matches this time"
                  : `Be the first to share ${type === "experiment" ? "an experiment" : "a composition"}`}
              </h3>
              <p>
                {filtered
                  ? "Try another search or clear your filters to explore the lab."
                  : "Build something you’re curious about. Save it to My projects, then publish it for others to explore and remix."}
              </p>
              {filtered ? (
                <button
                  type="button"
                  className="community-create"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              ) : (
                <Link
                  className="community-create"
                  href="/experiments/builder?new=1"
                >
                  <BuilderIcon name="plus" /> Create manually
                </Link>
              )}
              {!filtered && (
                <Link className="community-secondary" href="/experiments">
                  Explore starter experiments <BuilderIcon name="forward" />
                </Link>
              )}
            </div>
          ) : (
            <section
              className="project-grid community-project-grid"
              aria-label="Community projects"
            >
              {entries.map((p) => (
                <article key={p.publicationId} className="community-card">
                  <Link
                    className={`community-card-art is-${p.projectType}`}
                    href={`/community/${p.publicationId}`}
                    aria-label={`Open ${p.name}`}
                  >
                    <span className="community-card-kind">
                      <BuilderIcon
                        name={
                          p.projectType === "experiment"
                            ? "experiments"
                            : "composites"
                        }
                      />
                      {p.projectType === "experiment"
                        ? "Interactive experiment"
                        : "Reusable composition"}
                    </span>
                    <div className="community-card-diagram" aria-hidden="true">
                      <span>
                        <BuilderIcon name="controls" />
                      </span>
                      <i />
                      <span>
                        <BuilderIcon
                          name={
                            p.projectType === "experiment"
                              ? "models"
                              : "composites"
                          }
                        />
                      </span>
                      <i />
                      <span>
                        <BuilderIcon name="displays" />
                      </span>
                    </div>
                    <span className="community-card-art-note">
                      {p.projectType === "experiment"
                        ? "CHANGE · OBSERVE · DISCOVER"
                        : "CONNECT · REUSE · BUILD"}
                    </span>
                  </Link>
                  <div className="community-card-body">
                    <h2>
                      <Link href={`/community/${p.publicationId}`}>
                        {p.name}
                      </Link>
                    </h2>
                    <p className="community-card-description">
                      {p.description ||
                        "A community-made idea, ready for you to explore and make your own."}
                    </p>
                    <div className="community-card-tags">
                      {p.tags.map((t) => (
                        <button type="button" key={t} onClick={() => setTag(t)}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <div className="community-card-author">
                      <span className="community-avatar" aria-hidden="true">
                        {p.authorName.slice(0, 1).toUpperCase()}
                      </span>
                      <span>
                        By <strong>{p.authorName}</strong>
                      </span>
                      <time dateTime={p.publishedAt}>
                        {new Date(p.publishedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </time>
                    </div>
                    <div className="community-card-footer">
                      <span>Version {p.versionNumber}</span>
                      <Link href={`/community/${p.publicationId}`}>
                        {p.projectType === "experiment"
                          ? "Run & remix"
                          : "Preview & add to builder"}
                        <BuilderIcon name="forward" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
          {cursor && !loading && (
            <button
              type="button"
              className="community-load-more"
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
        </section>
        <aside className="community-contribute">
          <span className="community-contribute-icon">
            <BuilderIcon name="share" />
          </span>
          <div>
            <h2>Your next discovery could inspire someone.</h2>
            <p>
              Create an experiment, save it to your projects, and share it with
              the lab.
            </p>
          </div>
          <Link className="community-secondary" href="/projects">
            Share a project <BuilderIcon name="forward" />
          </Link>
        </aside>
      </main>
    </>
  );
}
