import Link from "next/link";
import ApertusBadge from "../../_components/ApertusBadge";
import { premadeExperiments } from "../_lib/premadeExperiments";

export default function ExperimentCatalog({
  error,
}: {
  error?: string | null;
}) {
  return (
    <main className="experiment-catalog">
      <span className="eyebrow">EXPLORE</span>
      <h1>Pick an experiment.</h1>
      <div className="manual-create-entry">
        <Link href="/experiments/builder">Create manually →</Link>
        <span>Start with an empty canvas.</span>
      </div>
      {error && <output>{error}</output>}
      <div className="experiment-catalog__grid">
        {Object.entries(premadeExperiments).map(([id, experiment]) => (
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
            <ApertusBadge />
            <span>Open experiment ↗</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
