import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import ExperimentArt from "./ExperimentArt";
import SiteHeader from "./SiteHeader";
import "./LandingPage.css";

export default function LandingPage({ children }: { children?: ReactNode }) {
  const experiments = [
    {
      type: "projectile",
      tag: "PHYSICS",
      title: "Projectile motion",
      description: "Adjust launch speed and angle to compare trajectories.",
      name: "Projectile motion",
    },
    {
      type: "cell-division",
      tag: "BIOLOGY",
      title: "Cell division",
      description: "Explore how chromosomes separate as a cell divides.",
      name: "Cell division",
    },
    {
      type: "acid-base-titration",
      tag: "CHEMISTRY",
      title: "Acid-base titration",
      description: "Add base to an acid and watch the pH and indicator change.",
      name: "Acid-base titration",
    },
  ] as const;
  return (
    <div className="landing">
      <SiteHeader active="home" />
      <main className="landing__main">
        <section className="landing__hero">
          <div className="eyebrow">
            <span /> INTERACTIVE SIMULATIONS <span />
          </div>
          <h1>
            Create an <em>experiment.</em>
          </h1>
          <p>
            Describe what you want to simulate, or open an existing experiment.
          </p>
          {children}
        </section>
        <section id="experiments" className="experiment-section">
          <div className="section-heading">
            <h2>Example experiments</h2>
            <span>THREE EXPERIMENTS TO TRY</span>
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
        <span className="landing__footer-brand">
          <Image src="/logo.svg" alt="" width={32} height={28} /> pAperSim
        </span>
        <span>
          <i /> Local-first simulations
        </span>
        <span>2026</span>
      </footer>
    </div>
  );
}
