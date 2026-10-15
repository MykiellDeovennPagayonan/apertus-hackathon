"use client";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { canvasCatalog } from "./catalog";
import { type TemplateId, templates } from "./descriptors";
import type { ExperimentDocument } from "./document";

type Layout = ExperimentDocument["presentation"]["layout"];
export default function Setup({
  onCreate,
  onTemplate,
  onCancel,
  initial,
  children,
  feedback,
}: {
  onCreate: (canvas: TemplateId, layout: Layout) => void;
  onTemplate: (template: TemplateId) => void;
  onCancel?: () => void;
  initial?: ExperimentDocument;
  children?: ReactNode;
  feedback?: ReactNode;
}) {
  const [step, setStep] = useState(0);
  const [dimension, setDimension] = useState<"2d" | "3d">(
    initial?.template === "town" ? "3d" : "2d",
  );
  const [canvas, setCanvas] = useState<TemplateId>(initial?.template ?? "gas");
  const [layout, setLayout] = useState<Layout>(
    initial?.presentation.layout ?? "right",
  );
  const headings = [
    "Would you like to build in 2D or 3D?",
    "How should your lesson be arranged?",
    "What would you like to build?",
  ];
  return (
    <main className="builder-start">
      <header className="builder-start-nav">
        <Link href="/">← pAperSim</Link>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Return to editing
          </button>
        )}
      </header>
      <div className="builder-setup-content">
        <p className="builder-eyebrow">
          CREATE MANUALLY · STEP {step + 1} OF 3
        </p>
        <h1>{headings[step]}</h1>
        <p>
          {step === 0
            ? "Choose the space your learner will explore."
            : step === 1
              ? "Choose where controls and results appear. You can change this later."
              : "Start empty, then add objects, controls, and results individually."}
        </p>
        {step === 0 && (
          <div className="builder-templates builder-dimension-options">
            {(["2d", "3d"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-label={option === "2d" ? "2D" : "3D"}
                aria-pressed={dimension === option}
                onClick={() => {
                  if (option !== dimension) {
                    setDimension(option);
                    setCanvas(option === "3d" ? "town" : "gas");
                    setLayout(option === "3d" ? "floating" : "right");
                  }
                }}
              >
                <div
                  className={`setup-art setup-art--${option === "2d" ? "line" : "town"}`}
                  aria-hidden="true"
                >
                  <span />
                  <span />
                  <span />
                </div>
                <strong>{option === "2d" ? "2D" : "3D"}</strong>
                <span>
                  {option === "2d"
                    ? "Physical canvases, coordinate graphs, and diagrams."
                    : "Spatial scenes with orbit and zoom navigation."}
                </span>
              </button>
            ))}
          </div>
        )}
        {step === 1 && (
          <div className="builder-templates builder-layout-options">
            {(dimension === "3d"
              ? (["floating"] as const)
              : (["right", "bottom"] as const)
            ).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={layout === option}
                onClick={() => setLayout(option)}
              >
                <div
                  className={`layout-thumbnail layout-thumbnail--${option}`}
                  aria-hidden="true"
                >
                  <span className="thumbnail-scene" />
                  <span className="thumbnail-panel">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
                <strong>
                  {option === "right"
                    ? "Scene and side panel"
                    : option === "bottom"
                      ? "Wide scene · controls below"
                      : "Scene and floating panel"}
                </strong>
                <span>
                  {option === "right"
                    ? "Keep actions and results beside the scene."
                    : option === "bottom"
                      ? "Give diagrams and graphs more horizontal space."
                      : "Give the 3D scene most of the workspace."}
                </span>
              </button>
            ))}
          </div>
        )}
        {step === 2 && (
          <div className="builder-templates">
            {(dimension === "3d"
              ? (["town"] as const)
              : (["gas", "line", "fractions"] as const)
            ).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={canvas === id}
                onClick={() => setCanvas(id)}
              >
                <div
                  className={`setup-art setup-art--${id}`}
                  aria-hidden="true"
                >
                  <span />
                  <span />
                  <span />
                </div>
                <strong>{canvasCatalog[id].title}</strong>
                <span>{canvasCatalog[id].description}</span>
                <small>Available: {canvasCatalog[id].object}</small>
              </button>
            ))}
          </div>
        )}
        <div className="setup-actions">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)}>
              ← {step === 1 ? "Back to 2D or 3D" : "Back to layout"}
            </button>
          )}
          <button
            className="builder-primary"
            type="button"
            onClick={() =>
              step < 2 ? setStep(step + 1) : onCreate(canvas, layout)
            }
          >
            {step === 0
              ? "Continue to layout →"
              : step === 1
                ? "Continue to canvas →"
                : initial
                  ? "Apply setup"
                  : "Open empty builder"}
          </button>
        </div>
        {step === 2 && initial?.recipe && canvas !== initial.template && (
          <p>
            Changing canvas removes the current object and its connections. Your
            previous draft will be kept in saved experiments.
          </p>
        )}
        {step === 0 && !initial && (
          <>
            <details className="setup-secondary">
              <summary>Prefer a starting example?</summary>
              <p>
                Examples include objects, instructions, controls, and results.
              </p>
              <div className="setup-template-links">
                {Object.entries(templates).map(([id, t]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onTemplate(id as TemplateId)}
                  >
                    Use {t.name} template
                  </button>
                ))}
              </div>
            </details>
            {children}
          </>
        )}
        {feedback}
      </div>
    </main>
  );
}
