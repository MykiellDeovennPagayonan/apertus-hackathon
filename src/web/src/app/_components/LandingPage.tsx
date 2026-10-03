import Link from "next/link";
import ApertusBadge from "./ApertusBadge";
import ExperimentArt from "./ExperimentArt";
import "./LandingPage.css";

export default function LandingPage() {
  const experiments = [
    {
      type: "projectile",
      tag: "PHYSICS",
      title: "A little leap of curiosity.",
      description: "Launch, adjust, and discover what makes things fly.",
      name: "Projectile motion",
    },
    {
      type: "bridge",
      tag: "STRUCTURES",
      title: "Ideas that hold together.",
      description: "Build a bridge. Add a little weight. See what changes.",
      name: "Truss bridge",
    },
    {
      type: "town",
      tag: "SIMULATION",
      title: "A world of small wonders.",
      description: "Watch a little town come alive, one decision at a time.",
      name: "Living town",
    },
  ] as const;
  return (
    <div className="landing">
      <header className="landing__nav">
        <Link href="/" className="brand">
          <span className="brand__mark" aria-hidden="true">
            ✳
          </span>{" "}
          apertus<span className="brand__suffix">/ local lab</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/experiments">Explore experiments ↗</Link>
        </nav>
        <span className="local-status">
          <i /> Interactive experiments
        </span>
      </header>
      <main className="landing__main">
        <section className="landing__hero">
          <div className="eyebrow">
            <span /> A SMALL LAB FOR BIG WHAT-IFS <span />
          </div>
          <h1>
            Curiosity, <em>made interactive.</em>
          </h1>
          <p>
            Describe a concept or choose an experiment. Change something and see
            what happens.
          </p>
          <Link className="landing__cta" href="/experiments">
            Explore the experiments ↗
          </Link>
        </section>
        <section id="experiments" className="experiment-section">
          <div className="section-heading">
            <h2>A few places to begin</h2>
            <span>THREE EXPERIMENTS. ENDLESS WHAT-IFS.</span>
          </div>
          <div className="experiment-grid">
            {experiments.map((experiment, index) => (
              <Link
                key={experiment.type}
                className="experiment-card"
                href={`/experiments?experiment=${experiment.type}`}
              >
                <div className="experiment-card__art">
                  <span className="paper-tab">{experiment.tag}</span>
                  <span className="experiment-card__number">
                    FIG. 0{index + 1}
                  </span>
                  <ExperimentArt type={experiment.type} />
                </div>
                <div className="experiment-card__body">
                  <h3>{experiment.title}</h3>
                  <p>{experiment.description}</p>
                  <ApertusBadge />
                  <div className="experiment-card__link">
                    {experiment.name}
                    <span aria-hidden="true">↗</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <footer className="landing__footer">
        <span>Built with curiosity. Powered by Apertus.</span>
        <span>
          <i /> Local-first, always.
        </span>
        <span>THE INTERACTIVE LAB · 2026</span>
      </footer>
    </div>
  );
}
