"use client";
import Link from "next/link";
import { useState } from "react";
import { premadeExperiments } from "../_lib/premadeExperiments";

export default function ExperimentCatalog({
  error,
}: {
  error?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const experiments = Object.entries(premadeExperiments);
  const subjects = [
    ...new Set(experiments.map(([, experiment]) => experiment.category)),
  ].sort();
  const matching = experiments.filter(
    ([id, experiment]) =>
      (!subject || experiment.category === subject) &&
      `${id} ${experiment.title} ${experiment.description}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <main className="experiment-catalog">
      <span className="eyebrow">EXPLORE</span>
      <h1>Pick an experiment.</h1>
      <div className="manual-create-entry">
        <Link href="/experiments/builder">Create manually →</Link>
        <span>Start with an empty canvas.</span>
      </div>
      {error && <output>{error}</output>}
      <div className="experiment-catalog__filters">
        <label>
          Search experiments
          <input
            type="search"
            value={query}
            placeholder="Search by name or topic…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Subject
          <select
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          >
            <option value="">All subjects</option>
            {subjects.map((category) => (
              <option key={category} value={category}>
                {category.replaceAll("-", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p role="status">
        {matching.length} of {experiments.length} experiments
      </p>
      {matching.length === 0 && (
        <p>No experiments match. Try another search or subject.</p>
      )}
      <div className="experiment-catalog__grid">
        {matching.map(([id, experiment]) => (
          <Link
            key={id}
            href={`/experiments?experiment=${id}`}
            className="experiment-catalog__card"
          >
            <span className="math-starter-icon" aria-hidden="true">
              {experiment.icon}
            </span>
            <h2>{experiment.title}</h2>
            <p>{experiment.description}</p>
            <span>Open experiment ↗</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
