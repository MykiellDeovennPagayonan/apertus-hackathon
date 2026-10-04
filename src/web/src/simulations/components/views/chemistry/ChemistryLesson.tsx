"use client";
import { useState } from "react";
import { chemistry } from "../../../domains/chemistry";
import type { ModelInstance } from "../../../runtime/contribution";
import {
  ChemistryCoefficientControls,
  type ChemistryDispatch,
  ChemistryNumberControl,
} from "../../controls/chemistry/ChemistryControls";
import {
  BeakerVisual,
  chemistryNumber as fmt,
  MoleculeVisual,
  ReactionCurveVisual,
} from "../../visuals/chemistry/ChemistryVisuals";
import { ExperimentLessonFrame } from "../ExperimentLessonFrame";
import "./ChemistryLesson.css";

/** Render per instance inside the shared assembly view. Dispatch is the runtime command boundary. */
export function ChemistryLesson({
  instance,
  dispatch,
  learningGoal,
}: {
  instance: ModelInstance;
  dispatch: ChemistryDispatch;
  learningGoal?: string;
}) {
  const [feedback, report] = useState("");
  const model = chemistry.models.find((m) => m.ref === instance.provider);
  if (!model) return null;
  const o = instance.outputs;
  const command = (type: string, value?: unknown, target = instance.id) => {
    const result = dispatch({
      type,
      target,
      ...(value === undefined ? {} : { value }),
    });
    report(
      result.accepted
        ? type === "RESET"
          ? "Initial experiment restored."
          : "Change applied."
        : result.error,
    );
  };
  const title =
    model.presentation === "chemistry-dilution"
      ? "Same salt, more water"
      : model.presentation === "chemistry-conservation"
        ? "Make every atom count match"
        : "Warmer reactions change faster";
  const goal =
    learningGoal ??
    (model.presentation === "chemistry-dilution"
      ? "Add water and watch the concentration change while the salt amount stays fixed."
      : model.presentation === "chemistry-conservation"
        ? "Change coefficients until each element has the same count on both sides."
        : "Compare temperatures from the same starting concentration.");
  const atoms = o.atoms as
    | {
        element: string;
        left: number;
        right: number;
        conserved: boolean;
      }[]
    | undefined;
  const scene = (
    <div className="chem-scene">
      <div className="chem-scene-heading">
        <h2>{title}</h2>
        {model.presentation === "chemistry-dilution" && (
          <p>Salt remains dissolved as the solution volume grows.</p>
        )}
        {model.presentation === "chemistry-rate" && (
          <p>
            Solid curves show the current run; the dashed curve preserves the
            previous temperature.
          </p>
        )}
      </div>
      {model.presentation === "chemistry-dilution" && (
        <BeakerVisual instance={instance} />
      )}
      {model.presentation === "chemistry-conservation" && (
        <>
          <p className="chem-equation">{String(o.equation)}</p>
          <p className="chem-balance-state">
            {o.balanced
              ? "Balanced: every element is conserved ✓"
              : "Unbalanced: the atom counts differ"}
          </p>
          <MoleculeVisual instance={instance} />
        </>
      )}
      {model.presentation === "chemistry-rate" && (
        <ReactionCurveVisual instance={instance} />
      )}
    </div>
  );
  const panel = (
    <>
      <p className="chem-panel-title">Try the experiment</p>
      {model.presentation === "chemistry-dilution" && (
        <>
          <p className="chem-coach">Add water and watch concentration fall.</p>
          <button
            className="chem-primary"
            type="button"
            onClick={() => command("CHEM_ADD_WATER", 1)}
          >
            Add 1 L of water
          </button>
          <div className="chem-key-results chem-key-results--three">
            <div>
              <span>Dissolved salt</span>
              <strong>{fmt(o.saltMass)} g</strong>
            </div>
            <div>
              <span>Volume</span>
              <strong>{fmt(o.volume)} L</strong>
            </div>
            <div>
              <span>Concentration</span>
              <strong>{fmt(o.concentration)} g/L</strong>
            </div>
          </div>
          <p className="chem-insight">
            The salt amount stays fixed while the added water spreads it through
            more solution.
          </p>
        </>
      )}
      {model.presentation === "chemistry-conservation" && (
        <>
          <p className="chem-coach">
            Change only the coefficients. The formulas stay fixed.
          </p>
          <button
            className="chem-primary"
            type="button"
            onClick={() => command("CHEM_BALANCE")}
          >
            Balance it
          </button>
          <ChemistryCoefficientControls
            instance={instance}
            dispatch={dispatch}
            report={report}
          />
          <section
            className="chem-element-summary"
            aria-label="Element balance summary"
          >
            {atoms?.map((atom) => (
              <div
                key={atom.element}
                className={atom.conserved ? "is-matched" : ""}
              >
                <strong>{atom.element}</strong>
                <span>
                  {atom.left} : {atom.right}
                </span>
                <small>{atom.conserved ? "match" : "different"}</small>
              </div>
            ))}
          </section>
        </>
      )}
      {model.presentation === "chemistry-rate" && (
        <>
          <p className="chem-coach">
            Restart from the same concentration at a warmer temperature.
          </p>
          <button
            className="chem-primary"
            type="button"
            onClick={() => command("CHEM_SET_TEMPERATURE", 320)}
          >
            Compare from the start at 320 K
          </button>
          <div className="chem-key-results">
            <div>
              <span>Temperature</span>
              <strong>{fmt(o.temperature)} K</strong>
            </div>
            <div>
              <span>Half-life</span>
              <strong>{fmt(o.halfLife)} s</strong>
            </div>
            <div>
              <span>Rate constant k</span>
              <strong>{fmt(o.rateConstant)} s⁻¹</strong>
            </div>
            <div>
              <span>Previous half-life</span>
              <strong>{fmt(o.comparisonHalfLife)} s</strong>
            </div>
          </div>
          <div className="chem-actions">
            <button
              type="button"
              onClick={() => command("CHEM_SET_RATE_PLAYING", !o.playing)}
            >
              {o.playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              disabled={Boolean(o.playing)}
              onClick={() => command("CHEM_STEP_RATE")}
            >
              Step 1 s
            </button>
            <button type="button" onClick={() => command("CHEM_RESTART_RATE")}>
              Run again
            </button>
          </div>
        </>
      )}
      <button
        className="chem-reset"
        type="button"
        onClick={() => command("RESET", undefined, "session")}
      >
        Reset experiment
      </button>
    </>
  );
  const details = (
    <details className="chem-details">
      <summary>Model assumptions, exact settings, and measurements</summary>
      <div className="chem-details-grid">
        {model.presentation === "chemistry-dilution" && (
          <section>
            <h3>Add an exact amount</h3>
            <ChemistryNumberControl
              label="Water to add (L)"
              initial={1}
              min={0.001}
              max={1000}
              action="CHEM_ADD_WATER"
              instance={instance}
              dispatch={dispatch}
              report={report}
            />
          </section>
        )}
        {model.presentation === "chemistry-conservation" && atoms && (
          <section className="chem-table-wrap">
            <h3>Atom counts</h3>
            <table>
              <caption>Atoms on each side</caption>
              <thead>
                <tr>
                  <th>Element</th>
                  <th>Left</th>
                  <th>Right</th>
                  <th>Match?</th>
                </tr>
              </thead>
              <tbody>
                {atoms.map((atom) => (
                  <tr key={atom.element}>
                    <th scope="row">{atom.element}</th>
                    <td>{atom.left}</td>
                    <td>{atom.right}</td>
                    <td>{atom.conserved ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        {model.presentation === "chemistry-rate" && (
          <>
            <section>
              <h3>Choose an exact temperature</h3>
              <ChemistryNumberControl
                key={String(o.temperature)}
                label="Temperature (K); restarts run"
                initial={Number(o.temperature)}
                min={250}
                max={400}
                action="CHEM_SET_TEMPERATURE"
                instance={instance}
                dispatch={dispatch}
                report={report}
              />
            </section>
            <section>
              <h3>Current run</h3>
              <dl>
                <dt>Time</dt>
                <dd>{fmt(o.elapsed)} s</dd>
                <dt>Reactant A</dt>
                <dd>{fmt(o.concentrationA)} mol/L</dd>
                <dt>Product B</dt>
                <dd>{fmt(o.concentrationB)} mol/L</dd>
                <dt>A + B</dt>
                <dd>{fmt(o.totalConcentration)} mol/L</dd>
              </dl>
            </section>
          </>
        )}
      </div>
      <div className="chem-assumptions">
        {model.assumptions.map((text) => (
          <p key={text}>{text}</p>
        ))}
      </div>
    </details>
  );
  return (
    <ExperimentLessonFrame
      ariaLabel={instance.label}
      className="chemistry-experiment"
      learningGoal={goal}
      feedback={
        <output className="chem-feedback" aria-live="polite">
          {feedback}
        </output>
      }
      scene={scene}
      panel={panel}
      details={details}
    />
  );
}
