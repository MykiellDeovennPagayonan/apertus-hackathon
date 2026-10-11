"use client";
import { type ReactNode, useContext, useId, useState } from "react";
import {
  scienceCommand,
  scienceObservation,
  scienceSpec,
} from "../../domains/science";
import { requireValue } from "../../runtime/authoring/requireValue";
import type { DocumentRuntime } from "../../runtime/authoring/runtime";
import type { ComponentInstance } from "../../runtime/authoring/types";
import type { ScienceState } from "../systems/science/contracts";
import { cellStages } from "../systems/science/life";
import { MotionContext, SnapshotContext } from "./recipe/contexts";
import { learnerCaption } from "./science/learnerPresentation";
import { ScienceInvestigation } from "./science/ScienceInvestigation";
import { ScienceComparison } from "./science/ScienceComparison";

interface Props {
  node: ComponentInstance;
  runtime: DocumentRuntime;
}
function useScience({ node, runtime }: Props) {
  const snapshot = useContext(SnapshotContext),
    [error, setError] = useState("");
  const binding = runtime.document.connections.find(
    (c) => c.kind === "value" && c.to.node === node.id && c.to.port === "value",
  );
  const state = binding
    ? (snapshot.state[binding.from.node] as unknown as ScienceState)
    : undefined;
  const run = (port: string, value?: unknown) => {
    const links = runtime.document.connections.filter(
      (c) =>
        c.kind === "command" && c.from.node === node.id && c.from.port === port,
    );
    const result = links.length
      ? runtime.dispatch(
          links.map((c) => ({
            node: c.to.node,
            command: c.to.port,
            arguments: value === undefined ? {} : { value },
          })),
        )
      : {
          accepted: false as const,
          error: "Connect this interaction to a science model.",
        };
    setError(result.accepted ? "" : result.error);
    return result;
  };
  return { state, run, error };
}
export function ScienceControls(props: Props) {
  const { state: s, run, error } = useScience(props);
  const motion = useContext(MotionContext);
  if (!s) return <p>Connect a science model to begin.</p>;
  const spec = scienceSpec(s.kind);
  const send = (action: string, value?: unknown) =>
    run(scienceCommand(s.kind, action), value);
  if (props.node.configuration.panel === "conditions") {
    return (
      <div
        className={`science-panel science-choices science-${s.kind}-choices`}
      >
        <ScienceInvestigation
          state={s}
          run={run}
          error={error}
          fields={props.node.configuration.fields as string[] | undefined}
        />
      </div>
    );
  }
  const button = (
    label: string,
    action: string,
    primary = true,
    disabled = false,
  ) => (
    <button
      type="button"
      className={primary ? "science-primary" : "science-secondary"}
      disabled={disabled}
      onClick={() => (action === "RESET" ? run("RESET") : send(action))}
    >
      {label}
    </button>
  );
  let actions: ReactNode;
  let hint = "";
  if (s.kind === "earth") return null;
  if (s.kind === "immune") {
    const d = requireValue(s.immune);
    actions = !d.exposure
      ? button("Introduce infection", "EXPOSE")
      : !d.burden
        ? button("Try the same infection again", "EXPOSE")
        : button(
            s.playing
              ? "Pause response"
              : motion
                ? "Watch the response"
                : "Next response stage",
            s.playing ? "PAUSE" : motion ? "PLAY" : "STEP",
          );
    hint = !d.exposure
      ? "First encounter"
      : !d.burden
        ? "The body remembers"
        : d.challengeMemory
          ? "Repeat encounter"
          : "First response";
  } else if (s.kind === "invasive") {
    const d = requireValue(s.invasive);
    actions =
      d.origin < 0 ? (
        button("Introduce a plant", "INTRODUCE")
      ) : (
        <>
          {button(
            s.time >= spec.limit ? "Start again" : "Next season",
            s.time >= spec.limit ? "RESET" : "STEP",
          )}
          {(d.cover[s.selected] > 0 || d.propagules[s.selected] > 0) &&
            button("Remove this plant", "REMOVE", false, !d.effort)}
        </>
      );
    hint =
      d.origin < 0
        ? "Select a starting patch"
        : d.effort
          ? "Select a patch to intervene"
          : "No removal effort remains";
  } else if (s.kind === "water") {
    actions =
      s.time >= spec.limit
        ? button("Follow another drop", "RESET")
        : button("Follow the water", "STEP");
    hint = "Cloud → land → river";
  } else if (s.kind === "genome") {
    actions = button(
      s.time >= spec.limit ? "Start a new family" : "Create an offspring",
      s.time >= spec.limit ? "RESET" : "STEP",
    );
    hint = "One inherited combination at a time";
  } else if (s.kind === "pollination") {
    actions = button(
      s.time >= spec.limit ? "Begin again" : "Next day",
      s.time >= spec.limit ? "RESET" : "STEP",
    );
    hint = "Follow the pollen between flowers";
  } else if (s.kind === "cell") {
    actions = button(
      s.time >= spec.limit ? "Watch division again" : "Next stage",
      s.time >= spec.limit ? "RESET" : "STEP",
    );
  } else if (s.kind === "volcano") {
    actions = button(
      s.time >= spec.limit ? "Explore again" : "See what happens next",
      s.time >= spec.limit ? "RESET" : "STEP",
    );
  } else {
    actions =
      s.time >= spec.limit
        ? button("Start again", "RESET")
        : button(
            s.playing
              ? "Pause movement"
              : motion
                ? "Move the plates"
                : "Advance movement",
            s.playing ? "PAUSE" : motion ? "PLAY" : "STEP",
          );
  }
  return (
    <div className={`science-panel science-actions science-${s.kind}-actions`}>
      {hint && <p className="science-action-hint">{hint}</p>}
      <div className="science-action-line">{actions}</div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export function ScienceObservations(props: Props) {
  const { state: s, run, error } = useScience(props);
  const id = useId();
  if (!s) return <p>Connect a science model to see its explanation.</p>;
  const obs = scienceObservation(s);
  if (props.node.configuration.panel === "comparison")
    return (
      <div className="science-panel">
        <ScienceComparison state={s} />
      </div>
    );
  if (props.node.configuration.panel === "inspection") {
    const selected = obs.objects[Math.min(s.selected, obs.objects.length - 1)];
    const connected = props.runtime.document.connections.some(
      (c) =>
        c.kind === "command" &&
        c.from.node === props.node.id &&
        c.from.port === "SELECT",
    );
    return (
      <section className="science-panel science-inspection" aria-live="polite">
        <label className="science-choice" htmlFor={id}>
          Inspect an object
          <select
            aria-label="Inspect an object"
            id={id}
            value={s.selected}
            disabled={!connected}
            onChange={(e) => run("SELECT", Number(e.target.value))}
          >
            {obs.objects.map((object, i) => (
              <option key={object.name} value={i}>
                {object.name}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <>
            <h2>{selected.name}</h2>
            <p>{selected.state}</p>
            <p>{selected.why}</p>
          </>
        )}
        {!connected && (
          <p>
            Connect SELECT to the model’s selection command to choose an object.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
      </section>
    );
  }
  if (s.kind === "earth") {
    const object = obs.objects[Math.min(s.selected, obs.objects.length - 1)];
    const description = s.settings.classification
      ? [
          "Earth’s rigid shell includes the crust and the very top of the mantle.",
          "Mostly solid rock that can deform slowly over geological time.",
          "Hot, predominantly solid rock beneath the asthenosphere.",
          "A liquid layer of metal surrounding the inner core.",
          "Solid metal at Earth’s center. Great pressure keeps it solid.",
        ]
      : [
          "The thin, solid outer layer where we live.",
          "Hot, mostly solid rock. It deforms and moves very slowly.",
          "A liquid layer of metal surrounding the inner core.",
          "Solid metal at Earth’s center. Great pressure keeps it solid.",
        ];
    return (
      <div className="science-panel science-layer-note" aria-live="polite">
        <span className="science-eyebrow">Inside Earth</span>
        <h2>{object.name}</h2>
        <span className="science-material">{object.state.split(" · ")[0]}</span>
        <p>{description[s.selected] ?? object.why}</p>
        <p className="science-subtle">Select another layer in the cutaway.</p>
      </div>
    );
  }
  return (
    <div
      className={`science-panel science-story science-${s.kind}-story`}
      aria-live="polite"
    >
      {s.kind === "cell" && (
        <div
          className="science-stage-progress"
          role="img"
          aria-label={`${obs.stage}, stage ${s.time + 1} of 8`}
        >
          {cellStages.map((stage, i) => (
            <span
              key={stage}
              data-current={i === s.time}
              data-complete={i < s.time}
            />
          ))}
        </div>
      )}
      <p className="science-explanation">{learnerCaption(s)}</p>
    </div>
  );
}
