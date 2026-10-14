"use client";
import { useContext, useId, useRef, useState } from "react";
import {
  activities,
  cycleCommand,
  primaryLabel,
} from "../../../../domains/biogeochemistry";
import type { DocumentRuntime } from "../../../../creation-and-editing/runtime-engine/DocumentRuntime";
import type { ComponentInstance } from "../../../../creation-and-editing/authoring-engine/document";
import type { CycleState } from "../../systems/biogeochemistry/contracts";
import { SnapshotContext } from "../../../../creation-and-editing/simulation/recipe/contexts";
import "./cycles.css";
interface Props {
  node: ComponentInstance;
  runtime: DocumentRuntime;
}
function useCycle({ node, runtime }: Props) {
  const snapshot = useContext(SnapshotContext);
  const [error, setError] = useState("");
  const link = runtime.document.connections.find(
    (c) => c.kind === "value" && c.to.node === node.id && c.to.port === "value",
  );
  const state = link
    ? (snapshot.outputs[link.from.node]?.[
        link.from.port
      ] as unknown as CycleState)
    : undefined;
  const send = (action: string, value?: unknown) => {
    const port = state ? cycleCommand(state.kind, action) : "";
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
          accepted: false,
          error: "This action needs a connected cycle model.",
        };
    setError(result.accepted ? "" : result.error);
    return result;
  };
  return { state, error, send, modelId: link?.from.node };
}
const nitrogenCarrier: Record<string, string> = {
  atmosphere: "nitrogen gas",
  nodules: "microbial partners in root nodules",
  plants: "plant material",
  animals: "animal material",
  dead: "dead organic matter",
  ammonium: "ammonium in soil",
  nitrite: "nitrite in soil",
  nitrate: "nitrate in soil",
};
const carbonCarrier: Record<string, string> = {
  atmosphere: "carbon dioxide in air",
  plants: "plant material",
  animals: "animal material",
  dead: "dead matter",
  soil: "soil organic carbon",
  surface: "ocean inorganic carbon",
};
export function cycleCaption(s: CycleState): string {
  if (s.kind === "oxygen") {
    if (s.activity === "atoms")
      return s.trace === "dissolved"
        ? "Water splitting moved the marked oxygen atom into O₂. It is not newly created."
        : s.history.length > 1
          ? "Respiration moved oxygen into another chemical form. Using O₂ does not destroy oxygen atoms."
          : "Follow an oxygen atom from water into O₂ and back into another chemical form.";
    if (s.activity === "temperature")
      return s.time
        ? "Warmer water approaches a lower oxygen equilibrium. Oxygen moves between water and air; it does not disappear."
        : "Compare physical exchange at 15 °C and 25 °C. Biological rates are held inactive here.";
    if (s.activity === "mixing")
      return s.time
        ? "Mixing speeds exchange toward equilibrium. It can carry oxygen into or out of water."
        : "Both waters start with the same oxygen. Compare how quickly they exchange it with the air.";
    if (s.activity === "leaves")
      return s.injected
        ? "Microbes use oxygen as they break down the added material. Remaining material keeps its oxygen demand."
        : "Add one parcel of dead leaves and follow the microbes' oxygen demand.";
    if (s.activity === "plants")
      return "More plants can produce more oxygen in daylight and consume more at night. The balance matters.";
    if (s.activity === "light")
      return s.time
        ? "Respiration continues in both ponds. Only the lit pond can add oxygen through photosynthesis."
        : "Both ponds start alike. Advance an equal interval with daylight in one and darkness in the other.";
    return s.time
      ? `${Math.floor(s.time / 12) % 2 ? "In this dark interval, production stopped while respiration continued." : "In daylight, plants produced oxygen while respiration continued."} ${s.event}.`
      : "Plants produce oxygen in daylight. Plants, animals and microbes also use it.";
  }
  if (s.kind === "nitrogen") {
    const source = s.history.at(-2);
    const followed =
      source && s.fluxes.find((f) => source in f.from && s.trace in f.to);

    if (s.activity === "route")
      return s.time
        ? `The marker is in ${nitrogenCarrier[s.trace] ?? s.trace}. ${followed ? `${followed.process} moved existing nitrogen here.` : "It remains here until an available route transfers it."}`
        : "Microbial partners transform nitrogen gas before the legume incorporates it. Roots also take up soil nitrogen.";
    if (s.activity === "partners")
      return "The same legume gains an extra nitrogen route with compatible microbes. Neither plant takes nitrogen gas directly through its roots.";
    if (s.activity === "soil")
      return "Aerated soil supports nitrification through nitrite. Low-oxygen soil favors the nitrate-to-atmosphere route called denitrification.";
    if (s.activity === "rain")
      return s.injected
        ? "Some nitrate moved below the roots; some left in surface runoff. These are different routes and destinations."
        : "Apply one equal rain pulse. The selected nitrogen input changes how much nitrate is available to move.";
    return s.stores.plants > 13
      ? "Nitrogen remains in soil, but the fixed light and space limit further growth. More nitrogen cannot remove that limit."
      : s.injected
        ? "The input added available nitrogen; plant uptake and growth take time. The untreated plot remains alongside it."
        : "Add a bounded nitrogen input and compare growth with an untreated plot.";
  }
  if (s.activity === "route")
    return s.time
      ? `The marker is in ${carbonCarrier[s.trace] ?? s.trace}. Carbon can remain in a store or take another available route.`
      : "Photosynthesis brings carbon into plant material. Follow a possible route; carbon need not visit every store.";
  if (s.activity === "clearing")
    return s.injected
      ? s.time
        ? "Regrowing vegetation gradually takes carbon from the air. Earlier releases and harvested material remain accounted for."
        : "Clearing moved carbon into litter and harvested wood, plus air if burning was selected. It did not erase carbon."
      : "Clear the selected patch and see where its carbon goes. The intact forest is the reference.";
  if (s.activity === "fuel")
    return s.time
      ? s.stores.fossil
        ? "Burning transferred carbon from a long-term store to the air. Geological formation does not run on this short horizon."
        : "The fossil store is empty. No more carbon can be released from it."
      : "Burn one finite parcel of fossil carbon and follow the transfer into atmospheric CO₂.";
  if (s.activity === "geology")
    return s.trace === "fossil"
      ? "The marked carbon reached the fossil store and remains there on this timeline. Formation takes long periods, unlike burning."
      : s.trace === "buried"
        ? "The marked carbon entered buried organic matter. Long-term formation can transfer some into fossil stores."
        : "Follow organic carbon into burial and long-term stores. Carbonate rock is a separate route; this timeline is schematic.";
  return "A store's amount differs from its transfer rate. Surface inorganic carbon includes CO₂, bicarbonate and carbonate; deep mixing is limited.";
}
export function CycleCaption(props: Props) {
  const { state } = useCycle(props);
  return (
    <p className="cycle-caption" aria-live="polite">
      {state
        ? cycleCaption(state)
        : "Connect a cycle model to show its explanation."}
    </p>
  );
}
export function CycleAction(props: Props) {
  const { state, send, error } = useCycle(props);
  if (!state) return <p>Connect a cycle model to begin.</p>;
  const completed =
    state.time >= (state.kind === "oxygen" ? 240 : 60) ||
    (state.kind === "carbon" &&
      state.activity === "fuel" &&
      state.stores.fossil === 0);
  return (
    <div className="cycle-actions">
      <button
        type="button"
        className="cycle-primary"
        onClick={() => send(completed ? "RESTART" : "ADVANCE")}
      >
        {primaryLabel(state)}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export function CycleActivity(props: Props) {
  const { state, send, error, modelId } = useCycle(props);
  const dialog = useRef<HTMLDialogElement>(null);
  const started = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const [choice, setChoice] = useState("");
  const [variant, setVariant] = useState(0);
  const id = useId();
  if (!state) return <p>Connect a cycle model to explore an activity.</p>;
  const list = activities[state.kind];
  const chosen = list.find((a) => a.id === choice) ?? list[0];
  const start = () => {
    if (send("ACTIVITY", { activity: chosen.id, variant }).accepted) {
      started.current = true;
      dialog.current?.close();
    }
  };
  return (
    <div className="cycle-activity">
      <button
        ref={trigger}
        type="button"
        className="cycle-secondary"
        aria-haspopup="dialog"
        onClick={() => {
          started.current = false;
          setChoice(state.activity);
          setVariant(state.variant);
          dialog.current?.showModal();
        }}
      >
        {state.kind === "oxygen"
          ? "Try another pond question"
          : state.kind === "nitrogen"
            ? "Try another soil question"
            : "Explore another carbon route"}
      </button>
      <dialog
        ref={dialog}
        className="cycle-dialog"
        aria-labelledby={`${id}-title`}
        onClose={() => {
          const viewport =
            trigger.current?.closest<HTMLElement>(".board-viewport");
          if (
            started.current &&
            viewport &&
            modelId &&
            getComputedStyle(viewport).overflowY === "auto"
          ) {
            viewport.scrollTo({ top: 0, left: 0 });
            viewport
              .querySelector<HTMLElement>(
                `[data-cycle-model="${CSS.escape(modelId)}"] .cycle-question`,
              )
              ?.focus({ preventScroll: true });
          } else trigger.current?.focus({ preventScroll: true });
        }}
      >
        <h2 id={`${id}-title`}>Choose one investigation</h2>
        <label>
          Question
          <select
            aria-label="Question"
            value={chosen.id}
            onChange={(e) => {
              setChoice(e.target.value);
              setVariant(0);
            }}
          >
            {list.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </label>
        <p>{chosen.question}</p>
        {chosen.variants && (
          <label>
            Scenario
            <select
              aria-label="Scenario"
              value={variant}
              onChange={(e) => setVariant(Number(e.target.value))}
            >
              {chosen.variants.map((v, i) => (
                <option key={v} value={i}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="cycle-dialog-actions">
          <button type="button" className="cycle-primary" onClick={start}>
            Start investigation
          </button>
          <button
            type="button"
            className="cycle-secondary"
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
      </dialog>
      {state.kind === "carbon" &&
        state.activity === "geology" &&
        state.biological && (
          <button
            type="button"
            className="cycle-secondary"
            onClick={() =>
              send("ACTIVITY", {
                activity: state.biological?.activity,
                variant: state.biological?.variant,
              })
            }
          >
            Return to biological time
          </button>
        )}
    </div>
  );
}
